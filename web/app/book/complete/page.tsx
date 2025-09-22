"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CompleteContent() {
  const q = useSearchParams();
  const conf = q.get("orderId") || q.get("id") || q.get("flightId") || "TMP-ORDER";
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">All set ✈️</h1>
      <p>Your booking is complete.</p>
      <div className="rounded border p-4">
        <b>Reference:</b> {conf}
      </div>
      <Link href="/" className="inline-flex items-center rounded border px-4 py-2">
        Back to home
      </Link>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Finishing…</div>}>
      <CompleteContent />
    </Suspense>
  );
}
