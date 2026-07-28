-- Migration 019: backlog cleanup batch — access, tiebreak, attendance, cost type.
--
-- Bundles several independent P1/P2/P3 items from docs/BACKLOG.md that each
-- needed a small, additive, idempotent change. Verified live against project
-- iokxjsvlpqlekptexjxy before writing (schema_migrations up to date, 001-018
-- all present). Every statement here follows the item-61 lesson: nothing bare
-- or unconditional that could collide with objects already on the (populated)
-- production database.

begin;

-- ─── 1. Leaving a game must actually revoke access (item #22) ─────────────────
-- user_in_game() backs the SELECT policies on games/game_options and did not
-- check status, so a player who left (game_players.status set to 'declined' by
-- leaveGame()) was still counted as "in the game" and kept read access. Only
-- 'declined' is excluded — 'invited' must still see the game to decide.
create or replace function public.user_in_game(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from game_players
    where game_id = p_game_id and user_id = auth.uid() and status <> 'declined'
  );
$$;

-- ─── 2. Duplicate conversation_members SELECT policy (item #59) ───────────────
-- 011 added a SELECT policy driven by user_in_conversation() (a SECURITY
-- DEFINER function, safe from recursion) specifically to replace the original
-- self-referential policy below. Permissive policies OR together, so the old
-- one staying in place kept the exact 42P17 recursion risk 011 was written to
-- remove. Not reproduced in the baseline schema — production-only drift.
drop policy if exists "Users can read own conversation memberships" on public.conversation_members;

-- ─── 3. Pin search_path on update_updated_at (item #46) ───────────────────────
-- The advisor's "user_in_conversation mutable search_path" line is stale —
-- 017 already pinned it. The function actually still missing SET search_path
-- is this one (confirmed live via pg_get_functiondef). Not SECURITY DEFINER,
-- so it is not a privilege-escalation vector like the others, but an unpinned
-- search_path is still worth closing, and it's a plain trigger function so it
-- gets the same "never callable over REST" lockdown as its siblings in 017.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.update_updated_at() from public, anon, authenticated;

-- ─── 4. Use maybe-votes as a tiebreak (item #39) ───────────────────────────────
-- maybe_votes has been counted correctly since 015 (fn_sync_vote_counts) but
-- auto_transition_game never looked at it — a tie on 'in' votes always fell
-- through to "host must choose" even when one option clearly had more people
-- leaning toward it. This adds exactly one more decision step: among options
-- tied on 'in' votes, if exactly one has a strictly higher 'maybe' count than
-- the others, it wins. If maybe_votes is also tied, it's still a real tie —
-- unchanged behaviour (record it, host decides).
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
  v_max_maybe   integer;
  v_maybe_ties  integer;
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
    set status = 'confirmed', confirmed_option_id = v_winner, updated_at = now(),
        cancellation_reason = null
    where id = p_game_id;
    return;
  end if;

  -- Tied on 'in' votes. Break it with 'maybe' votes as a secondary signal.
  select max(t.maybe_cnt) into v_max_maybe
  from (
    select go.id, count(*) filter (where v.value = 'maybe') as maybe_cnt
    from game_options go
    left join votes v on v.option_id = go.id
    where go.game_id = p_game_id
      and go.status = 'approved'
    group by go.id
    having count(*) filter (where v.value = 'in') = v_max_in
  ) t;

  select count(*) into v_maybe_ties
  from (
    select go.id, count(*) filter (where v.value = 'maybe') as maybe_cnt
    from game_options go
    left join votes v on v.option_id = go.id
    where go.game_id = p_game_id
      and go.status = 'approved'
    group by go.id
    having count(*) filter (where v.value = 'in') = v_max_in
  ) t
  where t.maybe_cnt = v_max_maybe;

  if v_maybe_ties = 1 then
    select t.id into v_winner
    from (
      select go.id, count(*) filter (where v.value = 'maybe') as maybe_cnt
      from game_options go
      left join votes v on v.option_id = go.id
      where go.game_id = p_game_id
        and go.status = 'approved'
      group by go.id
      having count(*) filter (where v.value = 'in') = v_max_in
    ) t
    where t.maybe_cnt = v_max_maybe;

    update games
    set status = 'confirmed', confirmed_option_id = v_winner, updated_at = now(),
        cancellation_reason = null
    where id = p_game_id;
    return;
  end if;

  -- Still tied even after the maybe-vote tiebreak. Leave the game in
  -- `proposal` for the host to break, but record it so the UI can surface a
  -- tie anywhere, and so repeated sweeps can tell "awaiting host" apart from
  -- "not yet evaluated".
  update games
  set cancellation_reason = format('Tied on %s time options — host must choose', v_tie_cnt),
      updated_at = now()
  where id = p_game_id
    and coalesce(cancellation_reason, '') not like 'Tied on%';
end$$;

-- ─── 5. Record attendance stats when a game completes (items #20, #34) ────────
-- completeGame() in gameData.ts deliberately stopped writing games_played/
-- weeks_played/attendance_rate itself (see its comment) after the client-side
-- read-then-write loop turned out to be silently broken under the
-- `profiles` UPDATE policy (auth.uid() = id) for every attendee except the
-- caller. A trigger is the correct place: it fires regardless of whether a
-- game completes via completeGame()'s direct UPDATE or via
-- auto_transition_game's own `status = 'completed'` UPDATE above, and
-- SECURITY DEFINER bypasses the per-row profiles restriction correctly
-- (unlike the old client loop, which could not).
create or replace function public.fn_record_game_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    for v_user_id in
      select user_id from game_players where game_id = new.id and status = 'joined'
    loop
      update profiles p
      set games_played = games_played + 1,
          weeks_played = weeks_played + 1,
          attendance_rate = coalesce((
            select round(100.0 * count(*) filter (where gp.status = 'joined') / count(*))::integer
            from game_players gp
            join games g on g.id = gp.game_id
            where gp.user_id = v_user_id
              and g.status = 'completed'
              and gp.status in ('joined', 'declined')
          ), 0)
      where p.id = v_user_id;
    end loop;
  end if;
  return new;
end$$;

drop trigger if exists trg_record_game_attendance on public.games;
create trigger trg_record_game_attendance
  after update on public.games
  for each row execute function public.fn_record_game_attendance();

revoke all on function public.fn_record_game_attendance() from public, anon, authenticated;

-- ─── 6. Persist cost_type so "Free" and "$0/player" aren't the same row (#48) ──
-- gameData.ts inferred cost mode from (total_cost, per_person_cost) — workable
-- for "did this game have a price" but not for which pricing *mode* the host
-- picked, and it's what let CreateGameScreen's capacity-based estimate and
-- GameViewScreen's actual-attendee-based display quietly disagree (item #19).
alter table public.games add column if not exists cost_type text;

update public.games
set cost_type = case
  when coalesce(total_cost, 0) = 0 and coalesce(per_person_cost, 0) > 0 then 'per_player'
  when coalesce(total_cost, 0) > 0 then 'fixed'
  else 'free'
end
where cost_type is null;

alter table public.games alter column cost_type set default 'fixed';
alter table public.games alter column cost_type set not null;

alter table public.games drop constraint if exists games_cost_type_check;
alter table public.games add constraint games_cost_type_check
  check (cost_type in ('free', 'per_player', 'fixed'));

-- ─── 7. create_game_with_options: accept cost_type, reject past dates (#42) ───
-- Appending a parameter changes the function's signature, so `create or
-- replace` on the new 16-arg form would leave the old 15-arg form behind as a
-- second overload rather than replacing it — drop the old signature first.
drop function if exists public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]
);

create or replace function public.create_game_with_options(
  p_title            text,
  p_sport            text,
  p_sport_emoji      text default '',
  p_sport_color      text default '#2D7A3A',
  p_game_type        text default 'Casual',
  p_max_players      integer default null,
  p_min_players      integer default null,
  p_group_id         uuid default null,
  p_voting_deadline  timestamptz default null,
  p_total_cost       numeric default 0,
  p_per_person_cost  numeric default 0,
  p_visibility       text default 'Private',
  p_description      text default null,
  -- [{ "date": "2026-08-01", "start_time": "18:00", "end_time": "20:00", "location": "..." }, ...]
  p_options          jsonb default '[]'::jsonb,
  p_invited_ids      uuid[] default '{}'::uuid[],
  p_cost_type        text default 'fixed'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_game_id   uuid;
  v_opt       jsonb;
  v_count     integer := 0;
  v_earliest  timestamptz;
  v_deadline  timestamptz;
  v_invitee   uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if coalesce(btrim(p_title), '') = '' then
    raise exception 'Title is required' using errcode = 'check_violation';
  end if;

  -- The client filtered options client-side and inserted only if the filtered
  -- array was non-empty, so an all-invalid array produced a "successful" game
  -- with no time options at all.
  if p_options is null or jsonb_array_length(p_options) = 0 then
    raise exception 'At least one time option is required' using errcode = 'check_violation';
  end if;

  -- Validate every option up front so we never half-build a game.
  for v_opt in select * from jsonb_array_elements(p_options) loop
    if coalesce(v_opt->>'date', '') = '' or coalesce(v_opt->>'start_time', '') = '' then
      raise exception 'Every time option needs a date and a start time'
        using errcode = 'check_violation';
    end if;
    if coalesce(v_opt->>'end_time', '') <> ''
       and (v_opt->>'end_time') <= (v_opt->>'start_time') then
      raise exception 'End time must be after start time (option %)', v_opt->>'date'
        using errcode = 'check_violation';
    end if;
    -- Defense-in-depth alongside the client-side check in gameData.ts's
    -- saveGame() — compared as ISO "YYYY-MM-DD" text, which sorts correctly.
    if (v_opt->>'date') < to_char(current_date, 'YYYY-MM-DD') then
      raise exception 'Proposed times can''t be in the past (option %)', v_opt->>'date'
        using errcode = 'check_violation';
    end if;
    v_count := v_count + 1;
  end loop;

  if p_max_players is not null and p_max_players < array_length(p_invited_ids, 1) then
    raise exception 'max_players (%) is below the number of people invited (%)',
      p_max_players, array_length(p_invited_ids, 1)
      using errcode = 'check_violation';
  end if;

  if p_group_id is not null and not public.user_in_group(p_group_id) then
    raise exception 'You are not a member of that group'
      using errcode = 'insufficient_privilege';
  end if;

  -- Earliest proposed start, used to sanity-check the voting deadline. Times are
  -- text in this schema; see the timezone task.
  select min(((o->>'date') || ' ' || (o->>'start_time'))::timestamptz)
  into v_earliest
  from jsonb_array_elements(p_options) o;

  v_deadline := coalesce(p_voting_deadline, v_earliest - interval '24 hours');

  -- A deadline after the game means voting never closes in time; a deadline in
  -- the past means the game is cancelled on the very next sweep. Clamp both.
  if v_deadline >= v_earliest then
    v_deadline := v_earliest - interval '1 hour';
  end if;
  if v_deadline <= now() then
    v_deadline := least(now() + interval '1 hour', v_earliest);
  end if;

  insert into games (
    title, sport, sport_emoji, sport_color, status, game_type,
    max_players, min_players, created_by, group_id, voting_deadline,
    total_cost, per_person_cost, cost_type, confirmed_option_id, description, visibility
  ) values (
    btrim(p_title), p_sport, coalesce(p_sport_emoji, ''), coalesce(p_sport_color, '#2D7A3A'),
    'proposal', p_game_type,
    p_max_players, p_min_players, v_uid, p_group_id, v_deadline,
    coalesce(p_total_cost, 0), coalesce(p_per_person_cost, 0),
    case when p_cost_type in ('free', 'per_player', 'fixed') then p_cost_type else 'fixed' end,
    null, p_description,
    case when p_visibility in ('Public', 'Group Only', 'Private') then p_visibility else 'Private' end
  )
  returning id into v_game_id;

  insert into game_options (game_id, date, display_date, start_time, end_time, location, status)
  select
    v_game_id,
    o->>'date',
    to_char(((o->>'date')::date), 'Dy, Mon FMDD'),
    o->>'start_time',
    nullif(o->>'end_time', ''),
    coalesce(o->>'location', ''),
    'approved'
  from jsonb_array_elements(p_options) o;

  -- Invitees. The creator is added by trg_creator_joins_game, so skip them here
  -- to avoid tripping the unique(game_id, user_id) constraint.
  foreach v_invitee in array coalesce(p_invited_ids, '{}'::uuid[]) loop
    if v_invitee is distinct from v_uid then
      insert into game_players (game_id, user_id, status)
      values (v_game_id, v_invitee, 'invited')
      on conflict (game_id, user_id) do nothing;
    end if;
  end loop;

  return v_game_id;
end$$;

revoke all on function public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[], text
) from public, anon, authenticated;

grant execute on function public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[], text
) to authenticated;

commit;

-- REMAINING KNOWN GAPS AFTER THIS MIGRATION (unchanged, tracked separately):
--   * item #24 — dates/times are still `text`, no timezone. Out of scope here;
--     see BACKLOG.md for why (a live row froze mid-attempt last time).
--   * item #57 — game_players/profiles/groups/group_members are still
--     `USING (true)`/`TO public`, readable by anon. Deliberately not touched —
--     needs a product decision first per BACKLOG.md.
--   * "Leaked Password Protection Disabled" is a dashboard Auth setting, not
--     SQL — cannot be fixed from a migration.
