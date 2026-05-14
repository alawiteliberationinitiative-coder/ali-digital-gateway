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

/** Inline $1, $2, ... placeholders — drizzle constructs these from typed ORM calls, never raw user input. */
function inlineParams(rawSql: string, params: unknown[]): string {
  let out = rawSql;
  for (let i = params.length; i >= 1; i--) {
    const val = params[i - 1];
    let lit: string;
    if (val === null || val === undefined) {
      lit = "NULL";
    } else if (typeof val === "number") {
      lit = String(val);
    } else if (typeof val === "boolean") {
      lit = val ? "TRUE" : "FALSE";
    } else {
      lit = `'${String(val).replace(/'/g, "''")}'`;
    }
    out = out.replace(new RegExp(`\\$${i}(?!\\d)`, "g"), lit);
  }
  return out;
}

/**
 * drizzle pg-proxy expects: { rows: unknown[][] }
 * Our drizzle_query RPC uses json_agg which preserves SELECT column order,
 * so Object.keys() gives the correct positional order.
 */
function objectsToArrays(rows: Record<string, unknown>[]): unknown[][] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return rows.map((row) => keys.map((k) => row[k] ?? null));
}

async function remoteQuery(
  rawSql: string,
  params: unknown[],
  _method: "all" | "execute",
): Promise<{ rows: unknown[][] }> {
  const inlinedSql = inlineParams(rawSql, params);

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

  const data = (await res.json()) as Record<string, unknown>[] | null;
  const objects = Array.isArray(data) ? data : [];
  return { rows: objectsToArrays(objects) };
}

export const db = drizzle(remoteQuery, { schema });

export * from "./schema/index.js";
