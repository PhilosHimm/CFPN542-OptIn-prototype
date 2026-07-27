-- Reconstructed verbatim from supabase_migrations.schema_migrations (project
-- iokxjsvlpqlekptexjxy), version 20260329033118, on 2026-07-27.
-- This is what actually ran in production. Do not edit.

-- ══════════════════════════════════════════════════════════════
-- 006: Fix game logistics — votes, roster, status transitions
-- ══════════════════════════════════════════════════════════════

-- ── 1. Fix votes: add missing DELETE policy ──────────────────
-- Without this, deleteVote() silently fails (RLS blocks all deletes)
CREATE POLICY "Users can delete own votes"
  ON public.votes FOR DELETE
  USING (auth.uid() = user_id);

-- ── 2. Drop restrictive vote-blocking policies ───────────────
-- These RESTRICTIVE policies silently blocked every castVote()
-- call on options whose date < CURRENT_DATE, causing 0 rows
-- in the votes table. Business-logic date checks belong in the
-- app layer, not as silent RLS blockers.
DROP POLICY IF EXISTS block_votes_on_past_options_insert ON public.votes;
DROP POLICY IF EXISTS block_votes_on_past_options_update ON public.votes;

-- ── 3. Auto-add game creator to game_players on INSERT ───────
-- saveGame() only inserts invited players, never the creator.
-- This trigger fixes the empty roster for every new game.
CREATE OR REPLACE FUNCTION public.fn_creator_joins_game()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.game_players (game_id, user_id, status)
  VALUES (NEW.id, NEW.created_by, 'joined')
  ON CONFLICT (game_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_joins_game ON public.games;
CREATE TRIGGER trg_creator_joins_game
  AFTER INSERT ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.fn_creator_joins_game();

-- ── 4. Keep current_players in sync with game_players ────────
CREATE OR REPLACE FUNCTION public.fn_sync_current_players()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_game_id uuid;
BEGIN
  v_game_id := COALESCE(NEW.game_id, OLD.game_id);
  UPDATE public.games
  SET current_players = (
    SELECT COUNT(*) FROM public.game_players
    WHERE game_id = v_game_id AND status <> 'declined'
  ), updated_at = now()
  WHERE id = v_game_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_current_players ON public.game_players;
CREATE TRIGGER trg_sync_current_players
  AFTER INSERT OR UPDATE OR DELETE ON public.game_players
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_current_players();

-- ── 5. SECURITY DEFINER RPC for status auto-transitions ──────
-- The games UPDATE RLS only allows created_by = auth.uid().
-- Any authenticated user can call this function; it runs as the
-- function owner (bypassing RLS) so non-creators can trigger
-- confirmed→completed and proposal→cancelled/auto-confirmed.
CREATE OR REPLACE FUNCTION public.auto_transition_game(p_game_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max_in  bigint;
  v_tie_cnt bigint;
  v_winner  uuid;
BEGIN
  -- confirmed → completed when confirmed option date has passed
  UPDATE public.games g
  SET status = 'completed', updated_at = now()
  WHERE g.id = p_game_id
    AND g.status = 'confirmed'
    AND g.confirmed_option_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.game_options go
      WHERE go.id = g.confirmed_option_id
        AND go.date::date < CURRENT_DATE
    );

  -- proposal → auto-confirm or cancel once voting_deadline has passed
  IF EXISTS (
    SELECT 1 FROM public.games
    WHERE id = p_game_id
      AND status = 'proposal'
      AND voting_deadline < now()
  ) THEN
    -- Count max "in" votes across options (from actual vote rows for accuracy)
    SELECT COALESCE(MAX(cnt), 0) INTO v_max_in
    FROM (
      SELECT COUNT(*) AS cnt
      FROM public.votes v
      JOIN public.game_options go ON go.id = v.option_id
      WHERE go.game_id = p_game_id AND v.value = 'in'
      GROUP BY v.option_id
    ) sub;

    IF v_max_in = 0 THEN
      -- No attendees → cancel
      UPDATE public.games SET
        status = 'cancelled',
        cancellation_reason = 'Voting closed with no attendees',
        updated_at = now()
      WHERE id = p_game_id AND status = 'proposal';

    ELSE
      -- Check for a unique winner
      SELECT COUNT(*) INTO v_tie_cnt
      FROM (
        SELECT v.option_id
        FROM public.votes v
        JOIN public.game_options go ON go.id = v.option_id
        WHERE go.game_id = p_game_id AND v.value = 'in'
        GROUP BY v.option_id
        HAVING COUNT(*) = v_max_in
      ) sub;

      IF v_tie_cnt = 1 THEN
        SELECT v.option_id INTO v_winner
        FROM public.votes v
        JOIN public.game_options go ON go.id = v.option_id
        WHERE go.game_id = p_game_id AND v.value = 'in'
        GROUP BY v.option_id
        HAVING COUNT(*) = v_max_in;

        UPDATE public.games SET
          status = 'confirmed',
          confirmed_option_id = v_winner,
          updated_at = now()
        WHERE id = p_game_id AND status = 'proposal';
      END IF;
      -- Tied: leave as proposal so host can break tie via UI
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_transition_game(uuid) TO authenticated;

-- ── 6. Allow users to leave games (DELETE on own row) ────────
CREATE POLICY "Users can leave games"
  ON public.game_players FOR DELETE
  USING (user_id = auth.uid());

-- ── 7. Backfill: add creator to game_players for existing games
INSERT INTO public.game_players (game_id, user_id, status)
SELECT g.id, g.created_by, 'joined'
FROM public.games g
WHERE g.created_by IS NOT NULL
ON CONFLICT (game_id, user_id) DO NOTHING;

-- ── 8. Sync current_players for existing games ───────────────
UPDATE public.games SET current_players = (
  SELECT COUNT(*) FROM public.game_players
  WHERE game_id = public.games.id AND status <> 'declined'
);
