import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const supabaseUrl = process.env["SUPABASE_URL"];
const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL environment variable is required but was not provided.");
}

if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY environment variable is required but was not provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

logger.info("Supabase client initialized");
