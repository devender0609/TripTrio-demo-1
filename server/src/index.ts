// server/src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

import {
  searchFlights, // fallback (Amadeus)
  searchHotels,
  searchLocations,
} from "./providers/amadeus";
import {
  duffelSearchOffers,
  duffelGetOffer,
  duffelCreateOrder,
  duffelGetOrder,
} from "./providers/duffel";

/* ======================= Env flags ======================= */
const USE_DUFFEL = process.env.USE_DUFFEL === "1";
const DUFFEL_KEY =
  process.env.DUFFEL_KEY ||
  process.env.DUFFEL_API_KEY || // support either name
  "";
const DUFFEL_VERSION = process.env.DUFFEL_VERSION || "v2";
const DUFFEL_READY = USE_DUFFEL && /^duffel_/.test(DUFFEL_KEY);

// Where the web client lives (for internal /book links)
const CLIENT_BASE =
  process.env.CLIENT_BASE_URL ||
  process.env.PUBLIC_WEB_BASE || // support either name
  "http://localhost:3000";

/* ======================= Supabase (optional) ======================= */
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

const supaAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

async function getUserFromAuthHeader(authHeader?: string) {
  if (!supaAdmin) return null;
  if (!authHeader) return null;
  const low = authHeader.toLowerCase();
  if (!low.startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  try {
    const { data, error } = await supaAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/* ============================ Helpers ============================= */
function addDays(iso: string, n: number) {
  const d = new Date(iso);
  if (isNaN(+d)) return null;
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function resolveHotelCityCode(input: string) {
  const s = String(input || "").trim().toUpperCase();
  if (!s) return "";
  if (/^[A-Z]{3,4}$/.test(s)) return s;
  try {
    const items = await searchLocations(s);
    const city =
      items.find((x: any) => (x.type === "CITY" || x.category === "CITY") && x.cityCode) ||
      items.find((x: any) => x.cityCode);
    return city?.cityCode || "";
  } catch {
    return "";
  }
}

async function resolvePrettyCityName(input: string) {
  const s = String(input || "").trim();
  if (!s) return s;
  try {
    const items = await searchLocations(s);
    const city =
      items.find((x: any) => (x.type === "CITY" || x.category === "CITY") && x.name) ||
      items.find((x: any) => x.name);
    return city?.name || s;
  } catch {
    return s;
  }
}

const AIRLINE_SITE: Record<string, string> = {
  UA: "https://www.united.com/",
  AA: "https://www.aa.com/",
  DL: "https://www.delta.com/",
  BA: "https://www.ba.com/",
  AC: "https://www.aircanada.com/",
  AS: "https://www.alaskaair.com/",
  B6: "https://www.jetblue.com/",
  LH: "https://www.lufthansa.com/",
  AF: "https://www.airfrance.com/",
  IB: "https://www.iberia.com/",
};

/* ========================== Express app =========================== */
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    amadeus: Boolean(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET),
    supabase: Boolean(supaAdmin),
    duffelConfigured: USE_DUFFEL,
    duffelReady: DUFFEL_READY,
    duffelVersion: DUFFEL_VERSION,
    clientBase: CLIENT_BASE,
  });
});

/* ========================== Locations API ========================= */
app.get("/locations", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ items: [] });
  try {
    const items = await searchLocations(q);
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Locations failed" });
  }
});

/* ========================= FX passthrough ========================= */
app.post("/fx/convert", async (req, res) => {
  try {
    const amount = Number(req.body?.amount ?? 0);
    if (!isFinite(amount)) return res.status(400).json({ error: "Invalid amount" });
    const from = String(req.body?.from || "USD").toUpperCase();
    const to = String(req.body?.to || "USD").toUpperCase();
    const r = await fetch(`https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=${amount}`);
    if (!r.ok) return res.status(502).json({ error: "FX upstream failed" });
    const j: any = await r.json();
    const converted = typeof j.result === "number" ? j.result : amount;
    const rate = typeof j.info?.rate === "number" ? j.info.rate : amount ? converted / amount : 1;
    res.json({ amount, from, to, rate, converted });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "FX error" });
  }
});

