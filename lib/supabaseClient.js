import { createClient } from "@supabase/supabase-js";

// These come from your Supabase project settings and are safe to expose
// to the browser (the "anon" key is designed for public/client-side use).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
