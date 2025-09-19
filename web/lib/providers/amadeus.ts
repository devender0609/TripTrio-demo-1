// ✅ No node-fetch import needed on Vercel/Next.js

/* ========================= Amadeus Auth ========================== */
const KEY = process.env.AMADEUS_API_KEY || "";
const SECRET = process.env.AMADEUS_API_SECRET || "";

let token: string | null = null;
let tokenExp = 0;

function ensureAmadeusEnv() {
  if (!KEY || !SECRET) {
    throw new Error(
      "Missing Amadeus credentials. Set AMADEUS_API_KEY and AMADEUS_API_SECRET in your environment."
    );
  }
}

async function getToken(): Promise<string> {
  ensureAmadeusEnv();

  const now = Math.floor(Date.now() / 1000);
  if (token && now < tokenExp - 30) return token;

  const r = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: KEY,
      client_secret: SECRET,
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Amadeus auth failed (${r.status}): ${txt || r.statusText}`);
  }
  const j: any = await r.json();
  token = j.access_token;
  tokenExp = now + (Number(j.expires_in) || 1800);
  return token!;
}

/* ========================= Locations (CITY/AIRPORT) ========================= */
export async function searchLocations(query: string) {
  const tk = await getToken();
  const r = await fetch(
    `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${tk}` }, cache: "no-store" }
  );
  if (!r.ok) throw new Error(`Locations lookup failed (${r.status})`);
  const j: any = await r.json();
  const items = (j.data || []).map((d: any) => ({
    type: String(d.subType || d.type || "").toUpperCase() as "CITY" | "AIRPORT",
    iataCode: d.iataCode,
    cityCode: d.address?.cityCode || d.iataCode,
    name: d.name,
    cityName: d.address?.cityName || d.name,
    countryName: d.address?.countryName || "",
  }));
  return items;
}

/* ========================= Flights (3 per bucket) ========================= */
type FlightParams = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers?: number;
  cabin?: string;
  maxStops?: number; // 0,1,2 (2+)
  currency?: string;
};

function isoTime(date: string, hh: number, mm: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function mkOutbound(
  origin: string,
  destination: string,
  departDate: string,
  stops: 0 | 1 | 2,
  lay1 = 60,
  lay2 = 70
) {
  if (stops === 0) {
    return [
      {
        from: origin,
        to: destination,
        depart_time: isoTime(departDate, 9, 10),
        arrive_time: isoTime(departDate, 12, 10),
        flight_number: "DL102",
        marketingCarrier: "DL",
        duration_minutes: 180,
      },
    ];
  }
  if (stops === 1) {
    return [
      {
        from: origin,
        to: "IAH",
        depart_time: isoTime(departDate, 7, 45),
        arrive_time: isoTime(departDate, 9, 5),
        flight_number: "UA656",
        marketingCarrier: "UA",
        duration_minutes: 80,
        layover_minutes: lay1,
      },
      {
        from: "IAH",
        to: destination,
        depart_time: isoTime(departDate, 10, 25),
        arrive_time: isoTime(departDate, 13, 55),
        flight_number: "UA759",
        marketingCarrier: "UA",
        duration_minutes: 210,
      },
    ];
  }
  return [
    {
      from: origin,
      to: "DFW",
      depart_time: isoTime(departDate, 6, 30),
      arrive_time: isoTime(departDate, 8, 10),
      flight_number: "AA1212",
      marketingCarrier: "AA",
      duration_minutes: 100,
      layover_minutes: lay1,
    },
    {
      from: "DFW",
      to: "CLT",
      depart_time: isoTime(departDate, 9, 10),
      arrive_time: isoTime(departDate, 11, 30),
      flight_number: "AA909",
      marketingCarrier: "AA",
      duration_minutes: 140,
      layover_minutes: lay2,
    },
    {
      from: "CLT",
      to: destination,
      depart_time: isoTime(departDate, 12, 40),
      arrive_time: isoTime(departDate, 15, 10),
      flight_number: "AA731",
      marketingCarrier: "AA",
      duration_minutes: 150,
    },
  ];
}

function mkReturn(origin: string, destination: string, returnDate?: string, direct = true) {
  if (!returnDate) return undefined;
  const segments = direct
    ? [
        {
          from: destination,
          to: origin,
          depart_time: isoTime(returnDate, 12, 30),
          arrive_time: isoTime(returnDate, 15, 30),
          flight_number: "DL103",
          marketingCarrier: "DL",
          duration_minutes: 180,
        },
      ]
    : [
        {
          from: destination,
          to: "JFK",
          depart_time: isoTime(returnDate, 10, 20),
          arrive_time: isoTime(returnDate, 12, 10),
          flight_number: "BA141",
          marketingCarrier: "BA",
          duration_minutes: 110,
          layover_minutes: 60,
        },
        {
          from: "JFK",
          to: origin,
          depart_time: isoTime(returnDate, 13, 10),
          arrive_time: isoTime(returnDate, 16, 10),
          flight_number: "BA142",
          marketingCarrier: "BA",
          duration_minutes: 180,
        },
      ];
  return [{ segments: [] }, { segments }];
}

export async function searchFlights(p: FlightParams) {
  const { origin, destination, departDate, returnDate, currency = "USD", maxStops } = p;

  const buckets: Array<{
    kind: "best" | "cheapest" | "fastest" | "flexible";
    carrier: string;
    carrier_name: string;
    stops: 0 | 1 | 2;
    basePrice: number;
    duration: number;
    refundable: boolean;
  }> = [
    { kind: "best", carrier: "UA", carrier_name: "United Airlines",   stops: 1, basePrice: 560, duration: 420, refundable: true },
    { kind: "best", carrier: "BA", carrier_name: "British Airways",   stops: 1, basePrice: 610, duration: 440, refundable: true },
    { kind: "best", carrier: "AC", carrier_name: "Air Canada",        stops: 1, basePrice: 590, duration: 430, refundable: true },

    { kind: "cheapest", carrier: "AA", carrier_name: "American Airlines", stops: 2, basePrice: 420, duration: 600, refundable: false },
    { kind: "cheapest", carrier: "WN", carrier_name: "Southwest Airlines", stops: 2, basePrice: 405, duration: 620, refundable: false },
    { kind: "cheapest", carrier: "B6", carrier_name: "JetBlue",          stops: 2, basePrice: 435, duration: 610, refundable: false },

    { kind: "fastest", carrier: "DL", carrier_name: "Delta Air Lines", stops: 0, basePrice: 690, duration: 180, refundable: false },
    { kind: "fastest", carrier: "AS", carrier_name: "Alaska Airlines", stops: 0, basePrice: 675, duration: 185, refundable: false },
    { kind: "fastest", carrier: "IB", carrier_name: "Iberia",          stops: 0, basePrice: 700, duration: 175, refundable: false },

    { kind: "flexible", carrier: "BA", carrier_name: "British Airways", stops: 1, basePrice: 610, duration: 440, refundable: true },
    { kind: "flexible", carrier: "LH", carrier_name: "Lufthansa",       stops: 1, basePrice: 620, duration: 450, refundable: true },
    { kind: "flexible", carrier: "AF", carrier_name: "Air France",      stops: 1, basePrice: 615, duration: 445, refundable: true },
  ];

  const flights = buckets.map((b, i) => {
    const outbound = mkOutbound(origin, destination, departDate, b.stops);
    const itineraries = mkReturn(origin, destination, returnDate, b.stops === 0);
    return {
      id: `F-${origin}-${destination}-${departDate}-${b.kind}-${i + 1}`,
      kind: b.kind,
      carrier: b.carrier,
      carrier_name: b.carrier_name,
      cabin: "ECONOMY",
      duration_minutes: b.duration,
      stops: b.stops,
      refundable: b.refundable,
      price_usd: b.basePrice,
      outbound,
      ...(itineraries ? { itineraries } : {}),
      bookingLinks: {},
      currency,
    };
  });

  const ms = typeof maxStops === "number" ? maxStops : undefined;
  return typeof ms === "number" ? flights.filter((f) => (ms === 2 ? true : f.stops <= ms)) : flights;
}

/* ========================= Hotels (v3 by city, then ids) ========================= */

type Hotel = {
  name: string;
  star?: number;
  city?: string;
  total_usd?: number;
  price_usd?: number;
  price_converted?: number;
  currency?: string;
  isReal?: boolean;
  deeplinks?: Record<string, string>;
};

const parseErrText = async (r: Response) => {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
};

function priceFromOffer(offer: any) {
  const total = offer?.price?.total ? Number(offer.price.total) : undefined;
  const currency = offer?.price?.currency;
  return { total, currency };
}

function bookingStarParam(star?: number) {
  if (!star) return "";
  if (star >= 5) return "nflt=class%3D5";
  if (star >= 4) return "nflt=class%3D4%3Bclass%3D5";
  if (star >= 3) return "nflt=class%3D3%3Bclass%3D4%3Bclass%3D5";
  return "";
}
function hotelsStarParam(star?: number) {
  if (!star) return "";
  if (star >= 5) return "star=50-50";
  if (star >= 4) return "star=40-50";
  if (star >= 3) return "star=30-50";
  return "star=10-50";
}

function mapV3Hotels(
  data: any[],
  cityCode: string,
  checkIn: string,
  checkOut: string,
  fallbackCurrency: string
): Hotel[] {
  return (data || []).map((h: any) => {
    const offer = h.offers?.[0];
    const name = h.hotel?.name || h.name || "Hotel";
       const starVal = Number(h.hotel?.rating || h.rating || 0);
    const star = Number.isFinite(starVal) && starVal > 0 ? starVal : undefined;
    const { total, currency } = priceFromOffer(offer);
    const city = h.hotel?.cityCode || cityCode;

    const cityName = city || cityCode;
    const nameQ = encodeURIComponent(name);
    const cityQ = encodeURIComponent(cityName);

    const bStar = bookingStarParam(star);
    const hStar = hotelsStarParam(star);

    return {
      name,
      star,
      city: cityName,
      total_usd: currency === "USD" && typeof total === "number" ? total : undefined,
      price_usd: currency === "USD" && typeof total === "number" ? total : undefined,
      price_converted: typeof total === "number" ? total : undefined,
      currency: currency || fallbackCurrency,
      isReal: true,
      deeplinks: {
        booking: `https://www.booking.com/searchresults.html?ss=${nameQ || cityQ}&checkin=${checkIn}&checkout=${checkOut}${bStar ? `&${bStar}` : ""}`,
        hotels: `https://www.hotels.com/Hotel-Search?destination=${cityQ}&startDate=${checkIn}&endDate=${checkOut}${hStar ? `&${hStar}` : ""}`,
        expedia: `https://www.expedia.com/Hotel-Search?destination=${cityQ}&startDate=${checkIn}&endDate=${checkOut}`,
        agoda: `https://www.agoda.com/search?checkIn=${checkIn}&checkOut=${checkOut}&text=${nameQ || cityQ}`,
      },
    };
  });
}

