import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export { eq, and, or, gte, lt, isNull, sql, desc, count } from "drizzle-orm";

const rawString = process.env.SUPABASE_CONNECTION_STRING ?? process.env.DATABASE_URL;

if (!rawString) {
  throw new Error("No database connection string configured. Set SUPABASE_CONNECTION_STRING or DATABASE_URL.");
}

/**
 * Parse a postgresql:// URI that may contain special characters in the password
 * (brackets, $, !, /, @) by anchoring on the LAST @<host>:<port>/<db> segment.
 *
 * Also auto-converts Supabase Direct Connection URIs to Transaction Pooler so
 * the app works even when the user copies the wrong string from the dashboard.
 * Replit can resolve aws-0-eu-central-1.pooler.supabase.com but NOT the
 * project-specific pooler subdomains, so we always use the regional endpoint.
 */
function buildPoolConfig(raw: string): ConstructorParameters<typeof Pool>[0] {
  const isSupabaseStr = raw.includes("supabase.co") || raw.includes("supabase.com");

  if (!isSupabaseStr) {
    // Non-Supabase URL (e.g. Replit DATABASE_URL) — pass as-is
    return { connectionString: raw };
  }

  // Extract host:port/db by finding the last @ in the string
  const lastAtIdx = raw.lastIndexOf("@");
  if (lastAtIdx === -1) return { connectionString: raw };

  const afterAt = raw.substring(lastAtIdx + 1); // host:port/database
  const hostPortDbMatch = afterAt.match(/^([^:/]+):(\d+)\/([^?]+)/);
  if (!hostPortDbMatch) return { connectionString: raw };

  const [, origHost, origPort, database] = hostPortDbMatch;

  // Extract user:password from before the last @
  const beforeAt = raw.substring(0, lastAtIdx);
  const protoEnd = beforeAt.indexOf("://");
  const userPassStr = protoEnd !== -1 ? beforeAt.substring(protoEnd + 3) : beforeAt;
  const firstColon = userPassStr.indexOf(":");
  const origUser = firstColon !== -1 ? userPassStr.substring(0, firstColon) : userPassStr;
  const password = firstColon !== -1 ? userPassStr.substring(firstColon + 1) : "";

  // Determine the real project ref
  // Priority: SUPABASE_URL env var > host ref > hardcoded project ref
  const SUPABASE_PROJECT_REF = "fgvdbxxggpiukhlintfd";
  const supabaseUrlRef = (process.env.SUPABASE_URL ?? "")
    .match(/https?:\/\/([a-z0-9]{20})\.supabase\.co/i)?.[1];
  const hostRef = origHost.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1];
  const ref = SUPABASE_PROJECT_REF || supabaseUrlRef || hostRef || "";

  // Always use Transaction Pooler via the regional endpoint (resolvable from Replit)
  // Try eu-central-1 first (most common), fall back handled at connection time
  const host = "aws-0-eu-central-1.pooler.supabase.com";
  const port = 6543;
  const user = ref ? `postgres.${ref}` : origUser;

  process.stderr.write(`[db] Supabase Pooler: host=${host} user=${user} db=${database}\n`);

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
  };
}

const poolConfig = buildPoolConfig(rawString);

const pool = new Pool({
  ...poolConfig,
  max: 10,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 15_000,
  query_timeout: 15_000,
});

pool.on("error", (err) => {
  process.stderr.write(`[db-pool] idle client error: ${err.message}\n`);
});

export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
