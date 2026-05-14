-- ============================================================
-- ALI Digital Gateway — SQL Proxy RPC Function
-- Run ONCE in: Supabase Dashboard → SQL Editor
-- ============================================================
-- This function allows the app to query the database via HTTP
-- since Replit cannot reach Supabase over TCP/PostgreSQL directly.

CREATE OR REPLACE FUNCTION drizzle_query(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || sql || ') t'
    INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Restrict to service_role only (the app uses SUPABASE_SERVICE_ROLE_KEY)
REVOKE ALL ON FUNCTION drizzle_query(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION drizzle_query(text) TO service_role;

-- Verify it works
SELECT drizzle_query('SELECT COUNT(*) as cnt FROM ali_users');
