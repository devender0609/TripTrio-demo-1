// web/lib/supabase-admin.ts
import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These must only exist on the server
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

let admin: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
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

// Back-compat for existing imports in routes:
// import { getSupaAdmin } from "@/lib/supabase-admin"
export const getSupaAdmin = getAdmin;
