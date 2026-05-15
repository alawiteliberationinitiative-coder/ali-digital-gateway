-- Migration: ali_user_blocks table
-- Run this once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ali_user_blocks (
  id                   SERIAL PRIMARY KEY,
  blocker_telegram_id  TEXT NOT NULL,
  blocked_telegram_id  TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_telegram_id, blocked_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_ali_user_blocks_blocker
  ON ali_user_blocks(blocker_telegram_id);

CREATE INDEX IF NOT EXISTS idx_ali_user_blocks_blocked
  ON ali_user_blocks(blocked_telegram_id);
