"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-[70vh] grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">Welcome back</h1>
        <p className="mb-6 text-sm text-gray-500">Sign in to continue</p>

        <form className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-md border px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-md border px-3 py-2 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-white"
          >
            Sign in
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          Don’t have an account?{" "}
          <Link href="/signup" className="underline">
            Create one
          </Link>
        </div>
      </div>
    </main>
  );
}
