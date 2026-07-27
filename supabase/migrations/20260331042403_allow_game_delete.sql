-- Reconstructed verbatim from supabase_migrations.schema_migrations (project
-- iokxjsvlpqlekptexjxy), version 20260331042403, on 2026-07-27.
-- This is what actually ran in production. Do not edit.

-- Migration 012: Allow game creator to delete their own games
CREATE POLICY "Game creator can delete"
  ON public.games FOR DELETE
  USING (auth.uid() = created_by);
