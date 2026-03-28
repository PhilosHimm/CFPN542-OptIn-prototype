-- Migration 004: RLS policy improvements
-- Tightens overly-permissive USING (true) policies on games and game_players
-- so they reference auth.uid() rather than being publicly readable by everyone.

-- ─── games: scope SELECT by visibility and membership ──────────────────────────
-- Old policy allowed anyone (even unauthenticated) to read every game row.
-- New policy:
--   • Public games are readable by everyone (respects the visibility field)
--   • Non-public games are only readable by the creator or an invited/joined player

drop policy if exists "Games are viewable by everyone" on games;

create policy "Games viewable by visibility or membership"
  on games for select using (
    -- Public games are open to all (including unauthenticated browse)
    visibility = 'Public'
    -- Non-public: only the creator or an existing game_player can read
    or auth.uid() = created_by
    or exists (
      select 1 from game_players
      where game_players.game_id = games.id
        and game_players.user_id = auth.uid()
    )
  );

-- ─── game_players: scope SELECT to co-members only ────────────────────────────
-- Old policy allowed anyone to read the full player roster of any game.
-- New policy: a row is readable only if the requesting user is also a player
-- in the same game (i.e., they share game membership).

drop policy if exists "Game players are viewable by everyone" on game_players;

create policy "Game players viewable by co-members"
  on game_players for select using (
    exists (
      select 1 from game_players gp
      where gp.game_id = game_players.game_id
        and gp.user_id = auth.uid()
    )
  );
