-- ============================================================
-- ALI Digital Gateway — Quiz Progress Table Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

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

CREATE TRIGGER IF NOT EXISTS quiz_progress_updated_at_trigger
  BEFORE UPDATE ON quiz_progress
  FOR EACH ROW EXECUTE FUNCTION update_quiz_progress_updated_at();
