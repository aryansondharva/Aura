-- Run this in Supabase SQL Editor to add the missing column
ALTER TABLE topics ADD COLUMN IF NOT EXISTS archive_status TEXT DEFAULT 'not_archived';
