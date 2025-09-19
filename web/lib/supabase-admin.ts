// web/lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  // Don't throw at import time in case other routes don't need it,
  // but make it obvious if someone tries to use it.
  // eslint-disable-next-line no-console
  console.warn("Supabase admin not fully configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing).");
}

export const supaAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
