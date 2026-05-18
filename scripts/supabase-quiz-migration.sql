-- ============================================================
-- ALI Digital Gateway — Complete Quiz Setup
-- Run in: Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/fgvdtxxggpiukhllntfd/sql
--
-- STEP 1: Run this file FIRST to enable auto-migration.
-- STEP 2: Restart the API server workflow.
-- The API server will then create the quiz_progress table automatically.
-- ============================================================

-- ── Add exec_ddl function (allows API to run migrations automatically) ────
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

-- ── Create quiz_progress table (also done automatically after above step) ──
CREATE TABLE IF NOT EXISTS quiz_progress (
  id                   SERIAL PRIMARY KEY,
  telegram_id          TEXT NOT NULL UNIQUE,
  current_stage        INTEGER NOT NULL DEFAULT 1,
  stage_correct_count  INTEGER NOT NULL DEFAULT 0,
  total_correct        INTEGER NOT NULL DEFAULT 0,
  total_answered       INTEGER NOT NULL DEFAULT 0,
  accuracy_score       INTEGER NOT NULL DEFAULT 0,
  question_pool        JSONB,
  pool_index           INTEGER NOT NULL DEFAULT 0,
  retry_queue          JSONB,
  correct_ids          JSONB,
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_progress_telegram_id_idx ON quiz_progress(telegram_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_quiz_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quiz_progress_updated_at_trigger ON quiz_progress;
CREATE TRIGGER quiz_progress_updated_at_trigger
  BEFORE UPDATE ON quiz_progress
  FOR EACH ROW EXECUTE FUNCTION update_quiz_progress_updated_at();

-- ── Verify ────────────────────────────────────────────────────────────────
SELECT 'quiz_progress table ready' as status, COUNT(*) as rows FROM quiz_progress;
