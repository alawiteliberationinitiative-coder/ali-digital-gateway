-- ── P2P Calls Migration ──────────────────────────────────────────────────────
-- Run this once in the Supabase SQL Editor to enable P2P voice calls.

CREATE TABLE IF NOT EXISTS ali_presence (
  telegram_id TEXT PRIMARY KEY,
  context     TEXT NOT NULL DEFAULT 'app',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ali_calls (
  id          SERIAL PRIMARY KEY,
  caller_id   TEXT NOT NULL,
  callee_id   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ringing',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ali_call_signals (
  id        SERIAL PRIMARY KEY,
  call_id   TEXT NOT NULL,
  from_id   TEXT NOT NULL,
  to_id     TEXT NOT NULL,
  type      TEXT NOT NULL,
  payload   TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clean up stale signals older than 10 minutes (optional scheduled job)
CREATE INDEX IF NOT EXISTS ali_call_signals_to_processed_idx
  ON ali_call_signals (to_id, processed)
  WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS ali_presence_updated_idx
  ON ali_presence (updated_at);

CREATE INDEX IF NOT EXISTS ali_calls_callee_idx
  ON ali_calls (callee_id, status);