// Attempt #1: v3 by cityCode
async function fetchV3ByCity(cityCode: string, checkIn: string, checkOut: string, currency: string): Promise<Hotel[]> {
  const tk = await getToken();
  const u = new URL("https://test.api.amadeus.com/v3/shopping/hotel-offers");
  u.searchParams.set("cityCode", cityCode);
  u.searchParams.set("checkInDate", checkIn);
  u.searchParams.set("checkOutDate", checkOut);
  u.searchParams.set("adults", "1");
  u.searchParams.set("roomQuantity", "1");
  u.searchParams.set("bestRateOnly", "true");
  u.searchParams.set("includeClosed", "false");
  u.searchParams.set("currency", currency);

  const r = await fetch(u.toString(), { headers: { Authorization: `Bearer ${tk}` }, cache: "no-store" });
  if (!r.ok) {
    const err = await parseErrText(r);
    const e = new Error(typeof err === "string" ? err : JSON.stringify(err));
    (e as any).status = r.status;
    throw e;
  }
  const j: any = await r.json();
  return mapV3Hotels(j.data || [], cityCode, checkIn, checkOut, currency);
}

// v1: list hotel IDs by city
async function hotelIdsByCity(cityCode: string): Promise<{ id: string; name?: string }[]> {
  const tk = await getToken();
  const u = new URL("https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city");
  u.searchParams.set("cityCode", cityCode);
  const r = await fetch(u.toString(), { headers: { Authorization: `Bearer ${tk}` }, cache: "no-store" });
  if (!r.ok) {
    const err = await parseErrText(r);
    const e = new Error(typeof err === "string" ? err : JSON.stringify(err));
    (e as any).status = r.status;
    throw e;
  }
  const j: any = await r.json();
  return (j.data || []).map((d: any) => ({ id: d.hotelId, name: d.name })).filter((x: any) => x.id);
}

