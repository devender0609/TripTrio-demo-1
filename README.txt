# TripTrio (Real API Ready) — v18
Generated: 2025-09-08T19:52:41.896544Z

## What you get
- **server/** (Node + TypeScript): Express API calling **Amadeus Self-Service** for flights + hotels.
- **web/** (Next.js App Router): Polished UI with autocomplete, smart dates, budget, cabin + stars, compare to PDF, and booking deep-links.

## Prereqs
- Node 18+ recommended
- Amadeus Self-Service account + credentials

## Setup

### 1) Server
```bash
cd server
cp .env.example .env      # add your AMADEUS_API_KEY and AMADEUS_API_SECRET
npm install
npm run dev               # http://localhost:4000  (GET /health)
```
Endpoints:
- `GET /health` → `{ ok: true }`
- `GET /airports?q=aus` → small autocomplete list
- `POST /search` → body:
```json
{
  "origin": "AUS",
  "destination": "LHR",
  "depart": "2025-10-10",
  "returnDate": "2025-10-20",
  "hotel": true,
  "nights": 5,
  "travelers": 1,
  "cabin_class": "ECONOMY",
  "bags": 1,
  "max_stops": 1,
  "budgetMin": 0,
  "budgetMax": 5000,
  "hotelStarsMin": 3,
  "mode": "best"
}
```

### 2) Web
```bash
cd web
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env.local
npm run dev               # http://localhost:3000
```

## Notes
- This build is **Real API Ready**: it actually calls Amadeus when keys are set.
- Hotel search is simplified by city; for better accuracy, use Locations API to resolve **city codes** and pass `hotelIds` into the hotel offers endpoint.
- Deep-links use Skyscanner/Booking as convenience; final booking is done on those sites.
- If you get 401/403 from Amadeus, double-check keys + environment and that your account has access to endpoints.
