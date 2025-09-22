import { Suspense } from "react";
import CompleteClient from "./CompleteClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Finalizing…</div>}>
      <CompleteClient />
    </Suspense>
  );
}
