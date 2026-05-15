-- ALI Digital Gateway — Add photo_url column to ali_users
-- Run this in: Supabase Dashboard → SQL Editor
ALTER TABLE ali_users ADD COLUMN IF NOT EXISTS photo_url TEXT;
