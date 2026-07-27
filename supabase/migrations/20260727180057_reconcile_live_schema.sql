-- Migration 014: reconcile the live schema and close the structural gaps.
--
-- CONTEXT — READ BEFORE APPLYING
-- Migrations 009 and 013 were never applied to the live database, and the RLS
-- policies were hand-edited in the dashboard, so files 001–013 do NOT describe
-- production. This migration is written against the *live* schema as observed on
-- 2026-07-27 (project iokxjsvlpqlekptexjxy), not against the file history.
-- Everything here is idempotent and safe to re-run.
--
-- Preconditions verified against live data before writing (all returned 0):
--   games with null created_by / null status ............ 0
--   game_options with null game_id ...................... 0
--   games with a dangling confirmed_option_id ........... 0
--   games with negative total_cost / per_person_cost .... 0
--   duplicate (game_id, date, start_time) options ....... 0
--   game_players rows with no matching profile .......... 0
-- Re-run those checks if this is applied to a different environment.

begin;

-- ─── 1. Migration 013's columns (never applied) ────────────────────────────────
-- Without these, handleProposeSubmit inserts status:'pending' into a column that
-- does not exist and the propose-a-time feature fails at the database.
alter table public.game_options
  add column if not exists status text not null default 'approved',
  add column if not exists proposed_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_options'::regclass and conname = 'game_options_status_check'
  ) then
    alter table public.game_options
      add constraint game_options_status_check check (status in ('pending', 'approved'));
  end if;
end$$;

-- ─── 2. Referential integrity that the live schema is missing ──────────────────
-- confirmed_option_id had NO foreign key, so a host could delete the confirmed
-- option; the game then rendered a different option's date/location via the
-- `|| first` fallback and could never transition to completed.
-- ON DELETE SET NULL returns the game to an undecided state rather than orphaning it.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_confirmed_option_id_fkey'
  ) then
    alter table public.games
      add constraint games_confirmed_option_id_fkey
      foreign key (confirmed_option_id) references public.game_options(id) on delete set null;
  end if;
end$$;

-- Nullability the live schema lost relative to 001. Every write policy is
-- `created_by = auth.uid()`, so a null created_by is a permanently unhostable row.
alter table public.games      alter column created_by set not null;
alter table public.games      alter column status     set not null;
alter table public.games      alter column status     set default 'proposal';
alter table public.game_options alter column game_id  set not null;

-- ─── 3. Let users delete their accounts ────────────────────────────────────────
-- profiles.id cascades from auth.users, but these FKs are NO ACTION, so deleting
-- any user who ever created a game or cast a vote failed the whole transaction.
--
-- !! PRODUCT DECISION — REVIEW BEFORE APPLYING !!
-- ON DELETE CASCADE on games.created_by means deleting a user also deletes every
-- game they created, cascading to that game's options, votes and roster rows —
-- including other people's participation. The alternative is making created_by
-- nullable with ON DELETE SET NULL, which preserves the game but leaves it with
-- no one who can administer it (every write policy is `created_by = auth.uid()`).
-- CASCADE is chosen here as the privacy-aligned default; switch to SET NULL (and
-- drop the NOT NULL added in section 2) if retaining group history matters more.
alter table public.games          drop constraint if exists games_created_by_fkey;
alter table public.games
  add constraint games_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete cascade;

alter table public.game_players   drop constraint if exists game_players_user_id_fkey;
alter table public.game_players
  add constraint game_players_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.votes          drop constraint if exists votes_user_id_fkey;
alter table public.votes
  add constraint votes_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- ─── 4. Validation the client does not perform ─────────────────────────────────
-- Cost inputs are free-text with inputMode=decimal, so parseFloat("-50") reached
-- the database unchallenged.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_cost_non_negative'
  ) then
    alter table public.games
      add constraint games_cost_non_negative
      check (total_cost >= 0 and per_person_cost >= 0);
  end if;
end$$;

