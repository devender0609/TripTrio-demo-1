import NextDynamic from "next/dynamic";

// Render client-only to avoid prerender/SSG evaluating useSearchParams
const CallbackClient = NextDynamic(() => import("./CallbackClient"), { ssr: false });

// Ensure this page is never statically rendered
export const dynamic = "force-dynamic";

export default function Page() {
  return <CallbackClient />;
}
