// server/src/locations.ts
import fs from "fs";
import path from "path";

export type Place = {
  type: "CITY" | "AIRPORT";
  iataCode: string;
  name: string;
  cityName: string;
  countryName: string;
};

type Raw = { iata: string; name: string; city: string; country: string; type: "CITY" | "AIRPORT" };

let INDEX: Raw[] = [];
let READY = false;

export function loadLocations() {
  if (READY) return;
  // A small, sane default list that you can replace with a full dataset later
  // You can generate a bigger file (airports.min.json) using OpenFlights/OurAirports.
  // Place a bigger file at server/data/airports.min.json and it will be used automatically.
  const builtIn = [
    { iata: "DFW", name: "Dallas/Fort Worth Intl", city: "Dallas", country: "United States", type: "AIRPORT" },
    { iata: "DAL", name: "Dallas Love Field", city: "Dallas", country: "United States", type: "AIRPORT" },
    { iata: "AUS", name: "Austin-Bergstrom Intl", city: "Austin", country: "United States", type: "AIRPORT" },
    { iata: "LAS", name: "Harry Reid Intl", city: "Las Vegas", country: "United States", type: "AIRPORT" },
    { iata: "LAX", name: "Los Angeles Intl", city: "Los Angeles", country: "United States", type: "AIRPORT" },
    { iata: "SFO", name: "San Francisco Intl", city: "San Francisco", country: "United States", type: "AIRPORT" },
    { iata: "JFK", name: "John F. Kennedy Intl", city: "New York", country: "United States", type: "AIRPORT" },
    { iata: "EWR", name: "Newark Liberty Intl", city: "Newark", country: "United States", type: "AIRPORT" },
    { iata: "LHR", name: "Heathrow", city: "London", country: "United Kingdom", type: "AIRPORT" },
    { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", type: "AIRPORT" },
    { iata: "DEL", name: "Indira Gandhi Intl", city: "Delhi", country: "India", type: "AIRPORT" },
    { iata: "BOM", name: "Chhatrapati Shivaji Maharaj Intl", city: "Mumbai", country: "India", type: "AIRPORT" },
    { iata: "DXB", name: "Dubai Intl", city: "Dubai", country: "United Arab Emirates", type: "AIRPORT" },
    { iata: "SIN", name: "Changi", city: "Singapore", country: "Singapore", type: "AIRPORT" },
    { iata: "NRT", name: "Narita", city: "Tokyo", country: "Japan", type: "AIRPORT" },
    { iata: "HND", name: "Haneda", city: "Tokyo", country: "Japan", type: "AIRPORT" },
  ];

  const externalPath = path.join(process.cwd(), "data", "airports.min.json");
  if (fs.existsSync(externalPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(externalPath, "utf8")) as Raw[];
      INDEX = normalize(raw);
      READY = true;
      return;
    } catch {}
  }
  INDEX = normalize(builtIn as any);
  READY = true;
}

function normalize(rows: Raw[]): Raw[] {
  const uniq = new Map<string, Raw>();
  for (const r of rows) {
    if (!r.iata || r.iata.length !== 3) continue;
    const key = r.iata.toUpperCase();
    if (!uniq.has(key)) {
      uniq.set(key, {
        iata: key,
        name: (r.name || "").trim(),
        city: (r.city || "").trim(),
        country: (r.country || "").trim(),
        type: r.type === "CITY" || r.type === "AIRPORT" ? r.type : "AIRPORT",
      });
    }
  }
  return Array.from(uniq.values());
}

export function searchPlaces(q: string, limit = 20): Place[] {
  loadLocations();
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const starts: Raw[] = [];
  const contains: Raw[] = [];
  for (const r of INDEX) {
    const hay = `${r.iata} ${r.city} ${r.name} ${r.country}`.toLowerCase();
    if (hay.startsWith(s) || r.iata.toLowerCase() === s) {
      starts.push(r);
    } else if (hay.includes(s)) {
      contains.push(r);
    }
  }
  const out = [...starts, ...contains].slice(0, limit).map(toPlace);
  return out;
}

function toPlace(r: Raw): Place {
  return {
    type: r.type,
    iataCode: r.iata,
    name: r.name,
    cityName: r.city || r.name,
    countryName: r.country,
  };
}
