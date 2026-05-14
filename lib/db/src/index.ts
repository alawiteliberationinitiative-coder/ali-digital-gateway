import { drizzle } from "drizzle-orm/pg-proxy";
import * as schema from "./schema/index.js";

export { eq, and, or, gte, lt, isNull, sql, desc, count } from "drizzle-orm";

const supabaseUrl = (process.env.SUPABASE_URL ?? "")
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
  );
}

/**
 * Execute SQL via Supabase's drizzle_query RPC function.
 * The function must be created first — run scripts/supabase-rpc.sql in SQL Editor.
 *
 * Drizzle sends parameterized queries like: SELECT ... WHERE id = $1, params: [42]
 * We inline the parameters into the SQL string before sending (safe because
 * drizzle itself constructs these queries from typed ORM operations, never from
 * raw user strings).
 */
async function remoteQuery(
  rawSql: string,
  params: unknown[],
  _method: "all" | "execute",
) {
  // Inline parameters into SQL to avoid needing EXECUTE...USING in the RPC
  // Drizzle uses $1, $2, ... placeholders
  let inlinedSql = rawSql;
  for (let i = params.length; i >= 1; i--) {
    const val = params[i - 1];
    let literal: string;
    if (val === null || val === undefined) {
      literal = "NULL";
    } else if (typeof val === "number") {
      literal = String(val);
    } else if (typeof val === "boolean") {
      literal = val ? "TRUE" : "FALSE";
    } else {
      // String — escape single quotes
      literal = `'${String(val).replace(/'/g, "''")}'`;
    }
    inlinedSql = inlinedSql.replace(new RegExp(`\\$${i}`, "g"), literal);
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/drizzle_query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ sql: inlinedSql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`drizzle_query RPC failed (${res.status}): ${text}`);
  }

  const rows = (await res.json()) as Record<string, unknown>[] | null;
  return { rows: Array.isArray(rows) ? rows : [] };
}

export const db = drizzle(remoteQuery, { schema });

export * from "./schema/index.js";
