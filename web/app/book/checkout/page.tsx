"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutContent() {
  const q = useSearchParams();
  const offerId = q.get("offerId") || q.get("offer_id") || q.get("flightId") || "";
  const total = q.get("total") || "";
  const currency = q.get("currency") || "USD";

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      <div className="rounded border p-4 space-y-1">
        <div><b>Offer / Flight ID:</b> {offerId || "—"}</div>
        <div><b>Total:</b> {total ? `${total} ${currency}` : "—"}</div>
      </div>

      {/* Replace this with your actual payment flow when ready */}
      <form action="/book/complete" className="space-y-3">
        {/* Keep params on completion */}
        {[...q.entries()].map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Place order
        </button>
      </form>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading checkout…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
