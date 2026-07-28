-- Migration 020: restrict anonymous (anon) access — item #57.
--
-- CONTEXT
-- All 31 RLS policies below are `TO public` on the live database, which in
-- Supabase means both `anon` and `authenticated` — so an unauthenticated
-- caller can hit the Data API directly (no app, no session) and, for the four
-- `USING (true)` SELECT policies especially, enumerate every user's name,
-- email, group membership, and game roster. The app itself never queries any
-- of these tables before a Supabase session exists (verified: every
-- `supabase.from(...)` call in src/ is gated behind the auth layer or demo
-- mode, which never touches Supabase at all), so this has zero functional
-- impact on the app.
--
-- This is not a new design decision — supabase/000_baseline_schema.sql
-- already declares every one of these policies `to authenticated`. The live
-- database drifted to `to public` at some point outside CLI tracking, the
-- same class of drift documented throughout this file for other objects.
-- `ALTER POLICY ... TO authenticated` restores the documented baseline
-- exactly, changing only the role the policy applies to — none of the
-- `USING`/`WITH CHECK` logic changes.

begin;

-- ─── 0. profiles INSERT/SELECT policies exist live but in no migration ────────
-- Discovered while testing this migration against an empty database: `alter
-- policy` on these two failed with "policy ... does not exist" even though
-- `pg_policies` shows them live, `to public`, matching 000_baseline_schema.sql
-- exactly except for the role. No migration file — ledger-tracked or
-- foundational — ever created them; like the original foundational tables,
-- they were set up by hand outside CLI tracking. Recreated verbatim from the
-- live definition (`qual`/`with_check` unchanged) and scoped `to authenticated`
-- directly rather than create-then-alter.
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Users can read all profiles" on public.profiles;
create policy "Users can read all profiles" on public.profiles
  for select to authenticated using (true);

alter policy "Authenticated users can add conversation members" on public.conversation_members to authenticated;
alter policy "Users can view conversation members if they are in the conversa" on public.conversation_members to authenticated;

alter policy "Authenticated users can create conversations" on public.conversations to authenticated;
alter policy "Users can read own conversations" on public.conversations to authenticated;

alter policy "Users can create outgoing friend requests" on public.friend_requests to authenticated;
alter policy "Users can read own friend requests" on public.friend_requests to authenticated;
alter policy "Addressee can update own incoming requests" on public.friend_requests to authenticated;

alter policy "Users can create friendships they are part of" on public.friendships to authenticated;
alter policy "Users can read own friendships" on public.friendships to authenticated;

alter policy "Game creator can delete options" on public.game_options to authenticated;
alter policy "Host adds approved options, others propose pending" on public.game_options to authenticated;
alter policy "Read options of visible games" on public.game_options to authenticated;

alter policy "Leave own game or host removes player" on public.game_players to authenticated;
alter policy "Join self or be invited by host" on public.game_players to authenticated;
alter policy "Anyone can read game players" on public.game_players to authenticated;

alter policy "Game creator can delete" on public.games to authenticated;
alter policy "Create games as self" on public.games to authenticated;
alter policy "Games visible by role or visibility" on public.games to authenticated;

alter policy "Users can leave groups" on public.group_members to authenticated;
alter policy "Users can join groups" on public.group_members to authenticated;
alter policy "Anyone can read group members" on public.group_members to authenticated;

alter policy "Authenticated users can create groups" on public.groups to authenticated;
alter policy "Anyone can read groups" on public.groups to authenticated;

alter policy "Users can send messages in own conversations" on public.messages to authenticated;
alter policy "Users can read messages in own conversations" on public.messages to authenticated;

alter policy "Users can delete own votes" on public.votes to authenticated;
alter policy "Participants vote while voting is open" on public.votes to authenticated;
alter policy "Read votes of visible games" on public.votes to authenticated;
alter policy "Change own vote while voting is open" on public.votes to authenticated;

commit;

-- Verified 31/31 `TO public` policies on the live database matched exactly
-- this list before writing this migration (docs/BACKLOG.md item #57's own
-- count). ALTER POLICY has no "if exists" form, so a rerun on an already-fixed
-- database is still safe (it just reapplies the same role set), but a policy
-- rename or drop upstream would need this migration updated to match.
