// server/src/links.ts

export function googleFlightsLink(args: {
  origin: string; destination: string;
  depart: string; returnDate?: string;
  adults?: number; cabin?: "ECONOMY"|"PREMIUM_ECONOMY"|"BUSINESS"|"FIRST";
}) {
  const { origin, destination, depart, returnDate, adults = 1, cabin = "ECONOMY" } = args;
  // Cabin map to Google: e=eco, p=prem eco, b=business, f=first (best-effort)
  const cMap: Record<string,string> = { ECONOMY:"e", PREMIUM_ECONOMY:"p", BUSINESS:"b", FIRST:"f" };
  const c = cMap[cabin] || "e";
  // Basic deeplink format
  const base = "https://www.google.com/travel/flights";
  const qp = new URLSearchParams({
    hl: "en",
    q: `${origin} to ${destination} on ${depart}${returnDate ? " returning " + returnDate : ""}`,
  });
  // Google also accepts more structured params via “search” hash, but this simple query works globally.
  return `${base}?${qp.toString()}#flt=${origin}.${destination}.${depart};c:${c};px:${adults}${returnDate ? `;ret=${destination}.${origin}.${returnDate}` : ""}`;
}

export function skyScannerLink(args: {
  origin: string; destination: string;
  depart: string; returnDate?: string; adults?: number; cabin?: string;
}) {
  const { origin, destination, depart, returnDate } = args;
  // Format: https://www.skyscanner.com/transport/flights/<from>/<to>/<YYMMDD>/<YYMMDD>/
  const d1 = depart.replaceAll("-", "").slice(2); // YYMMDD
  const d2 = returnDate ? returnDate.replaceAll("-", "").slice(2) : "";
  const base = "https://www.skyscanner.com/transport/flights";
  return `${base}/${origin}/${destination}/${d1}${returnDate ? `/${d2}` : ""}/?adults=1`;
}

export function bookingLink(args: {
  destination: string; checkin: string; checkout?: string; aid?: string;
}) {
  const { destination, checkin, checkout, aid } = args;
  const base = "https://www.booking.com/searchresults.html";
  const qp = new URLSearchParams({
    ss: destination,
    checkin: checkin,
    ...(checkout ? { checkout } : {}),
    group_adults: "2",
  });
  if (aid) qp.set("aid", aid);
  return `${base}?${qp.toString()}`;
}

export function expediaLink(args: { destination: string; checkin: string; checkout?: string }) {
  const { destination, checkin, checkout } = args;
  const base = "https://www.expedia.com/Hotel-Search";
  const qp = new URLSearchParams({
    destination,
    startDate: checkin,
    ...(checkout ? { endDate: checkout } : {}),
    adults: "2",
  });
  return `${base}?${qp.toString()}`;
}

export function hotelsDotComLink(args: { destination: string; checkin: string; checkout?: string }) {
  const { destination, checkin, checkout } = args;
  const base = "https://www.hotels.com/Hotel-Search";
  const qp = new URLSearchParams({
    destination,
    startDate: checkin,
    ...(checkout ? { endDate: checkout } : {}),
    adults: "2",
  });
  return `${base}?${qp.toString()}`;
}

export function googleHotelsLink(args: { destination: string; checkin: string; checkout?: string }) {
  const { destination, checkin, checkout } = args;
  const base = "https://www.google.com/travel/hotels";
  const qp = new URLSearchParams({
    q: destination,
    ...(checkin ? { checkin } : {}),
    ...(checkout ? { checkout } : {}),
  });
  return `${base}/${encodeURIComponent(destination)}?${qp.toString()}`;
}
