@'
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function CallbackClient() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const qs = useSearchParams();

  const [msg, setMsg] = useState("Completing sign-in…");

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;
        const redirect = qs.get("redirect") || "/";
        setMsg("Signed in! Redirecting…");
        router.replace(redirect);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message || "Could not complete sign-in.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Auth Callback</h1>
        <p className="text-gray-700">{msg}</p>
      </div>
    </div>
  );
}
'@ | Set-Content web/app/auth/callback/CallbackClient.tsx -Encoding UTF8
