-- Migration 012 (second of two files numbered 012 — see also
-- 012_allow_game_delete.sql): make max_players optional.
--
-- HISTORY / WHY THIS FILE WAS REWRITTEN
-- This file previously consisted of a single line in which the statement
-- separators were literal backslash-n character pairs rather than newlines:
--
--   ALTER TABLE ... DROP CONSTRAINT ...;\nALTER TABLE ... DROP NOT NULL;\n...
--
-- Postgres terminates the first statement at its semicolon and then fails on the
-- backslash, so at most the leading DROP CONSTRAINT could ever have executed.
-- The live database nonetheless has max_players nullable with the
-- `>= 2 OR IS NULL` constraint present, so the intent reached production by some
-- other route (a hand-run statement in the dashboard, most likely).
--
-- Rewritten with real newlines and made idempotent so the file is replayable and
-- honest about the live state. Migration 014 subsequently relaxes the check to
-- `>= 1` to allow single-attendee events.

alter table public.games drop constraint if exists games_max_players_check;

alter table public.games alter column max_players drop not null;

alter table public.games
  add constraint games_max_players_check
  check (max_players >= 2 or max_players is null);
