import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://xdjitzgqjsgcupwwipzz.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fYg3t3wW9j9j4EZ9vQm4Qg_XFByF5E8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
