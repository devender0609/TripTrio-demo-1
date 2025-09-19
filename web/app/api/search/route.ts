import { NextResponse } from "next/server";
import { searchFlights, searchHotels, searchLocations } from "@/lib/providers/amadeus";
import { duffelSearchOffers } from "@/lib/providers/duffel";
import { addDays } from "@/lib/utils";

const USE_DUFFEL = process.env.USE_DUFFEL === "1";
const DUFFEL_KEY = process.env.DUFFEL_KEY || process.env.DUFFEL_API_KEY || "";
const DUFFEL_READY = USE_DUFFEL && /^duffel_/.test(DUFFEL_KEY);

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // … paste the rest of your search logic from server (unchanged),
    // just swap `res.json(...)` to `return NextResponse.json(...)`.
    // Keep the airline site map & triptrio link builder the same.
    // Any `fetch` stays the same (Next’s global fetch).
    // If you used CLIENT_BASE before, use process.env.NEXT_PUBLIC_SITE_BASE or compute from headers if needed.

    // (For brevity, not re-pasting the whole block here—copy exactly what you had,
    // and at the end do:)
    return NextResponse.json({ results: filtered, hotelWarning });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Search failed" }, { status: 500 });
  }
}
