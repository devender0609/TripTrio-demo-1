import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_KEY!;

export const supaAdmin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Get user from a Supabase access token (sent by client)
export async function getUserFromAuthHeader(authHeader?: string) {
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  try {
    const { data, error } = await supaAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}