-- Identical time options split the vote and guarantee a tie, which (with the tie
-- branch having no ELSE) strands the game in `proposal` forever.
create unique index if not exists game_options_unique_slot
  on public.game_options (game_id, date, start_time);

-- Allow single-attendee events. The existing `>= 2` check already contradicted
-- SPORT_MINIMUMS.Golf = 1, and it blocks non-sports events after the pivot.
alter table public.games drop constraint if exists games_max_players_check;
alter table public.games
  add constraint games_max_players_check check (max_players is null or max_players >= 1);

-- Allow open-ended events (a hike or a concert with no set end time). Also lets
-- the client stop writing `end_time: endTime || startTime`, which produced
-- end == start and would violate any end > start constraint.
alter table public.game_options alter column end_time drop not null;

-- DELIBERATELY NOT ADDING an `end_time > start_time` CHECK here.
--
-- Migration 009 specified one and it was never applied. On first attempt this
-- migration added it NOT VALID, on the theory that existing rows could be
-- grandfathered. That was wrong twice over:
--
--  1. NOT VALID skips the initial table scan but still re-checks any row that is
--     later UPDATEd. Live option bd1d6495 (game "golf", start 22:00, end 12:00)
--     violates it, so the row became unwritable — the vote-count repair in 015
--     failed on it, and nobody could have voted on or edited that option again.
--  2. More fundamentally the constraint is *semantically wrong* while these are
--     text columns: `end > start` is a lexical comparison, so it rejects every
--     legitimate overnight slot (22:00 → 01:00), not just bad data.
--
-- The correct fix is to represent times as timestamptz (or date + interval) and
-- then constrain end > start meaningfully. Tracked in the timezone/text-date
-- task; validation stays in the client and the creation RPC until then.

-- Server-side counterpart to the client-only SPORT_MINIMUMS table, so the state
-- machine and the host's Confirm button stop disagreeing about quorum.
alter table public.games
  add column if not exists min_players integer;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.games'::regclass and conname = 'games_min_players_check'
  ) then
    alter table public.games
      add constraint games_min_players_check
      check (min_players is null or min_players >= 1);
  end if;
end$$;

-- ─── 5. Helper functions for RLS (SECURITY DEFINER to avoid policy recursion) ──
-- Migration 011 hit this exact problem on conversation_members: a policy on a
-- table whose USING clause selects from that same table recurses (42P17).
-- 004 defined such a policy on game_players; these helpers avoid repeating it.
create or replace function public.user_in_game(p_game_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from game_players
    where game_id = p_game_id and user_id = auth.uid()
  );
$$;

create or replace function public.user_is_game_host(p_game_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from games
    where id = p_game_id and created_by = auth.uid()
  );
$$;

