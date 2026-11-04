import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the Edge runtime.
export const supabaseAdmin = createClient(
	Deno.env.get("SUPABASE_URL")!,
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
	{ auth: { autoRefreshToken: false, persistSession: false } },
);
