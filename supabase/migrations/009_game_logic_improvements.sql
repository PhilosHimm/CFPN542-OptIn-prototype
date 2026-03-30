-- ══════════════════════════════════════════════════════════════
-- 009: Game logic improvements
-- ══════════════════════════════════════════════════════════════

-- ── 1. Atomic Vote Count Trigger ─────────────────────────────
-- Fixes race conditions when counting votes manually from the client
CREATE OR REPLACE FUNCTION public.fn_sync_vote_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_option_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_option_id := OLD.option_id;
  ELSE
    v_option_id := NEW.option_id;
  END IF;

  UPDATE public.game_options
  SET 
    in_votes = (SELECT COUNT(*) FROM public.votes WHERE option_id = v_option_id AND value = 'in'),
    maybe_votes = (SELECT COUNT(*) FROM public.votes WHERE option_id = v_option_id AND value = 'maybe'),
    out_votes = (SELECT COUNT(*) FROM public.votes WHERE option_id = v_option_id AND value = 'out')
  WHERE id = v_option_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vote_counts ON public.votes;
CREATE TRIGGER trg_sync_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_vote_counts();

-- ── 2. Add Database Constraints ──────────────────────────────
-- Only add constraints if existing data allows it.
-- We use DO to catch exceptions and prevent breaking data.

DO $$
BEGIN
  -- Ensure end time is strictly after start time
  ALTER TABLE public.game_options ADD CONSTRAINT game_options_time_check CHECK (end_time > start_time);
EXCEPTION
  WHEN duplicate_object OR check_violation THEN
    RAISE NOTICE 'Constraint game_options_time_check already exists or data violates it.';
END $$;

DO $$
BEGIN
  -- Ensure max players is at least 2
  ALTER TABLE public.games ADD CONSTRAINT games_max_players_check CHECK (max_players >= 2);
EXCEPTION
  WHEN duplicate_object OR check_violation THEN
    RAISE NOTICE 'Constraint games_max_players_check already exists or data violates it.';
END $$;

-- ── 3. Batch auto-transition RPC ─────────────────────────────
-- Allows transitioning all games whose deadlines have passed
CREATE OR REPLACE FUNCTION public.auto_transition_all_games()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT id FROM public.games 
    WHERE (status = 'proposal' AND voting_deadline < now())
       OR (status = 'confirmed' AND confirmed_option_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.game_options 
            WHERE id = confirmed_option_id AND date::date < CURRENT_DATE
          ))
  LOOP
    PERFORM public.auto_transition_game(rec.id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_transition_all_games() TO authenticated;

-- ── 4. Fix Games Visibility RLS ──────────────────────────────
-- 007 scoped it down too much, making Public and Group Only useless
-- if the user wasn't strictly in game_players.
DROP POLICY IF EXISTS "Users see only their own games" ON public.games;

CREATE POLICY "Games visibility based on type"
  ON public.games FOR SELECT
  USING (
    visibility = 'Public'
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_id = public.games.id
        AND user_id = auth.uid()
    )
    OR (
      visibility = 'Group Only'
      AND EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = public.games.group_id
          AND user_id = auth.uid()
      )
    )
  );
