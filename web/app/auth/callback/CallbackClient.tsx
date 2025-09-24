"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function CallbackClient() {
  const router = useRouter();
  const qs = useSearchParams();
  const redirect = qs.get("redirect") || "/";

  useEffect(() => {
    // Ensure Supabase picks up the session from the URL hash and then redirect
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().finally(() => {
      router.replace(redirect);
    });
  }, [router, redirect]);

  return null;
}
