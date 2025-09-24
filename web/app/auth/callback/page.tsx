import nextDynamic from "next/dynamic";
import { Suspense } from "react";

// Do NOT statically render this page
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Load the client component only on the client
const CallbackClient = nextDynamic(() => import("./CallbackClient"), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Signing you in…</div>}>
      <CallbackClient />
    </Suspense>
  );
}