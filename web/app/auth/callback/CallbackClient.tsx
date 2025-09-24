"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CallbackClient() {
  const router = useRouter();
  const qs = useSearchParams();

  useEffect(() => {
    const redirect = qs.get("redirect") || "/";
    router.replace(redirect);
  }, [qs, router]);

  return <div className="p-6 text-sm text-gray-500">Completing sign-in…</div>;
}
