-- Migration: Add view_count column to ali_articles
-- Run ONCE in: Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/fgvdtxxggpiukhllntfd/sql
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS)

ALTER TABLE ali_articles
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Verify
SELECT column_name, data_type, column_default
FROM   information_schema.columns
WHERE  table_name = 'ali_articles'
ORDER  BY ordinal_position;
