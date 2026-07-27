-- Migration 015: restore the game state machine and the vote-count trigger.
--
-- CONTEXT
-- `auto_transition_all_games` does not exist in the live database. The client
-- calls it fire-and-forget on load (games.service.ts:24, :112), so the missing
-- function 404s silently and NO game has ever auto-confirmed, auto-cancelled or
-- auto-completed in production. `fn_sync_vote_counts` is likewise absent, so the
-- denormalised counters on game_options are maintained by nobody.
--
-- Apply AFTER 014 (this migration depends on game_options.status and min_players).

begin;

-- ─── 1. Keep the denormalised vote counters correct ───────────────────────────
-- The live game_options UPDATE policy is host-only, so the client cannot maintain
-- these columns for a non-host's vote. Observed live: 2 of 3 vote rows were not
-- reflected in the counters. A trigger is the only correct place for this.
-- (This function is SECURITY DEFINER precisely so it bypasses the host-only policy.)
create or replace function public.fn_sync_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_option_id uuid := coalesce(new.option_id, old.option_id);
begin
  update game_options go
  set in_votes    = (select count(*) from votes v where v.option_id = v_option_id and v.value = 'in'),
      maybe_votes = (select count(*) from votes v where v.option_id = v_option_id and v.value = 'maybe'),
      out_votes   = (select count(*) from votes v where v.option_id = v_option_id and v.value = 'out')
  where go.id = v_option_id;
  return null;
end$$;

drop trigger if exists trg_sync_vote_counts on public.votes;
create trigger trg_sync_vote_counts
  after insert or update or delete on public.votes
  for each row execute function public.fn_sync_vote_counts();

-- One-time repair of the counters that drifted while no trigger existed.
update public.game_options go
set in_votes    = coalesce(c.in_ct, 0),
    maybe_votes = coalesce(c.maybe_ct, 0),
    out_votes   = coalesce(c.out_ct, 0)
from (
  select go2.id,
         count(*) filter (where v.value = 'in')    as in_ct,
         count(*) filter (where v.value = 'maybe') as maybe_ct,
         count(*) filter (where v.value = 'out')   as out_ct
  from game_options go2
  left join votes v on v.option_id = go2.id
  group by go2.id
) c
where c.id = go.id
  and (go.in_votes, go.maybe_votes, go.out_votes)
      is distinct from (coalesce(c.in_ct,0), coalesce(c.maybe_ct,0), coalesce(c.out_ct,0));

-- ─── 2. Bound roster size — max_players was purely decorative ─────────────────
-- No trigger, constraint or index bounded roster size, and joinGame is a bare
-- upsert, so 20 people could join a 4-player game.
create or replace function public.fn_enforce_game_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  -- Only 'joined' consumes a slot; 'invited' and 'declined' do not.
  if new.status is distinct from 'joined' then
    return new;
  end if;

  select max_players into v_max from games where id = new.game_id;
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
  from game_players
  where game_id = new.game_id
    and status = 'joined'
    and user_id <> new.user_id;

  if v_count >= v_max then
    raise exception 'Game is full (% of % players)', v_count, v_max
      using errcode = 'check_violation';
  end if;

  return new;
end$$;

drop trigger if exists trg_enforce_game_capacity on public.game_players;
create trigger trg_enforce_game_capacity
  before insert or update on public.game_players
  for each row execute function public.fn_enforce_game_capacity();

-- ─── 3. Single-game transition ────────────────────────────────────────────────
-- Replaces the live auto_transition_game. Differences from the version in 006:
--   * only 'approved' options can win (006 predates 013's status column, so
--     unapproved proposals could win a vote nobody could see)
--   * respects games.min_players, so the server and the host's Confirm button
--     agree about quorum
--   * records a cancellation_reason that distinguishes "nobody voted" from
--     "everybody voted out" from "quorum not met"
--   * a tie is recorded explicitly rather than silently leaving the game in
--     `proposal` with no indication why (006 had no ELSE branch at all)
create or replace function public.auto_transition_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game        games;
  v_max_in      integer;
  v_tie_cnt     integer;
  v_winner      uuid;
  v_min         integer;
  v_total_votes integer;
