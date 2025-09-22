"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function BookContent() {
  const q = useSearchParams();
  const info = {
    flightId: q.get("flightId") || "",
    carrier: q.get("carrier") || "",
    origin: q.get("origin") || "",
    destination: q.get("destination") || "",
    depart: q.get("depart") || "",
    ret: q.get("return") || "",
    hotel: q.get("hotel") || "",
    currency: q.get("currency") || "USD",
    total: q.get("total") || "",
    pax: q.get("pax") || "1",
    cabin: q.get("cabin") || "ECONOMY",
  };

  const nextHref = `/book/checkout?${q.toString()}`;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Review your trip</h1>

      <section className="rounded border p-4 space-y-2">
        <div><b>Flight:</b> {info.flightId || "—"} ({info.carrier || "—"})</div>
        <div><b>Route:</b> {info.origin} → {info.destination}</div>
        <div><b>Dates:</b> {info.depart}{info.ret ? ` · Return ${info.ret}` : ""}</div>
        <div><b>Cabin / Pax:</b> {info.cabin} · {info.pax}</div>
        {info.hotel ? <div><b>Hotel:</b> {info.hotel}</div> : null}
        <div><b>Total:</b> {info.total ? `${info.total} ${info.currency}` : "—"}</div>
      </section>

      <div className="flex gap-3">
        <Link
          href={nextHref}
          className="inline-flex items-center rounded bg-black px-4 py-2 text-white"
        >
          Continue to checkout
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded border px-4 py-2"
        >
          Back to search
        </Link>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <BookContent />
    </Suspense>
  );
}
