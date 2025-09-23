// web/app/auth/callback/CallbackClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function CallbackClient() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const qs = useSearchParams();

  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState<string>("Completing sign-in…");

  useEffect(() => {
    // Supabase returns a `code` (PKCE) or tokens in the URL; exchange for a session.
    async function run() {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;

        // Optional redirect passthrough
        const redirect = qs.get("redirect") || "/";
        setStatus("ok");
        setMessage("Signed in! Redirecting…");
        router.replace(redirect);
      } catch (e: any) {
        console.error(e);
        setStatus("error");
        setMessage(e?.message || "Could not complete sign-in.");
      }
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Auth Callback</h1>
        <p className={status === "error" ? "text-red-600" : "text-gray-600"}>
          {message}
        </p>
      </div>
    </div>
  );
}