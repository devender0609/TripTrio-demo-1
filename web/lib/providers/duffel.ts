// web/lib/providers/duffel.ts

const DUFFEL_KEY =
  process.env.DUFFEL_KEY || process.env.DUFFEL_API_KEY || "";
const DUFFEL_VERSION = process.env.DUFFEL_VERSION || "v2";

if (!DUFFEL_KEY) {
  console.warn("[duffel] DUFFEL_KEY / DUFFEL_API_KEY is not set");
}

const baseUrl = `https://api.duffel.com/${DUFFEL_VERSION}`;

async function duf<T = any>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Duffel-Version": DUFFEL_VERSION,
      Authorization: `Bearer ${DUFFEL_KEY}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Duffel ${path} failed (${r.status}): ${txt}`);
  }
  return r.json() as Promise<T>;
}

export async function duffelSearchOffers(params: {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers?: number;
  cabin?: "economy" | "premium_economy" | "business" | "first" | string;
}) {
  const { origin, destination, departDate, returnDate, passengers = 1, cabin = "economy" } = params;

  const slices: any[] = [
    { origin, destination, departure_date: departDate },
  ];
  if (returnDate) slices.push({ origin: destination, destination: origin, departure_date: returnDate });

  const body = {
    data: {
      slices,
      passengers: Array.from({ length: passengers }).map(() => ({ type: "adult" })),
      cabin_class: cabin as any,
    },
  };

  const j: any = await duf("/air/offer_requests", {
    method: "POST",
    body: JSON.stringify(body),
  });

  // Flatten into a simple array of offers with a few useful fields
  const offers = (j?.data?.offers || j?.data || []).map((o: any) => {
    const price = Number(o?.total_amount) || Number(o?.price?.total_amount) || 0;
    const currency = o?.total_currency || o?.price?.total_currency || "USD";
    const carrier = o?.owner?.iata_code || o?.slices?.[0]?.segments?.[0]?.operating_carrier?.iata_code;
    const durationMinutes = (() => {
      const mins = (o?.slices || [])
        .flatMap((s: any) => s?.segments || [])
        .reduce((t: number, seg: any) => t + (Number(seg?.duration_in_minutes) || 0), 0);
      return mins || undefined;
    })();
    return {
      id: o.id,
      carrier,
      duration_minutes: durationMinutes,
      price_usd: currency === "USD" ? price : undefined,
      price_usd_converted: currency !== "USD" ? price : undefined,
      currency,
      segments: o?.slices?.[0]?.segments || [],
      outbound: o?.slices?.[0]?.segments || [],
      inbound: o?.slices?.[1]?.segments || [],
      bookingLinks: {},
    };
  });

  return offers;
}

export async function duffelGetOffer(offerId: string) {
  return duf(`/air/offers/${offerId}`, { method: "GET" });
}

export async function duffelCreateOrder(params: {
  offer_id: string;
  contact: { email: string; phone_number: string };
  passengers: any[];
}) {
  const body = { data: params };
  return duf("/air/orders", { method: "POST", body: JSON.stringify(body) });
}

export async function duffelGetOrder(orderId: string) {
  return duf(`/air/orders/${orderId}`, { method: "GET" });
}
