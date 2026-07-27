-- Migration 018: add WITH CHECK to every UPDATE policy, and pin the columns that
-- WITH CHECK cannot protect.
--
-- THE BUG
-- In Postgres, an UPDATE policy's USING clause decides *which rows you may
-- update*; WITH CHECK decides *what you may turn them into*. With no WITH CHECK,
-- any row you can update you can rewrite into a row you could never have
-- inserted. 8 of 9 UPDATE policies on this database had no WITH CHECK — only the
-- `votes` policy added in 014 did — which made the INSERT hardening in 014
-- bypassable:
--
--   * game_players: USING (user_id = auth.uid()) let a member UPDATE their row's
--     game_id to any game at all, joining games they were never invited to. This
--     defeated 014 section 6 entirely.
--   * game_options: a host could move an option into a game they do not own.
--   * games: a host could reassign created_by to another user, orphaning the game
--     (every write policy is created_by = auth.uid(), so the game becomes
--     unadministrable).
--   * profiles: a user could attempt to change their own id.
--
-- THE LIMITATION THAT SHAPES THIS MIGRATION
-- WITH CHECK sees only NEW, never OLD, so a policy cannot express "this column
-- must not change". For most tables that does not matter, because the predicate
-- pins the column by comparing it to auth.uid() (a new value would have to still
-- be me). Two tables are different: their predicate is on `user_id`, so the
-- *parent* foreign key is left free — a row can be moved to a different parent
-- while still passing the check. Those two need a trigger.
--
--   WITH CHECK is sufficient .... games, game_options, profiles, groups,
--                                 conversations, friend_requests
--   trigger also required ...... game_players (game_id),
--                                 conversation_members (conversation_id)
--
-- Also switches these policies from an implicit TO public to TO authenticated.
-- Every predicate already requires a non-null auth.uid(), so anon loses nothing
-- real, and `TO public` on an authenticated-only policy is misleading.

begin;

-- ─── Generic column-immutability trigger ──────────────────────────────────────
-- Takes column names as trigger arguments and rejects any UPDATE that changes
-- them. Compares via to_jsonb so one function covers every table.
create or replace function public.fn_forbid_column_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_col text;
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
begin
  foreach v_col in array tg_argv loop
    if v_old -> v_col is distinct from v_new -> v_col then
      raise exception '%.% cannot be changed once set', tg_table_name, v_col
        using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end$$;

revoke all on function public.fn_forbid_column_change() from public, anon, authenticated;

-- ─── games ────────────────────────────────────────────────────────────────────
drop policy if exists "Game creator can update games" on public.games;
create policy "Game creator can update games"
  on public.games for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ─── game_options ─────────────────────────────────────────────────────────────
drop policy if exists "Game creator can update options" on public.game_options;
create policy "Game creator can update options"
  on public.game_options for update
  to authenticated
  using (public.user_is_game_host(game_id))
  with check (public.user_is_game_host(game_id));

-- ─── game_players ─────────────────────────────────────────────────────────────
-- WITH CHECK stops user_id reassignment; the trigger stops game_id reassignment,
-- which is the actual bypass of the INSERT policy.
drop policy if exists "Users can update own game player status" on public.game_players;
create policy "Users can update own game player status"
  on public.game_players for update
  to authenticated
  using (user_id = auth.uid() or public.user_is_game_host(game_id))
  with check (user_id = auth.uid() or public.user_is_game_host(game_id));

drop trigger if exists trg_game_players_immutable on public.game_players;
create trigger trg_game_players_immutable
  before update on public.game_players
  for each row execute function public.fn_forbid_column_change('game_id', 'user_id');

-- ─── profiles ─────────────────────────────────────────────────────────────────
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── groups ───────────────────────────────────────────────────────────────────
drop policy if exists "Group admins can update groups" on public.groups;
create policy "Group admins can update groups"
  on public.groups for update
  to authenticated
  using (
    id in (select group_members.group_id from group_members
           where group_members.user_id = auth.uid() and group_members.role = 'admin')
  )
  with check (
    id in (select group_members.group_id from group_members
           where group_members.user_id = auth.uid() and group_members.role = 'admin')
  );

-- ─── conversations ────────────────────────────────────────────────────────────
drop policy if exists "Conversation members can update conversations" on public.conversations;
create policy "Conversation members can update conversations"
  on public.conversations for update
  to authenticated
  using (public.user_in_conversation(id))
  with check (public.user_in_conversation(id));

-- ─── conversation_members ─────────────────────────────────────────────────────
drop policy if exists "Users can update own conversation membership" on public.conversation_members;
create policy "Users can update own conversation membership"
  on public.conversation_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop trigger if exists trg_conversation_members_immutable on public.conversation_members;
create trigger trg_conversation_members_immutable
  before update on public.conversation_members
  for each row execute function public.fn_forbid_column_change('conversation_id', 'user_id');

-- ─── friend_requests ──────────────────────────────────────────────────────────
-- The addressee accepts or declines. Pinning both party columns stops either side
-- being rewritten while the row is in flight.
drop policy if exists "Addressee can update own incoming requests" on public.friend_requests;
create policy "Addressee can update own incoming requests"
  on public.friend_requests for update
  to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

drop trigger if exists trg_friend_requests_immutable on public.friend_requests;
create trigger trg_friend_requests_immutable
  before update on public.friend_requests
  for each row execute function public.fn_forbid_column_change('requester_id', 'addressee_id');

commit;
