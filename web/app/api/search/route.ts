// web/app/api/search/route.ts
import { NextResponse } from "next/server";
import { searchFlights, searchHotels, searchLocations } from "@/lib/providers/amadeus";
import { duffelSearchOffers } from "@/lib/providers/duffel";

/** Helpers */
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

const USE_DUFFEL = process.env.USE_DUFFEL === "1";
const CLIENT_BASE =
  process.env.CLIENT_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_BASE ||
  "http://localhost:3000";

/** POST /api/search */
export async function POST(req: Request) {
  try {
    const body = await req.json();
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
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (roundTrip && !returnDate) {
      return NextResponse.json({ error: "Return date is required for round-trip searches" }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (departDate < today) {
      return NextResponse.json({ error: "Departure date cannot be in the past" }, { status: 400 });
    }

    /** -------- Flights -------- */
    const flights = USE_DUFFEL
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

    /** -------- Hotels -------- */
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
        return NextResponse.json(
          { error: "Missing hotel dates (check-in/check-out)" },
          { status: 400 }
        );
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
              booking: `https://www.booking.com/searchresults.html?ss=${cityQ}&checkin=${hotelCheckInRaw || departDate}&checkout=${hotelCheckOutRaw || returnDate || departDate}${bStar ? `&${bStar}` : ""}`,
              hotels: `https://www.hotels.com/Hotel-Search?destination=${cityQ}&startDate=${hotelCheckInRaw || departDate}&endDate=${hotelCheckOutRaw || returnDate || departDate}${hStar ? `&${hStar}` : ""}`,
              expedia: `https://www.expedia.com/Hotel-Search?destination=${cityQ}&startDate=${hotelCheckInRaw || departDate}&endDate=${hotelCheckOutRaw || returnDate || departDate}`,
              agoda: `https://www.agoda.com/search?checkIn=${hotelCheckInRaw || departDate}&checkOut=${hotelCheckOutRaw || returnDate || departDate}&text=${cityQ}`,
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

    const bestHotel = (() => {
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
    })();

    /** Build packages */
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
        `&pax=${encodeURIComponent(String(passengers))}` +
        `&cabin=${encodeURIComponent(String(cabin))}`;

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

    /** Budget filter + sort => filtered */
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

    return NextResponse.json({ results: filtered, hotelWarning });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Search failed" }, { status: 500 });
  }
}