// Attempt #2: v3 by hotelIds
async function fetchV3ByIds(
  hotelIds: string[],
  checkIn: string,
  checkOut: string,
  currency: string,
  cityCode: string
): Promise<Hotel[]> {
  const tk = await getToken();
  const CHUNK = 20;
  const out: Hotel[] = [];
  for (let i = 0; i < hotelIds.length; i += CHUNK) {
    const chunk = hotelIds.slice(i, i + CHUNK);
    const u = new URL("https://test.api.amadeus.com/v3/shopping/hotel-offers");
    u.searchParams.set("hotelIds", chunk.join(","));
    u.searchParams.set("checkInDate", checkIn);
    u.searchParams.set("checkOutDate", checkOut);
    u.searchParams.set("adults", "1");
    u.searchParams.set("roomQuantity", "1");
    u.searchParams.set("bestRateOnly", "true");
    u.searchParams.set("includeClosed", "false");
    u.searchParams.set("currency", currency);

    const r = await fetch(u.toString(), { headers: { Authorization: `Bearer ${tk}` }, cache: "no-store" });
    if (!r.ok) continue; // try next chunk
    const j: any = await r.json();
    out.push(...mapV3Hotels(j.data || [], cityCode, checkIn, checkOut, currency));
  }
  return out;
}

