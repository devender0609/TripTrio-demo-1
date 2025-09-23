"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CallbackClient() {
  const router = useRouter();
  const qs = useSearchParams();

  const redirect = qs.get("redirect") || "/";
  const error = qs.get("error") || "";
  const message = qs.get("message") || "";

  const [status, setStatus] = useState("Finishing sign-in…");

  useEffect(() => {
    if (error) {
      setStatus(error || "Something went wrong. You can close this tab.");
      return;
    }
    // small delay so the tab isn’t an immediate bounce
    const t = setTimeout(() => router.replace(redirect), 500);
    return () => clearTimeout(t);
  }, [error, redirect, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Redirecting…</h1>
        <p className="text-gray-600">{status || message}</p>
      </div>
    </div>
  );
}
