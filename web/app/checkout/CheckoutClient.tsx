"use client";

import { useSearchParams } from "next/navigation";

export default function CheckoutClient() {
  const params = useSearchParams();
  const offerId = params.get("offerId") || params.get("offer_id") || "";
  const total = params.get("total") || "";
  const currency = params.get("currency") || "USD";

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="rounded border p-4 space-y-1">
        <div><b>Offer:</b> {offerId || "—"}</div>
        <div><b>Total:</b> {total ? `${total} ${currency}` : "—"}</div>
      </div>
    </main>
  );
}
