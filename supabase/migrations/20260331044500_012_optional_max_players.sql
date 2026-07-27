-- Reconstructed verbatim from supabase_migrations.schema_migrations (project
-- iokxjsvlpqlekptexjxy), version 20260331044500, on 2026-07-27.
-- This is what actually ran in production. Do not edit.
--
-- NOTE: the copy of this migration previously committed to this repo as
-- 012_optional_max_players.sql was a single line containing literal `\n`
-- character pairs instead of newlines, and could never have parsed. The text
-- below is what the remote ledger actually recorded as applied — three
-- statements with real newlines — recovered directly from
-- supabase_migrations.schema_migrations rather than from the broken file.
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_max_players_check;
ALTER TABLE public.games ALTER COLUMN max_players DROP NOT NULL;
ALTER TABLE public.games ADD CONSTRAINT games_max_players_check CHECK (max_players >= 2 OR max_players IS NULL);
