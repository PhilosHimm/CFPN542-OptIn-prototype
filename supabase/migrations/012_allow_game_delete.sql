-- Migration 012: Allow game creator to delete their own games
-- Without this policy, supabase.from("games").delete() is silently
-- blocked by RLS, the client receives no error but 0 rows are removed,
-- and the game reappears on the next fetch.
--
-- Note: "Game creator can delete options" on game_options already exists
-- from a prior migration. Only the games table policy was missing.

-- ── Grant DELETE on games to the creator ─────────────────────────────
CREATE POLICY "Game creator can delete"
  ON public.games FOR DELETE
  USING (auth.uid() = created_by);
