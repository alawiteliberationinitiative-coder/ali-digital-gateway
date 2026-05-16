-- Migration: Add media_url column to ali_articles
-- Run this once in your Supabase SQL Editor
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE ali_articles
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Verify
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_name = 'ali_articles'
ORDER  BY ordinal_position;
