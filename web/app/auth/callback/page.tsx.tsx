// web/app/auth/callback/page.tsx
import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Completing sign-in…</div>}>
      <CallbackClient />
    </Suspense>
  );
}