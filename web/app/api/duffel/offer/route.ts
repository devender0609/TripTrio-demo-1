import { NextResponse } from "next/server";
import { duffelGetOffer } from "@/lib/providers/duffel";

const USE_DUFFEL = process.env.USE_DUFFEL === "1";
const DUFFEL_KEY = process.env.DUFFEL_KEY || process.env.DUFFEL_API_KEY || "";
const DUFFEL_READY = USE_DUFFEL && /^duffel_/.test(DUFFEL_KEY);

export async function POST(req: Request) {
  if (!DUFFEL_READY) return NextResponse.json({ error: "Duffel not enabled" }, { status: 503 });
  try {
    const body = await req.json();
    const offerId = String(body?.offerId || body?.offer_id || "");
    if (!offerId) return NextResponse.json({ error: "Missing offerId" }, { status: 400 });
    const offer = await duffelGetOffer(offerId);
    return NextResponse.json(offer);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Duffel offer fetch failed" }, { status: 500 });
  }
}
