// web/app/auth/callback/page.tsx
import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

// Tell Next not to statically pre-render this page
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Completing sign-in…</div>}>
      <CallbackClient />
    </Suspense>
  );
}
