-- ══════════════════════════════════════════════════════════════
-- 007: Scope games SELECT to invited players only
-- ══════════════════════════════════════════════════════════════

-- Drop the overly-permissive "anyone can read" policy
DROP POLICY IF EXISTS "Anyone can read games" ON public.games;

-- New policy: a user can only see a game if they created it
-- or they are in game_players for that game.
-- The creator trigger (migration 006) guarantees the creator is
-- always in game_players, so the OR is technically redundant but
-- kept for defence-in-depth and clarity.
CREATE POLICY "Users see only their own games"
  ON public.games FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_id = public.games.id
        AND user_id = auth.uid()
    )
  );
