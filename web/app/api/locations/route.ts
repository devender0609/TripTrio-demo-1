// web/app/api/locations/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  // Where your Express API is running:
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.API_BASE ||                // fallback if you prefer a private var name
    "http://localhost:4000";

  const upstream = `${API_BASE}/locations?q=${encodeURIComponent(q)}`;
  const r = await fetch(upstream, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ items: [] }, { status: 200 });

  const data = await r.json();
  return NextResponse.json(data);
}
