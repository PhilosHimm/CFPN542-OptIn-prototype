-- Add status and proposed_by to game_options so non-host proposals
-- require host approval before appearing in the voting list.

ALTER TABLE game_options
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved')),
  ADD COLUMN IF NOT EXISTS proposed_by uuid REFERENCES profiles(id);

-- Allow the game creator (host) to update any option on their game,
-- including approving pending proposals by changing status.
-- (If a broader UPDATE policy already exists this is a no-op in practice;
--  we add it explicitly so the intent is clear.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'game_options'
      AND policyname = 'host_can_update_game_options'
  ) THEN
    CREATE POLICY host_can_update_game_options ON game_options
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM games
          WHERE games.id = game_options.game_id
            AND games.created_by = auth.uid()
        )
      );
  END IF;
END$$;
