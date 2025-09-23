"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function CallbackClient() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const qs = useSearchParams();

  useEffect(() => {
    const error = qs.get("error_description") || qs.get("error");
    const redirect = qs.get("redirect") || "/";

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    supabase.auth.getSession().finally(() => {
      router.replace(redirect);
    });
  }, [qs, router, supabase]);

  return <div className="p-6 text-center">Completing sign-in…</div>;
}
