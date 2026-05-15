-- Migration: civic_role + messaging system
-- Run this once in the Supabase SQL Editor

ALTER TABLE ali_users ADD COLUMN IF NOT EXISTS civic_role text;

CREATE TABLE IF NOT EXISTS ali_messages (
  id bigserial PRIMARY KEY,
  from_telegram_id text NOT NULL,
  to_telegram_id   text NOT NULL,
  content          text NOT NULL CHECK (length(content) <= 1000),
  created_at       timestamptz NOT NULL DEFAULT now(),
  read_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ali_messages_to   ON ali_messages(to_telegram_id,   created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ali_messages_from ON ali_messages(from_telegram_id, created_at DESC);
