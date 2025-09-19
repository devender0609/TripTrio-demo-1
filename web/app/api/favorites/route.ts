import { NextResponse } from "next/server";
import { getSupaAdmin } from "@/lib/supabase-admin";

// GET
export async function GET(req: Request) {
  const supa = getSupaAdmin();
  if (!supa) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userRes } = await supa.auth.getUser(token);
  const user = userRes?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supa.from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

// POST
export async function POST(req: Request) {
  const supa = getSupaAdmin();
  if (!supa) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userRes } = await supa.auth.getUser(token);
  const user = userRes?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const payload = body?.payload ?? null;
  if (!payload) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

  const { data, error } = await supa.from("favorites")
    .insert([{ user_id: user.id, payload }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
