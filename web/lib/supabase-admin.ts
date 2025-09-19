// web/lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";

// IMPORTANT: keep these only on the server (API routes / server components)
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

let admin: ReturnType<typeof createClient> | null = null;

export function getAdmin() {
  if (!admin) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase admin env vars are missing");
    }
    admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
