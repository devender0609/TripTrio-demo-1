// server/src/providers/duffel.ts
import fetch from "node-fetch";

/** Read env on each call so changes after a restart are picked up */
function getDuffelEnv() {
  const key =
    process.env.DUFFEL_KEY ||
    process.env.DUFFEL_API_KEY || // allow either name
    "";

  const version = process.env.DUFFEL_VERSION || "v2";
  return { key, version };
}

function headers() {
  const { key, version } = getDuffelEnv();
  if (!key) {
    throw new Error(
      "Missing Duffel API key. Set DUFFEL_KEY (or DUFFEL_API_KEY) in server/.env"
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    "Duffel-Version": version,
    "Content-Type": "application/json",
  };
}

/** Simple GET wrapper */
async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: headers() as any });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  return JSON.parse(text);
}

/** Simple POST wrapper */
async function postJSON<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: headers() as any,
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  return JSON.parse(text);
}

/** Turn ISO-8601 durations “PT5H30M” → minutes */
function isoDurToMinutes(iso?: string): number | undefined {
  if (!iso || typeof iso !== "string") return undefined;
  const m = iso.match(/P(?:\d+Y)?(?:\d+M)?(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return undefined;
  const h = Number(m[1] || 0);
  const mm = Number(m[2] || 0);
  return h * 60 + mm;
}

/* ------------------------------------------------------------------ */
/*                           SEARCH OFFERS                            */
/* ------------------------------------------------------------------ */

/** Create an offer request and list offers (normalized to TripTrio shape) */
export async function duffelSearchOffers(params: {
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string;
  passengers: number; // adults only for first cut
  cabin?: "economy" | "premium_economy" | "business" | "first";
}) {
  const {
    origin,
    destination,
    departDate,
    returnDate,
    passengers,
    cabin = "economy",
  } = params;

  const slices: any[] = [{ origin, destination, departure_date: departDate }];
  if (returnDate) {
    slices.push({
      origin: destination,
      destination: origin,
      departure_date: returnDate,
    });
  }

  const body = {
    slices,
    passengers: Array.from({ length: Math.max(1, passengers) }).map(() => ({
      type: "adult",
    })),
    cabin_class: cabin,
    max_connections: 2,
  };

  // 1) Create offer request
  const req = await postJSON<any>(
    "https://api.duffel.com/air/offer_requests",
    { data: body }
  );

  // 2) Fetch offers for that request
  const offerReqId = req?.data?.id;
  if (!offerReqId) return [];

  const offersResp = await getJSON<any>(
    `https://api.duffel.com/air/offers?offer_request_id=${encodeURIComponent(
      offerReqId
    )}&limit=50&sort=total_amount`
  );
  const offers = Array.isArray(offersResp?.data) ? offersResp.data : [];

  // 3) Normalize minimal fields used by the web UI
  return offers.map((o: any) => {
    const amount = Number(o.total_amount || 0);
    const currency = o.total_currency || "USD";

    const itineraries = (o.slices || []).map((sl: any) => ({
      segments: (sl.segments || []).map((s: any) => ({
        from: s?.origin?.iata_code,
        to: s?.destination?.iata_code,
        depart_time: s?.departing_at,
        arrive_time: s?.arriving_at,
        duration_minutes: s?.duration ? isoDurToMinutes(s.duration) : undefined,
        flight_number: `${s?.marketing_carrier?.iata_code || ""}${
          s?.marketing_carrier_flight_number || ""
        }`,
        marketingCarrier: s?.marketing_carrier?.iata_code,
      })),
    }));

    const totalMinutes = (o.slices || []).reduce((acc: number, sl: any) => {
      const m = sl?.duration ? isoDurToMinutes(sl.duration) : undefined;
      return acc + (Number.isFinite(m as number) ? (m as number) : 0);
    }, 0);

    const stops = Math.max(
      0,
      ...((o.slices || []).map((sl: any) =>
        Math.max(0, (sl.segments || []).length - 1)
      ) as number[])
    );

    const carrier =
      o?.owner?.iata_code ||
      o?.slices?.[0]?.segments?.[0]?.marketing_carrier?.iata_code ||
      "";

    return {
      id: o.id,
      carrier,
      carrier_name: o?.owner?.name || carrier,
      cabin:
        (o?.passengers?.[0]?.cabin_class || cabin || "economy").toUpperCase(),
      duration_minutes: totalMinutes || undefined,
      stops,
      refundable: o?.refundable || false,
      price_usd: currency === "USD" ? amount : undefined,
      price_usd_converted: undefined, // set if you run FX
      currency,
      itineraries,
      bookingLinks: {}, // server/index.ts adds deeplinks
    };
  });
}

/* ------------------------------------------------------------------ */
/*                              ORDERS                                */
/* ------------------------------------------------------------------ */

/** Fetch a single offer (confirm amount/currency before paying) */
export async function duffelGetOffer(offerId: string) {
  return getJSON<any>(
    `https://api.duffel.com/air/offers/${encodeURIComponent(offerId)}`
  );
}

/**
 * Create an order in Duffel using the sandbox-friendly "balance" payment.
 * Pass one or more passengers. For v1, you can send a single adult.
 */
export async function duffelCreateOrder(input: {
  offer_id: string;
  contact: { email: string; phone_number: string };
  passengers: Array<{
    title?: "mr" | "mrs" | "ms";
    given_name: string;
    family_name: string;
    born_on?: string;              // YYYY-MM-DD
    gender?: "m" | "f" | "x";
  }>;
}) {
  // Confirm total from the offer
  const offer = await duffelGetOffer(input.offer_id);
  const totalAmount = offer?.data?.total_amount || "0.00";
  const totalCurrency = offer?.data?.total_currency || "USD";

  const body = {
    data: {
      type: "orders",
      selected_offers: [input.offer_id],
      payments: [
        {
          type: "balance", // SANDBOX: succeeds without external PSP
          amount: totalAmount,
          currency: totalCurrency,
        },
      ],
      passengers: input.passengers.map((p, idx) => ({
        type: "adult",
        id: `pas_${idx + 1}`,
        title: p.title,
        given_name: p.given_name,
        family_name: p.family_name,
        born_on: p.born_on,
        gender: p.gender,
      })),
      metadata: {
        contact_email: input.contact.email,
        contact_phone: input.contact.phone_number,
        source: "triptrio",
      },
    },
  };

  return postJSON<any>("https://api.duffel.com/air/orders", body);
}

/** Retrieve an order by ID (to display confirmation/tickets) */
export async function duffelGetOrder(orderId: string) {
  return getJSON<any>(
    `https://api.duffel.com/air/orders/${encodeURIComponent(orderId)}`
  );
}
