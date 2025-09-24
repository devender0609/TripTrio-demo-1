"use client";

import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Completing sign-in…</div>}>
      <CallbackClient />
    </Suspense>
  );
}