export async function searchHotels(params: {
  cityCode: string;
  checkIn: string;
  checkOut: string;
  nights?: number;
  currency?: string;
}) {
  const { cityCode, checkIn, checkOut, currency = "USD" } = params;

  // 1) Try v3 by cityCode
  try {
    const hotels = await fetchV3ByCity(cityCode, checkIn, checkOut, currency);
    if (hotels.length > 0) {
      hotels.sort((a, b) => (a.price_converted ?? Infinity) - (b.price_converted ?? Infinity));
      return hotels.slice(0, 20);
    }
  } catch (e: any) {
    const msg = String(e?.message || "");
    const needsIds =
      /hotelIds/i.test(msg) || (e?.status === 400 && /Required parameter:\s*hotelIds/i.test(msg));
    if (!needsIds) {
      // Different error; let caller decide fallback
      throw e;
    }
  }

  // 2) Get hotel IDs by city, then fetch offers by IDs
  const list = await hotelIdsByCity(cityCode);
  const ids = list.map((x) => x.id).slice(0, 80);
  if (ids.length === 0) return [];

  const byIds = await fetchV3ByIds(ids, checkIn, checkOut, currency, cityCode);
  byIds.sort((a, b) => (a.price_converted ?? Infinity) - (b.price_converted ?? Infinity));
  return byIds.slice(0, 20);
}
