'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export default function LoginClient() {
  const sp = useSearchParams();
  const params = useMemo(() => Object.fromEntries(sp.entries()), [sp]);

  // TODO: Move your previous /login UI (client bits) here.
  // If you’re using Supabase Auth, put the client widgets here.

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Login</h1>
      <pre className="mt-4 p-3 rounded bg-gray-100 text-sm overflow-auto">
        {JSON.stringify(params, null, 2)}
      </pre>
    </main>
  );
}
