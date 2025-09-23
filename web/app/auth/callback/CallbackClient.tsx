"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function CallbackClient() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const qs = useSearchParams();

  useEffect(() => {
    // Supabase will handle the OAuth session in URL
    // Just read optional redirect and send user there
    const redirectTo = qs.get("redirect") || "/";
    // tiny delay lets supabase hydrate the session first
    const t = setTimeout(() => router.replace(redirectTo), 200);
    return () => clearTimeout(t);
  }, [qs, router, supabase]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="rounded-xl border px-6 py-8 shadow-sm text-center">
        <h1 className="text-lg font-semibold mb-1">Finishing sign-in…</h1>
        <p className="text-sm text-gray-500">Please wait a moment.</p>
      </div>
    </div>
  );
}
