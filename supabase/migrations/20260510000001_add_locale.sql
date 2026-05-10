-- supabase/migrations/20260510000001_add_locale.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale text DEFAULT 'ru';
