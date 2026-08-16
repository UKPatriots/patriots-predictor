import { createClient } from "@supabase/supabase-js";

// IMPORTANT: this uses the SERVICE ROLE key, which can bypass all security
// rules. It must only ever be used in server-side code (API routes),
// never sent to the browser. That's why it's a separate file from
// supabaseClient.js and the env var name does NOT start with NEXT_PUBLIC_.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
