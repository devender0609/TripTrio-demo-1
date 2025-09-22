"use client";

import { useSearchParams } from "next/navigation";

export default function BookClient() {
  const params = useSearchParams();
  const origin = params.get("origin") || "";
  const destination = params.get("destination") || "";
  const depart = params.get("depart") || "";
  const ret = params.get("return") || "";
  const pax = params.get("pax") || "1";
  const cabin = params.get("cabin") || "ECONOMY";

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Trip summary</h1>
      <div className="rounded border p-4 space-y-1">
        <div><b>From:</b> {origin}</div>
        <div><b>To:</b> {destination}</div>
        <div><b>Depart:</b> {depart}</div>
        {ret && <div><b>Return:</b> {ret}</div>}
        <div><b>Passengers:</b> {pax}</div>
        <div><b>Cabin:</b> {cabin}</div>
      </div>
    </main>
  );
}
