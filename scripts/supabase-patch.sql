-- ============================================================
-- ALI Digital Gateway — Supabase Schema Patch
-- Run this in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS)
-- Generated: 2026-05-17
-- ============================================================

-- ── 1. ali_users — missing columns ───────────────────────────────────────────

ALTER TABLE ali_users
  ADD COLUMN IF NOT EXISTS civic_role          TEXT,
  ADD COLUMN IF NOT EXISTS photo_url           TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_article_id INTEGER;

-- ── 2. ali_articles — missing columns ────────────────────────────────────────

ALTER TABLE ali_articles
  ADD COLUMN IF NOT EXISTS media_url        TEXT,
  ADD COLUMN IF NOT EXISTS supabase_url     TEXT,
  ADD COLUMN IF NOT EXISTS telegram_file_id TEXT,
  ADD COLUMN IF NOT EXISTS view_count       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count      INTEGER NOT NULL DEFAULT 0;

-- ── 3. article_comments — missing updated_at column ──────────────────────────

ALTER TABLE article_comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── 4. comment_likes — new table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comment_likes (
  id          SERIAL PRIMARY KEY,
  comment_id  INTEGER NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
  telegram_id TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);

-- ── 5. ali_user_blocks — new table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ali_user_blocks (
  id                  SERIAL PRIMARY KEY,
  blocker_telegram_id TEXT NOT NULL,
  blocked_telegram_id TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_telegram_id, blocked_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_ali_user_blocks_blocker ON ali_user_blocks(blocker_telegram_id);

-- ── 6. Update drizzle_query RPC to support parameterised queries ──────────────
-- This replaces the old version (if present) so it handles both
-- plain queries and queries with $1/$2/… placeholders.

CREATE OR REPLACE FUNCTION drizzle_query(query text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  IF jsonb_array_length(params) > 0 THEN
    EXECUTE format(
      'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json)::jsonb FROM (%s) t',
      query
    )
    USING params
    INTO result;
  ELSE
    EXECUTE format(
      'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json)::jsonb FROM (%s) t',
      query
    )
    INTO result;
  END IF;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION drizzle_query(text, jsonb) FROM PUBLIC;

-- ── 7. Indexes for performance ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ali_users_telegram_id    ON ali_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ali_articles_created_at  ON ali_articles(created_at);

-- ── Done ─────────────────────────────────────────────────────────────────────
-- After running this patch:
--   • last_seen_article_id  → progress save/restore works
--   • view/download/share counts → counters persist
--   • comment_likes         → liking comments works
--   • ali_user_blocks       → blocking users works
--   • updated_at on comments → editing comments works correctly