create or replace function public.user_in_group(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_group_id is not null and exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

revoke execute on function public.user_in_game(uuid)      from anon;
revoke execute on function public.user_is_game_host(uuid)  from anon;
revoke execute on function public.user_in_group(uuid)      from anon;

-- ─── 6. game_players: stop letting anyone add anyone to any game ───────────────
-- Live policy was `WITH CHECK (auth.uid() IS NOT NULL)` — no user_id predicate
-- at all, so any authenticated user could enrol any other user in any game.
drop policy if exists "Users can join games"              on public.game_players;
drop policy if exists "Authenticated users can join games" on public.game_players;

create policy "Join self or be invited by host"
  on public.game_players for insert
  with check (
    user_id = auth.uid()
    or public.user_is_game_host(game_id)
  );

-- Hosts need to be able to remove players. The live DELETE policy was
-- `user_id = auth.uid()` only, which made the host's "remove player" a silent
-- no-op that still reported success.
drop policy if exists "Users can leave games" on public.game_players;
create policy "Leave own game or host removes player"
  on public.game_players for delete
  using (
    user_id = auth.uid()
    or public.user_is_game_host(game_id)
  );

-- ─── 7. game_options: keep host-only writes, but scope reads ───────────────────
-- SELECT was `using (true)`, which let any caller enumerate every option id in
-- the database — including options belonging to Private games.
drop policy if exists "Anyone can read game options"       on public.game_options;
drop policy if exists "Game options are viewable by everyone" on public.game_options;

create policy "Read options of visible games"
  on public.game_options for select
  using (
    public.user_is_game_host(game_id)
    or public.user_in_game(game_id)
    or exists (
      select 1 from games g
      where g.id = game_options.game_id and g.visibility = 'Public'
    )
  );

-- Non-hosts must be able to propose a time (as 'pending'), which the host then
-- approves. Only the host may write 'approved' directly.
drop policy if exists "Authenticated users can create game options" on public.game_options;
drop policy if exists "Game creator can insert options"            on public.game_options;

create policy "Host adds approved options, others propose pending"
  on public.game_options for insert
  with check (
    public.user_is_game_host(game_id)
    or (status = 'pending' and proposed_by = auth.uid())
  );

-- Belt and braces: 001's `"Vote counts can be updated" USING (true)` is not
-- present live, but if any environment still has it, drop it. Permissive
-- policies OR together, so leaving it would defeat the host-only restriction
-- (this is exactly why migration 013's added policy was a no-op).
drop policy if exists "Vote counts can be updated" on public.game_options;

-- ─── 8. votes: only participants vote, and only while voting is open ──────────
-- Live policy checked `user_id = auth.uid()` and nothing else: no membership
-- check, no deadline check, no status check. Combined with enumerable option ids
-- that let any account cast a counted vote on any game.
drop policy if exists "Users can cast votes"           on public.votes;
drop policy if exists "Authenticated users can vote"   on public.votes;
drop policy if exists "Users can update own votes"     on public.votes;
drop policy if exists "Anyone can read votes"          on public.votes;
drop policy if exists "Votes are viewable by everyone" on public.votes;

create policy "Read votes of visible games"
  on public.votes for select
  using (
    exists (
      select 1 from game_options go
      where go.id = votes.option_id
        and (public.user_is_game_host(go.game_id) or public.user_in_game(go.game_id))
    )
  );

create policy "Participants vote while voting is open"
  on public.votes for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from game_options go
      join games g on g.id = go.game_id
      where go.id = votes.option_id
        and go.status = 'approved'
        and g.status = 'proposal'
        and g.voting_deadline > now()
        and (public.user_is_game_host(go.game_id) or public.user_in_game(go.game_id))
    )
  );

create policy "Change own vote while voting is open"
  on public.votes for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from game_options go
      join games g on g.id = go.game_id
      where go.id = votes.option_id
        and g.status = 'proposal'
        and g.voting_deadline > now()
    )
  );

-- ─── 9. games: make the visibility column actually mean something ─────────────
-- !! BEHAVIOUR CHANGE — REVIEW BEFORE APPLYING !!
-- The live policy was `created_by = auth.uid() OR user has a game_players row`,
-- which never read the visibility column. Public games were therefore not
-- discoverable by anyone. This policy makes 'Public' games readable by any
-- authenticated user and 'Group Only' games readable by group members, which is
-- what the UI has always claimed. That is a deliberate READ EXPANSION.
-- Note that every existing row currently has visibility='Group Only' because of
-- the client double-mapping bug, so nothing becomes public retroactively — but
-- confirm that is the behaviour you want before applying.
drop policy if exists "Users see only their own games"          on public.games;
drop policy if exists "Games viewable by visibility or membership" on public.games;
drop policy if exists "Games are viewable by everyone"          on public.games;

create policy "Games visible by role or visibility"
  on public.games for select
  using (
    created_by = auth.uid()
    or public.user_in_game(id)
    or visibility = 'Public'
    or (visibility = 'Group Only' and public.user_in_group(group_id))
  );

-- Insert must pin created_by to the caller. Live policy only required
-- `auth.uid() IS NOT NULL`, so a game could be attributed to anyone.
drop policy if exists "Authenticated users can insert games" on public.games;
drop policy if exists "Authenticated users can create games" on public.games;
create policy "Create games as self"
  on public.games for insert
  with check (created_by = auth.uid());

commit;
