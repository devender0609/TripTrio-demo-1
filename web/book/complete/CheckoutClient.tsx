"use client";

import { useSearchParams } from "next/navigation";

export default function CheckoutClient() {
  const params = useSearchParams();

  // read anything you expect from query here
  const orderId = params.get("orderId");
  const status = params.get("status") || "success";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-3">Booking complete</h1>
      <p className="mb-6">
        {status === "success"
          ? "Your booking was completed successfully."
          : "We couldn't verify your booking just yet."}
      </p>

      {orderId && (
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Order ID</div>
          <div className="font-mono">{orderId}</div>
        </div>
      )}
    </main>
  );
}