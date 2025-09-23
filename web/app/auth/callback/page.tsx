import { Suspense } from "react";
import NextDynamic from "next/dynamic";

// Never prerender this page
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Render the client component only on the client
const CallbackClient = NextDynamic(() => import("./CallbackClient"), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Finishing sign-in…</div>}>
      <CallbackClient />
    </Suspense>
  );
}
