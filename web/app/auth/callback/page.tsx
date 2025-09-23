// web/app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const qs = useSearchParams();
  const redirect = qs.get("redirect") || "/";

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    (async () => {
      try {
        // Convert the provider ?code= into a Supabase session
        await supabase.auth.exchangeCodeForSession(window.location.href);
      } catch (e) {
        // ignore — we'll still try to go back
        console.error("OAuth exchange failed", e);
      } finally {
        router.replace(redirect);
      }
    })();
  }, [router, redirect]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      Signing you in…
    </div>
  );
}
