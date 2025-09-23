// web/app/auth/callback/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") || "/";
  return NextResponse.redirect(new URL(redirect, url.origin));
}
