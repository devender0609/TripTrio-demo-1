import { NextResponse } from "next/server";
import { searchLocations } from "@/lib/providers/amadeus";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ items: [] });
  try {
    const items = await searchLocations(q);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Locations failed" }, { status: 500 });
  }
}
