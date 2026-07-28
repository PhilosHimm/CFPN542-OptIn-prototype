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
--
-- The `DROP CONSTRAINT IF EXISTS` below reads as if it depends on archived
-- migration 009 (which first created `games_max_players_check`), but the
-- `IF EXISTS` makes it safe regardless of whether 009 ever ran — see
-- docs/BACKLOG.md item #52. Not a functional bug, just why this file looks
-- like it assumes something that isn't in the ledger-tracked history.
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_max_players_check;
ALTER TABLE public.games ALTER COLUMN max_players DROP NOT NULL;
ALTER TABLE public.games ADD CONSTRAINT games_max_players_check CHECK (max_players >= 2 OR max_players IS NULL);