begin
  select * into v_game from games where id = p_game_id;
  if not found then
    return;
  end if;

  -- Past confirmed games become completed. Uses the option's own date; see the
  -- timezone task — `date` is text and CURRENT_DATE resolves in the session zone.
  if v_game.status = 'confirmed' then
    if exists (
      select 1 from game_options go
      where go.id = v_game.confirmed_option_id
        and go.date::date < current_date
    ) then
      update games set status = 'completed', updated_at = now() where id = p_game_id;
    end if;
    return;
  end if;

  -- Only proposals past their deadline are eligible for a decision.
  if v_game.status <> 'proposal' or v_game.voting_deadline > now() then
    return;
  end if;

  select count(*) into v_total_votes
  from votes v
  join game_options go on go.id = v.option_id
  where go.game_id = p_game_id;

  select coalesce(max(cnt), 0) into v_max_in
  from (
    select count(*) filter (where v.value = 'in') as cnt
    from game_options go
    left join votes v on v.option_id = go.id
    where go.game_id = p_game_id
      and go.status = 'approved'
    group by go.id
  ) s;

  if v_max_in = 0 then
    update games
    set status = 'cancelled',
        cancellation_reason = case
          when v_total_votes = 0 then 'Voting closed with no votes cast'
          else 'Voting closed with no attendees available'
        end,
        updated_at = now()
    where id = p_game_id;
    return;
  end if;

  -- Quorum: min_players when set, otherwise any plurality wins.
  v_min := coalesce(v_game.min_players, 1);
  if v_max_in < v_min then
    update games
    set status = 'cancelled',
        cancellation_reason = format(
          'Voting closed below minimum attendees (%s of %s)', v_max_in, v_min),
        updated_at = now()
    where id = p_game_id;
    return;
  end if;

  select count(*) into v_tie_cnt
  from (
    select go.id, count(*) filter (where v.value = 'in') as cnt
    from game_options go
    left join votes v on v.option_id = go.id
    where go.game_id = p_game_id
      and go.status = 'approved'
    group by go.id
  ) s
  where s.cnt = v_max_in;

  if v_tie_cnt = 1 then
    select s.id into v_winner
    from (
      select go.id, count(*) filter (where v.value = 'in') as cnt
      from game_options go
      left join votes v on v.option_id = go.id
      where go.game_id = p_game_id
        and go.status = 'approved'
      group by go.id
    ) s
    where s.cnt = v_max_in;

    update games
    set status = 'confirmed', confirmed_option_id = v_winner, updated_at = now()
    where id = p_game_id;
    return;
  end if;

  -- Tie. Leave the game in `proposal` for the host to break, but record it so the
  -- UI can surface a tie anywhere (not only by opening the game as the countdown
  -- expires, which was the sole entry point before) and so repeated sweeps can
  -- tell "awaiting host" apart from "not yet evaluated".
  update games
  set cancellation_reason = format('Tied on %s time options — host must choose', v_tie_cnt),
      updated_at = now()
  where id = p_game_id
    and coalesce(cancellation_reason, '') not like 'Tied on%';
end$$;

-- ─── 4. The sweep the client actually calls — absent from the live DB ─────────
create or replace function public.auto_transition_all_games()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid;
  v_ct  integer := 0;
begin
  for v_id in
    select id from games
    where (status = 'proposal'  and voting_deadline < now())
       or (status = 'confirmed' and confirmed_option_id is not null)
  loop
    -- One malformed `date` text value would otherwise abort the whole sweep and
    -- block every pending transition for every game.
    begin
      perform public.auto_transition_game(v_id);
      v_ct := v_ct + 1;
    exception when others then
      raise warning 'auto_transition_game(%) failed: %', v_id, sqlerrm;
    end;
  end loop;
  return v_ct;
end$$;

-- Supporting index: the sweep filters on these on every app load by every user.
create index if not exists idx_games_status_deadline
  on public.games (status, voting_deadline);

-- ─── 5. Lock down EXECUTE ─────────────────────────────────────────────────────
-- !! THESE STATEMENTS DO NOT WORK — SUPERSEDED BY MIGRATION 017 !!
-- Postgres grants EXECUTE to PUBLIC by default at function creation, and
-- anon/authenticated inherit that grant. Revoking from the role leaves PUBLIC
-- intact, so these ran, reported success, and changed nothing (confirmed by the
-- linter still flagging every function as anon-executable afterwards).
-- 017 does it correctly by revoking from PUBLIC first. Kept here unchanged so the
-- file matches what was actually applied on 2026-07-27.
revoke all on function public.auto_transition_game(uuid)     from anon, authenticated;
revoke all on function public.auto_transition_all_games()    from anon, authenticated;
revoke all on function public.fn_sync_vote_counts()          from anon, authenticated;
revoke all on function public.fn_enforce_game_capacity()     from anon, authenticated;

grant execute on function public.auto_transition_game(uuid)  to authenticated;
grant execute on function public.auto_transition_all_games() to authenticated;

commit;

-- ─── 6. NEXT STEP, STILL NOT DONE ─────────────────────────────────────────────
-- Transitions still only run when a user opens the app. If nobody opens it
-- between a deadline and the game date, a game jumps proposal → confirmed →
-- completed without ever being playable. pg_cron is NOT installed on this project
-- (checked: select count(*) from pg_extension where extname='pg_cron' → 0).
-- To close that gap, in the Supabase dashboard:
--
--   create extension if not exists pg_cron;
--   select cron.schedule('auto-transition-games', '*/15 * * * *',
--                        $$select public.auto_transition_all_games()$$);
--
-- Enabling an extension is a project-level change, so it is left to you.