/* =========================== Search API =========================== */
app.post("/search", async (req, res) => {
  try {
    const body = req.body || {};
    const origin = String(body.origin || "").toUpperCase();
    const destination = String(body.destination || "").toUpperCase();
    const departDate = String(body.departDate || "");
    const returnDate = body.returnDate ? String(body.returnDate) : undefined;
    const roundTrip = Boolean(body.roundTrip);
    const passengers = Number(body.passengers ?? 1);
    const cabin = String(body.cabin || "ECONOMY").toUpperCase() as any;

    const includeHotel = Boolean(body.includeHotel);
    const nights = Number(body.nights ?? 1);
    const minHotelStarRaw = Number(body.minHotelStar || 0);
    const minHotelStar = [3, 4, 5].includes(minHotelStarRaw) ? (minHotelStarRaw as 3 | 4 | 5) : 0;

    const currency = String(body.currency || "USD").toUpperCase();
    const sort = String(body.sort || "best") as "best" | "cheapest" | "fastest" | "flexible";
    const maxStops = body.maxStops !== undefined ? Number(body.maxStops) : undefined;

    const hotelCheckInRaw = String(body.hotelCheckIn || "");
    const hotelCheckOutRaw = String(body.hotelCheckOut || "");
    const hotelPlaceId = String(body.hotelPlaceId || body.destinationPlaceId || destination || "");

    if (!origin || !destination || !departDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (roundTrip && !returnDate) {
      return res.status(400).json({ error: "Return date is required for round-trip searches" });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (departDate < today) {
      return res.status(400).json({ error: "Departure date cannot be in the past" });
    }

    /* ----------------------------- Flights ----------------------------- */
    const flights = DUFFEL_READY
      ? await duffelSearchOffers({
          origin,
          destination,
          departDate,
          returnDate,
          passengers,
          cabin: cabin.toLowerCase() as any,
        })
      : await searchFlights({
          origin,
          destination,
          departDate,
          returnDate,
          passengers,
          cabin,
          maxStops,
          currency,
        });

    /* ------------------------------ Hotels ----------------------------- */
    let hotelWarning: string | null = null;
    let hotelGroups: Record<"3" | "4" | "5", any[]> | null = null;
    let hotelSelectedStar: 3 | 4 | 5 | undefined = undefined;

    if (includeHotel) {
      const checkIn = hotelCheckInRaw || departDate || "";
      let checkOut = hotelCheckOutRaw || (roundTrip && returnDate ? returnDate : "");
      if (!checkOut && checkIn && Number.isFinite(nights) && nights > 0) {
        const derived = addDays(checkIn, nights);
        if (derived) checkOut = derived;
      }
      if (!checkIn || !checkOut) {
        return res.status(400).json({ error: "Missing hotel dates (check-in/check-out)" });
      }

      try {
        const cityCode = (await resolveHotelCityCode(hotelPlaceId)) || "";
        if (!cityCode) throw new Error("Could not resolve hotel city");

        const hotels = await searchHotels({
          cityCode,
          checkIn,
          checkOut,
          nights,
          currency,
        });

        const buckets: Record<"3" | "4" | "5", any[]> = { "3": [], "4": [], "5": [] };
        for (const h of hotels) {
          const s = Math.max(3, Math.min(5, Math.round(Number(h.star || 0) || 0))) as 3 | 4 | 5;
          if (!s || s < 3) continue;
          if (buckets[String(s) as "3" | "4" | "5"].length < 3) {
            buckets[String(s) as "3" | "4" | "5"].push(h);
          }
        }

        async function curatedBand(star: 3 | 4 | 5) {
          const prettyCity = await resolvePrettyCityName(destination);
          const label = (n: number) =>
            star === 5 ? ["Luxury", "Grand", "Signature"][n] :
            star === 4 ? ["Central", "Boutique", "Harbor"][n] :
                         ["Downtown", "Riverside", "Airport"][n];

          const make = (idx: number) => {
            const bStar =
              star >= 5 ? "nflt=class%3D5" :
              star >= 4 ? "nflt=class%3D4%3Bclass%3D5" :
                          "nflt=class%3D3%3Bclass%3D4%3Bclass%3D5";

            const hStar =
              star >= 5 ? "star=50-50" :
              star >= 4 ? "star=40-50" :
                          "star=30-50";

            const name = `${label(idx)} ${prettyCity} • ${star}★`;
            const cityQ = encodeURIComponent(prettyCity);

            return {
              name,
              star,
              city: prettyCity,
              isReal: false,
              deeplinks: {
                booking: `https://www.booking.com/searchresults.html?ss=${cityQ}&checkin=${checkIn}&checkout=${checkOut}&${bStar}`,
                hotels: `https://www.hotels.com/Hotel-Search?destination=${cityQ}&startDate=${checkIn}&endDate=${checkOut}&${hStar}`,
                expedia: `https://www.expedia.com/Hotel-Search?destination=${cityQ}&startDate=${checkIn}&endDate=${checkOut}`,
                agoda: `https://www.agoda.com/search?checkIn=${checkIn}&checkOut=${checkOut}&text=${cityQ}`,
              },
            };
          };
          return [make(0), make(1), make(2)];
        }

        if (minHotelStar) {
          hotelGroups = { "3": [], "4": [], "5": [] };
          if (buckets[String(minHotelStar) as "3" | "4" | "5"].length === 0) {
            hotelWarning = "No live offers for that star. Showing curated choices with booking links.";
            hotelGroups[String(minHotelStar) as "3" | "4" | "5"] = await curatedBand(minHotelStar);
          } else {
            hotelGroups[String(minHotelStar) as "3" | "4" | "5"] = buckets[String(minHotelStar) as "3" | "4" | "5"];
          }
          hotelSelectedStar = minHotelStar;
        } else {
          for (const b of ["3", "4", "5"] as const) {
            if (buckets[b].length === 0) {
              const star = Number(b) as 3 | 4 | 5;
              buckets[b] = await curatedBand(star);
              hotelWarning = "Some stars had no live offers. Filled with curated choices.";
            }
          }
          hotelGroups = buckets;
        }
      } catch (_e: any) {
        const prettyCity = await resolvePrettyCityName(destination);
        const mk = async (star: 3 | 4 | 5) => {
          const bStar =
            star >= 5 ? "nflt=class%3D5" :
            star >= 4 ? "nflt=class%3D4%3Bclass%3D5" :
                        "nflt=class%3D3%3Bclass%3D4%3Bclass%3D5";
          const hStar =
            star >= 5 ? "star=50-50" :
            star >= 4 ? "star=40-50" :
                        "star=30-50";
          const cityQ = encodeURIComponent(prettyCity);
          const names = star === 5
            ? [`Luxury ${prettyCity} • 5★`, `Grand ${prettyCity} • 5★`, `Signature ${prettyCity} • 5★`]
            : star === 4
            ? [`Central ${prettyCity} • 4★`, `Boutique ${prettyCity} • 4★`, `Harbor ${prettyCity} • 4★`]
            : [`Downtown ${prettyCity} • 3★`, `Riverside ${prettyCity} • 3★`, `Airport ${prettyCity} • 3★`];
          return names.map((name) => ({
            name,
            star,
            city: prettyCity,
            isReal: false,
            deeplinks: {
              booking: `https://www.booking.com/searchresults.html?ss=${cityQ}&checkin=${checkIn}&checkout=${checkOut}&${bStar}`,
              hotels: `https://www.hotels.com/Hotel-Search?destination=${cityQ}&startDate=${checkIn}&endDate=${checkOut}&${hStar}`,
              expedia: `https://www.expedia.com/Hotel-Search?destination=${cityQ}&startDate=${checkIn}&endDate=${checkOut}`,
              agoda: `https://www.agoda.com/search?checkIn=${checkIn}&checkOut=${checkOut}&text=${cityQ}`,
            },
          }));
        };

        hotelWarning = "Hotel offers are temporarily unavailable. Showing curated choices by star with booking links.";
        hotelGroups = { "3": [], "4": [], "5": [] };
        if (minHotelStar) {
          hotelGroups[String(minHotelStar) as "3" | "4" | "5"] = await mk(minHotelStar);
          hotelSelectedStar = minHotelStar;
        } else {
          hotelGroups["3"] = await mk(3);
          hotelGroups["4"] = await mk(4);
          hotelGroups["5"] = await mk(5);
        }
      }
    }

    function pickBestSingleHotel() {
      if (!hotelGroups) return null;
      const order: Array<"5" | "4" | "3"> = hotelSelectedStar
        ? [String(hotelSelectedStar) as "5" | "4" | "3"]
        : ["5", "4", "3"];
      for (const k of order) {
        const arr = hotelGroups[k];
        const real = (arr || []).find((x: any) => x?.isReal);
        if (real) return real;
      }
      return null;
    }

    const bestHotel = pickBestSingleHotel();

    /* -------------------------- Build packages ------------------------- */
    const packages = flights.map((f: any) => {
      const flightUSD = typeof f.price_usd === "number" ? f.price_usd : 0;

      const h = bestHotel;
      const hotelUSD =
        h && typeof h?.total_usd === "number"
          ? h.total_usd
          : h && typeof h?.price_usd === "number"
          ? h.price_usd
          : 0;

      const totalUSD = flightUSD + (hotelUSD || 0);

      const googleFlights =
        `https://www.google.com/travel/flights?q=Flights%20from%20${encodeURIComponent(
          origin
        )}%20to%20${encodeURIComponent(destination)}%20on%20${encodeURIComponent(
          departDate
        )}` + (roundTrip && returnDate ? `%20return%20${encodeURIComponent(returnDate)}` : "");

      const skyscanner =
        `https://www.skyscanner.com/transport/flights/${encodeURIComponent(
          origin.toLowerCase()
        )}/${encodeURIComponent(destination.toLowerCase())}/${departDate.replace(/-/g, "")}` +
        (roundTrip && returnDate ? `/${returnDate.replace(/-/g, "")}` : "/");

      const airlineSite = f.carrier && AIRLINE_SITE[f.carrier] ? AIRLINE_SITE[f.carrier] : null;

      // Internal TripTrio booking link (now includes pax & cabin)
      const triptrio =
        `${CLIENT_BASE}/book?` +
        `flightId=${encodeURIComponent(f.id || "")}` +
        `&carrier=${encodeURIComponent(f.carrier || "")}` +
        `&origin=${encodeURIComponent(origin)}` +
        `&destination=${encodeURIComponent(destination)}` +
        `&depart=${encodeURIComponent(departDate)}` +
        (roundTrip && returnDate ? `&return=${encodeURIComponent(returnDate)}` : "") +
        (h?.name ? `&hotel=${encodeURIComponent(h.name)}` : "") +
        `&currency=${encodeURIComponent(currency)}` +
        `&total=${encodeURIComponent(String(totalUSD))}` +
        `&pax=${encodeURIComponent(String(passengers))}` + // NEW
        `&cabin=${encodeURIComponent(String(cabin))}`;     // NEW

      return {
        id: f.id,
        origin,
        destination,
        departDate,
        returnDate: returnDate || null,
        currency,
        total_cost: totalUSD,
        flight: {
          ...f,
          bookingLinks: { airlineSite, googleFlights, skyscanner, triptrio },
        },
        hotel: h || null,
        hotelGroups: includeHotel ? hotelGroups : null,
        hotelSelectedStar: includeHotel ? (hotelSelectedStar as 3 | 4 | 5 | undefined) : undefined,
        nights: nights > 0 ? nights : roundTrip && returnDate ? 1 : 0,
      };
    });

    /* ---------------------------- Budget + Sort ---------------------------- */
    const toVal = (p: any) =>
      typeof p.total_cost_converted === "number" ? p.total_cost_converted : p.total_cost;

    let filtered = packages.slice();
    const minB = body.minBudget !== undefined && body.minBudget !== "" ? Number(body.minBudget) : NaN;
    const maxB = body.maxBudget !== undefined && body.maxBudget !== "" ? Number(body.maxBudget) : NaN;
    if (isFinite(minB)) filtered = filtered.filter((p) => toVal(p) >= minB);
    if (isFinite(maxB)) filtered = filtered.filter((p) => toVal(p) <= maxB);

    const toNum = (x: any) => (typeof x === "number" && isFinite(x) ? x : Number.MAX_SAFE_INTEGER);
    filtered.sort((a: any, b: any) => {
      const aV = toVal(a), bV = toVal(b);
      const ad = toNum(a.flight?.duration_minutes), bd = toNum(b.flight?.duration_minutes);
      const ar = a.flight?.refundable ? 1 : 0, br = b.flight?.refundable ? 1 : 0;
      switch (sort) {
        case "cheapest": return toNum(aV) - toNum(bV) || ad - bd;
        case "fastest":  return ad - bd || toNum(aV) - toNum(bV);
        case "flexible": return br - ar || toNum(aV) - toNum(bV);
        default:         return (toNum(aV) + ad / 2) - (toNum(bV) + bd / 2);
      }
    });

    res.json({ results: filtered, hotelWarning });
  } catch (err: any) {
    console.error("Search error:", err?.response?.data || err);
    res.status(500).json({ error: err?.message || "Search failed" });
  }
});

/* ======================== Duffel checkout API ===================== */
app.post("/duffel/offer", async (req, res) => {
  if (!DUFFEL_READY) return res.status(503).json({ error: "Duffel is not enabled (set USE_DUFFEL=1 and DUFFEL_KEY)" });
  try {
    const offerId = String(req.body?.offerId || req.body?.offer_id || "");
    if (!offerId) return res.status(400).json({ error: "Missing offerId" });
    const offer = await duffelGetOffer(offerId);
    res.json(offer);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Duffel offer fetch failed" });
  }
});

app.post("/duffel/order", async (req, res) => {
  if (!DUFFEL_READY) return res.status(503).json({ error: "Duffel is not enabled (set USE_DUFFEL=1 and DUFFEL_KEY)" });
  try {
    const offer_id = String(req.body?.offer_id || req.body?.offerId || "");
    const contact = req.body?.contact;
    const passengers = req.body?.passengers;
    if (!offer_id) return res.status(400).json({ error: "Missing offer_id" });
    if (!contact?.email || !contact?.phone_number) {
      return res.status(400).json({ error: "Missing contact.email or contact.phone_number" });
    }
    if (!Array.isArray(passengers) || passengers.length < 1) {
      return res.status(400).json({ error: "At least one passenger is required" });
    }
    const order = await duffelCreateOrder({ offer_id, contact, passengers });
    res.json(order);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Duffel order failed" });
  }
});

app.get("/duffel/order/:id", async (req, res) => {
  if (!DUFFEL_READY) return res.status(503).json({ error: "Duffel is not enabled (set USE_DUFFEL=1 and DUFFEL_KEY)" });
  try {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ error: "Missing id" });
    const order = await duffelGetOrder(id);
    res.json(order);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Duffel get order failed" });
  }
});

/* ===================== Favorites (Supabase) ====================== */
app.use("/favorites", async (req: any, res, next) => {
  if (!supaAdmin) return res.status(503).json({ error: "Supabase not configured" });
  const user = await getUserFromAuthHeader(req.headers.authorization as string | undefined);
  req.user = user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  next();
});

app.get("/favorites", async (req: any, res) => {
  const user = req.user;
  const { data, error } = await supaAdmin!
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ items: data || [] });
});

app.post("/favorites", async (req: any, res) => {
  const user = req.user;
  const payload = req.body?.payload ?? null;
  if (!payload) return res.status(400).json({ error: "Missing payload" });

  const { data, error } = await supaAdmin!
    .from("favorites")
    .insert([{ user_id: user.id, payload }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ item: data });
});

app.delete("/favorites/:id", async (req: any, res) => {
  const user = req.user;
  const id = String(req.params.id || "");
  const { error } = await supaAdmin!
    .from("favorites")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

/* ============================= Boot ============================= */
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
