import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export { eq, and, or, gte, lt, isNull, sql, desc, count } from "drizzle-orm";

// Use Supabase connection string if provided, otherwise fall back to Replit DATABASE_URL
const rawString = process.env.SUPABASE_CONNECTION_STRING ?? process.env.DATABASE_URL;

if (!rawString) {
  throw new Error("No database connection string configured. Set SUPABASE_CONNECTION_STRING or DATABASE_URL.");
}

const isSupabase = rawString.includes("supabase.com") || rawString.includes("pooler.supabase");

/**
 * Safely parse a postgresql:// URI that may contain special characters in the
 * password (e.g. brackets, slashes, $, !) by percent-encoding only the
 * password segment before handing it to the URL parser.
 */
function parseConnectionString(raw: string): { connectionString: string } | { host: string; port: number; user: string; password: string; database: string } {
  // Fast path: if it parses cleanly, just use it as-is
  try {
    new URL(raw);
    return { connectionString: raw };
  } catch {
    // Password contains special characters — extract and encode it manually
  }

  // postgresql://user:password@host:port/database
  const match = raw.match(/^(?:postgresql|postgres):\/\/([^:]+):(.+)@([^:/]+):(\d+)\/(.+)$/);
  if (!match) {
    // Fall back: return as-is and let pg handle the error
    return { connectionString: raw };
  }

  const [, user, password, host, portStr, database] = match;
  return {
    host,
    port: Number(portStr),
    user,
    password,
    database,
  };
}

const parsed = parseConnectionString(rawString);

const pool = new Pool({
  ...parsed,
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
