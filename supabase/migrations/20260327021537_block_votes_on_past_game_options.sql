-- Reconstructed verbatim from supabase_migrations.schema_migrations (project
-- iokxjsvlpqlekptexjxy), version 20260327021537, on 2026-07-27.
-- This is what actually ran in production. Do not edit.
--
-- HISTORICAL NOTE: this version has no corresponding numbered file in this
-- repo's history -- it was applied directly, between the RLS migration above
-- and 006 below, and was never given a "NNN_name.sql" counterpart. The two
-- policies it creates are DROPped by migration 006
-- (20260329033118_006_fix_game_logistics.sql); kept here only so the local
-- directory matches the remote ledger version-for-version.

-- Block inserting votes for game options whose date has already passed
CREATE POLICY "block_votes_on_past_options_insert"
ON votes
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM game_options
    WHERE game_options.id = option_id
    AND game_options.date::date >= CURRENT_DATE
  )
);

-- Block updating votes for game options whose date has already passed
CREATE POLICY "block_votes_on_past_options_update"
ON votes
AS RESTRICTIVE
FOR UPDATE
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM game_options
    WHERE game_options.id = option_id
    AND game_options.date::date >= CURRENT_DATE
  )
);
