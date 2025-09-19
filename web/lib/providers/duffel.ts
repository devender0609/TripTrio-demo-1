// web/lib/providers/duffel.ts
import fetch from "node-fetch";

const DUFFEL_KEY =
  process.env.DUFFEL_KEY ||
  process.env.DUFFEL_API_KEY || // allow either name
  "";
const DUFFEL_VERSION = process.env.DUFFEL_VERSION || "v2";

function assertReady() {
  if (!/^duffel_/.test(DUFFEL_KEY || "")) {
    throw new Error("Duffel is not configured (set DUFFEL_KEY)");
  }
}

async function asJson(r: Response) {
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j?.errors?.[0]?.message || j?.error || text || r.statusText;
    } catch {}
    throw new Error(`Duffel ${r.status}: ${msg}`);
  }
  return r.json();
}

const base = "https://api.duffel.com";

export async function duffelGetOffer(offer_id: string) {
  assertReady();
  const r = await fetch(`${base}/air/offers/${encodeURIComponent(offer_id)}`, {
    headers: {
      Authorization: `Bearer ${DUFFEL_KEY}`,
      "Duffel-Version": DUFFEL_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  return asJson(r);
}

export async function duffelCreateOrder(params: {
  offer_id: string;
  contact: { email: string; phone_number: string };
  passengers: any[];
}) {
  assertReady();
  const r = await fetch(`${base}/air/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DUFFEL_KEY}`,
      "Duffel-Version": DUFFEL_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "orders",
        selected_offers: [params.offer_id],
        passengers: params.passengers,
        contact: params.contact,
      },
    }),
  });
  return asJson(r);
}

export async function duffelGetOrder(id: string) {
  assertReady();
  const r = await fetch(`${base}/air/orders/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${DUFFEL_KEY}`,
      "Duffel-Version": DUFFEL_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  return asJson(r);
}

// Optional convenience for health checks
export const DUFFEL_READY = /^duffel_/.test(DUFFEL_KEY || "");
