// web/lib/providers/amadeus.ts
import fetch from "node-fetch";

const AMADEUS_KEY = process.env.AMADEUS_API_KEY || "";
const AMADEUS_SECRET = process.env.AMADEUS_API_SECRET || "";

let token: string | null = null;
let tokenExp = 0;

async function getToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (token && now < tokenExp - 30) return token;

  const r = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: AMADEUS_KEY,
      client_secret: AMADEUS_SECRET,
    }),
  });
  if (!r.ok) throw new Error("Amadeus auth failed");
  const j: any = await r.json();
  token = j.access_token;
  tokenExp = now + (Number(j.expires_in) || 1800);
  return token!;
}

export async function searchLocations(query: string) {
  const tk = await getToken();
  const r = await fetch(
    `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(
      query
    )}`,
    { headers: { Authorization: `Bearer ${tk}` } }
  );
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Locations lookup failed: ${text || r.statusText}`);
  }
  const j: any = await r.json();
  return (j.data || []).map((d: any) => ({
    type: String(d.subType || d.type || "").toUpperCase() as "CITY" | "AIRPORT",
    iataCode: d.iataCode,
    cityCode: d.address?.cityCode || d.iataCode,
    name: d.name,
    cityName: d.address?.cityName || d.name,
    countryName: d.address?.countryName || "",
  }));
}
