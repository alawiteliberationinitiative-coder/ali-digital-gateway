-- ============================================================
-- ALI Digital Gateway — SQL Proxy RPC Functions
-- Run in: Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/fgvdtxxggpiukhllntfd/sql
-- ============================================================
-- Required because Replit cannot reach Supabase over TCP/PostgreSQL.
-- The app uses these functions to run all DB queries via HTTPS.

-- ── 1. drizzle_query: SELECT proxy (all ORM reads/writes) ─────────────────
CREATE OR REPLACE FUNCTION drizzle_query(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- json_agg (not jsonb_agg) preserves SELECT column order
  EXECUTE 'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (' || sql || ') t'
    INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION drizzle_query(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION drizzle_query(text) TO service_role;

-- ── 2. exec_ddl: DDL execution (CREATE TABLE / ALTER / DROP) ─────────────
--    Called by the API server on startup to run migrations automatically.
CREATE OR REPLACE FUNCTION exec_ddl(ddl text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE ddl;
END;
$$;

REVOKE ALL ON FUNCTION exec_ddl(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_ddl(text) TO service_role;

-- ── Verify ────────────────────────────────────────────────────────────────
SELECT drizzle_query('SELECT COUNT(*) as cnt, SUM(loyalty_points) as pts FROM ali_users');
