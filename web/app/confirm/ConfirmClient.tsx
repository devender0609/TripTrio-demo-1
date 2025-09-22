"use client";

import { useSearchParams } from "next/navigation";

export default function ConfirmClient() {
  const params = useSearchParams();
  const flightId = params.get("flightId") || "";
  const pax = params.get("pax") || "1";
  const cabin = params.get("cabin") || "ECONOMY";

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Confirm details</h1>
      <div className="rounded border p-4 space-y-1">
        <div><b>Flight:</b> {flightId}</div>
        <div><b>Passengers:</b> {pax}</div>
        <div><b>Cabin:</b> {cabin}</div>
      </div>
    </main>
  );
}
