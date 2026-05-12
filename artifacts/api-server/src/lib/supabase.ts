import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const rawUrl = process.env["SUPABASE_URL"];
const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];

if (!rawUrl) {
  throw new Error("SUPABASE_URL environment variable is required but was not provided.");
}

if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY environment variable is required but was not provided.");
}

// Strip any trailing path segments the SDK appends itself (e.g. /rest/v1)
// so the secret can be stored as either the base URL or the full REST URL.
const supabaseUrl = new URL(rawUrl).origin;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

logger.info({ supabaseUrl }, "Supabase client initialized");
