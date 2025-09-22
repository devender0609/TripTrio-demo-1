"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function CheckoutClient() {
  const params = useSearchParams();

  const details = useMemo(() => ({
    flightId: params.get("flightId") || "",
    carrier: params.get("carrier") || "",
    origin: params.get("origin") || "",
    destination: params.get("destination") || "",
    depart: params.get("depart") || "",
    ret: params.get("return") || "",
    hotel: params.get("hotel") || "",
    currency: params.get("currency") || "USD",
    total: params.get("total") || "",
    pax: params.get("pax") || "1",
    cabin: params.get("cabin") || "ECONOMY",
  }), [params]);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="rounded border p-4">
        <div className="grid grid-cols-2 gap-2">
          <div><b>Flight ID:</b> {details.flightId}</div>
          <div><b>Carrier:</b> {details.carrier}</div>
          <div><b>From:</b> {details.origin}</div>
          <div><b>To:</b> {details.destination}</div>
          <div><b>Depart:</b> {details.depart}</div>
          {details.ret && <div><b>Return:</b> {details.ret}</div>}
          {details.hotel && <div className="col-span-2"><b>Hotel:</b> {details.hotel}</div>}
          <div><b>Passengers:</b> {details.pax}</div>
          <div><b>Cabin:</b> {details.cabin}</div>
          <div><b>Total:</b> {details.total} {details.currency}</div>
        </div>
      </div>
      {/* Put your pay button / form here */}
      <button className="rounded bg-black text-white px-4 py-2">Pay now</button>
    </main>
  );
}
