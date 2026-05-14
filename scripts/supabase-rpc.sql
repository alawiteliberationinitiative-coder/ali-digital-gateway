-- ============================================================
-- ALI Digital Gateway — SQL Proxy RPC Function
-- Run ONCE in: Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/fgvdtxxggpiukhllntfd/sql
-- ============================================================
-- Required because Replit cannot reach Supabase over TCP/PostgreSQL.
-- The app uses this function to run all DB queries via HTTPS.

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

-- Verify
SELECT drizzle_query('SELECT COUNT(*) as cnt, SUM(loyalty_points) as pts FROM ali_users');
