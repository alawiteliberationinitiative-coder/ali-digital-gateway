-- Migration: dual-store media fallback
-- Run once in Supabase SQL Editor

ALTER TABLE ali_articles
  ADD COLUMN IF NOT EXISTS supabase_url      TEXT,
  ADD COLUMN IF NOT EXISTS telegram_file_id  TEXT;
