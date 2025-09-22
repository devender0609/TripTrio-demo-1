'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export default function BookClient() {
  const sp = useSearchParams();
  const params = useMemo(() => Object.fromEntries(sp.entries()), [sp]);

  // TODO: Move your previous /book page UI here.
  // Read any query params you need from `params`.

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Book</h1>
      <pre className="mt-4 p-3 rounded bg-gray-100 text-sm overflow-auto">
        {JSON.stringify(params, null, 2)}
      </pre>
    </main>
  );
}
