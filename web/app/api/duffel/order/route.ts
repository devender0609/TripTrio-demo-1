import { NextResponse } from "next/server";
import { duffelCreateOrder } from "@/lib/providers/duffel";

const USE_DUFFEL = process.env.USE_DUFFEL === "1";
const DUFFEL_KEY = process.env.DUFFEL_KEY || process.env.DUFFEL_API_KEY || "";
const DUFFEL_READY = USE_DUFFEL && /^duffel_/.test(DUFFEL_KEY);

export async function POST(req: Request) {
  if (!DUFFEL_READY) return NextResponse.json({ error: "Duffel not enabled" }, { status: 503 });
  try {
    const body = await req.json();
    const offer_id = String(body?.offer_id || body?.offerId || "");
    const contact = body?.contact;
    const passengers = body?.passengers;
    if (!offer_id) return NextResponse.json({ error: "Missing offer_id" }, { status: 400 });
    if (!contact?.email || !contact?.phone_number) {
      return NextResponse.json({ error: "Missing contact.email or contact.phone_number" }, { status: 400 });
    }
    if (!Array.isArray(passengers) || passengers.length < 1) {
      return NextResponse.json({ error: "At least one passenger is required" }, { status: 400 });
    }
    const order = await duffelCreateOrder({ offer_id, contact, passengers });
    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Duffel order failed" }, { status: 500 });
  }
}
