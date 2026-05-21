import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const missingSupabaseConfig = [
  !supabaseUrl && "VITE_SUPABASE_URL",
  !supabaseAnonKey && "VITE_SUPABASE_ANON_KEY",
].filter(Boolean);

export const hasSupabaseConfig = missingSupabaseConfig.length === 0;

const missingConfigClient = new Proxy({}, {
  get() {
    throw new Error(`Missing Supabase environment variable(s): ${missingSupabaseConfig.join(", ")}`);
  },
});

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : missingConfigClient;
