-- Migration 017: actually revoke EXECUTE, and pin the last mutable search_path.
--
-- WHY THIS EXISTS
-- Migration 015 ended with `REVOKE ALL ON FUNCTION ... FROM anon, authenticated`.
-- That had no effect. Postgres grants EXECUTE to PUBLIC by default when a
-- function is created, and anon/authenticated inherit it, so revoking from the
-- role leaves the PUBLIC grant in place. The statements ran, reported success,
-- and changed nothing — the same class of mistake as migration 013's additive RLS
-- policy. Confirmed by Supabase's linter still reporting all 13 functions as
-- anon-executable after 015 was applied.
--
-- The fix is to revoke from PUBLIC first, then grant explicitly. After applying
-- this, the security advisor drops from 26 lints to 8.
--
-- Applied 2026-07-27.

-- Trigger functions: never callable over REST. Triggers do not need role-level
-- EXECUTE at fire time (it is checked when the trigger is created), so revoking
-- does not break them.
revoke all on function public.fn_sync_vote_counts()      from public, anon, authenticated;
revoke all on function public.fn_enforce_game_capacity() from public, anon, authenticated;
revoke all on function public.fn_creator_joins_game()    from public, anon, authenticated;
revoke all on function public.fn_sync_current_players()  from public, anon, authenticated;
revoke all on function public.handle_new_user()          from public, anon, authenticated;

-- RLS helpers: signed-in users need EXECUTE for policy evaluation. anon does not,
-- because every game policy requires a non-null auth.uid().
revoke all on function public.user_in_game(uuid)      from public, anon, authenticated;
revoke all on function public.user_is_game_host(uuid) from public, anon, authenticated;
revoke all on function public.user_in_group(uuid)     from public, anon, authenticated;
grant execute on function public.user_in_game(uuid)      to authenticated;
grant execute on function public.user_is_game_host(uuid) to authenticated;
grant execute on function public.user_in_group(uuid)     to authenticated;

-- Callable RPCs: signed-in only.
revoke all on function public.auto_transition_game(uuid)  from public, anon, authenticated;
revoke all on function public.auto_transition_all_games() from public, anon, authenticated;
grant execute on function public.auto_transition_game(uuid)  to authenticated;
grant execute on function public.auto_transition_all_games() to authenticated;

revoke all on function public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]
) from public, anon, authenticated;
grant execute on function public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]
) to authenticated;

-- Pin the one remaining mutable search_path (pre-existing, from migration 011).
-- An unpinned search_path on a SECURITY DEFINER function is a privilege-escalation
-- vector: a caller who can create objects in an earlier schema can shadow the
-- referenced tables.
create or replace function public.user_in_conversation(conv_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $function$
  select exists (
    select 1 from conversation_members
    where conversation_id = conv_id and user_id = auth.uid()
  );
$function$;

revoke all on function public.user_in_conversation(uuid) from public, anon, authenticated;
grant execute on function public.user_in_conversation(uuid) to authenticated;

-- REMAINING ADVISOR WARNINGS AFTER THIS MIGRATION (all expected):
--   * 7 x "Signed-In Users Can Execute SECURITY DEFINER Function" — intentional.
--     The three RLS helpers must be executable by `authenticated` for policy
--     evaluation, and the three RPCs plus user_in_conversation are the app's
--     entry points.
--   * "Leaked Password Protection Disabled" — a dashboard Auth setting, not SQL.
--     Enable it under Authentication → Policies if you want HaveIBeenPwned checks.
