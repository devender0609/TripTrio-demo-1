import { NextResponse } from "next/server";
import { duffelGetOrder } from "@/lib/providers/duffel";

const USE_DUFFEL = process.env.USE_DUFFEL === "1";
const DUFFEL_KEY = process.env.DUFFEL_KEY || process.env.DUFFEL_API_KEY || "";
const DUFFEL_READY = USE_DUFFEL && /^duffel_/.test(DUFFEL_KEY);

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!DUFFEL_READY) return NextResponse.json({ error: "Duffel not enabled" }, { status: 503 });
  try {
    const id = String(params.id || "");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const order = await duffelGetOrder(id);
    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Duffel get order failed" }, { status: 500 });
  }
}
