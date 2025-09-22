"use client";

import { useSearchParams } from "next/navigation";

export default function LoginClient() {
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form className="space-y-3">
        <input className="w-full border rounded p-2" placeholder="Email" type="email" />
        <input className="w-full border rounded p-2" placeholder="Password" type="password" />
        <button className="rounded bg-black text-white px-4 py-2 w-full" type="submit">
          Continue
        </button>
      </form>
      <div className="text-sm text-gray-500">After login you’ll be redirected to: {redirect}</div>
    </main>
  );
}
