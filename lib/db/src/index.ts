import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export { eq, and, or, gte, lt, isNull, sql, desc, count } from "drizzle-orm";

// Use Supabase connection string if provided, otherwise fall back to Replit DATABASE_URL
const connectionString = process.env.SUPABASE_CONNECTION_STRING ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No database connection string configured. Set SUPABASE_CONNECTION_STRING or DATABASE_URL.");
}

const isSupabase = connectionString.includes("supabase.com");

const pool = new Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 15_000,
  query_timeout: 15_000,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on("error", (err) => {
  process.stderr.write(`[db-pool] idle client error: ${err.message}\n`);
});

export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
