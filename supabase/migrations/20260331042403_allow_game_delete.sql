-- Reconstructed verbatim from supabase_migrations.schema_migrations (project
-- iokxjsvlpqlekptexjxy), version 20260331042403, on 2026-07-27.
-- This is what actually ran in production. Do not edit.

-- Allow game creator to delete their own games.
--
-- Was internally commented "Migration 012" — the same human-readable number
-- as 012_optional_max_players.sql (applied ~21 minutes later, per its own
-- timestamp 20260331044500 vs this file's 20260331042403). Two unrelated
-- pieces of work were independently labeled "012" by whoever wrote them;
-- Postgres/Supabase always replays by filename timestamp regardless, so this
-- was never a functional bug — see docs/BACKLOG.md item #52. Renamed the
-- comment, not the file (this is a reconstructed, already-applied,
-- ledger-tracked migration — its SQL is intentionally left untouched).
CREATE POLICY "Game creator can delete"
  ON public.games FOR DELETE
  USING (auth.uid() = created_by);
