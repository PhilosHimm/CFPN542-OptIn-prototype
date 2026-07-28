-- Migration 022: real timestamps alongside the text date/time columns.
-- Closes items #23 (UTC-vs-local completion bug) and #24 (no end>start
-- constraint, blocked by a legitimately midnight-crossing row) together,
-- since both come from the same root cause: `date`/`start_time`/`end_time`
-- are plain `text` with no timezone, and every comparison against them
-- (`::date < current_date`) implicitly assumes the database session's
-- timezone (UTC on this project) rather than wherever the game is actually
-- happening. A game can flip to "completed" up to a day early or late
-- depending on the host's real offset from UTC.
--
-- DESIGN (confirmed with the product owner before writing this):
--   1. Single fixed timezone for the whole app, not a per-game/per-user one —
--      this is a single-region pickup-sports app, and a real per-game
--      timezone column would be a feature addition, not a bug fix. The
--      timezone lives in exactly one place, public.app_timezone(), so
--      correcting the region later is a one-line change.
--   2. ADD new timestamptz columns computed from the existing text data,
--      rather than replacing date/start_time/end_time outright. The text
--      columns keep serving display (already formatted for the UI) and
--      nothing in the client needs to change; the new columns exist purely
--      so the server can compare real instants instead of ambiguous text.
--
-- `America/New_York` is a placeholder best guess (no timezone signal exists
-- anywhere in this schema or the demo data) — change it in app_timezone() if
-- the real target region is different. Every comparison in this migration
-- goes through that one function, so that's the only edit needed.
--
-- Midnight-crossing games (e.g. live row bd1d6495: golf, 22:00 -> 12:00) are
-- treated as ending the next calendar day when end_time <= start_time — the
-- standard, unambiguous convention for date+time-of-day pairs, and exactly
-- what makes the end > start CHECK constraint finally safe to add: it
-- previously froze on this exact row because a naive text comparison saw
-- "12:00" < "22:00" and rejected a legitimate overnight event as invalid.

begin;

-- ─── 1. The one place the timezone assumption lives ────────────────────────
create or replace function public.app_timezone()
returns text
language sql
immutable
as $$ select 'America/New_York' $$;

-- ─── 2. Real instants, computed from the existing text columns ─────────────
-- Tried as GENERATED ALWAYS AS ... STORED first: Postgres rejects it
-- ("generation expression is not immutable") because `AT TIME ZONE` with a
-- text zone argument is classified STABLE, not IMMUTABLE, regardless of
-- whether the argument is a literal or (as here) an immutable function's
-- return value — generated columns require a true IMMUTABLE expression.
-- A BEFORE INSERT/UPDATE trigger has no such restriction and matches this
-- codebase's existing pattern (fn_sync_vote_counts, fn_sync_current_players).
alter table public.game_options add column if not exists starts_at timestamptz;
alter table public.game_options add column if not exists ends_at timestamptz;

create or replace function public.fn_sync_game_option_times()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.starts_at := (new.date || ' ' || new.start_time)::timestamp at time zone public.app_timezone();
  if new.end_time is null then
    new.ends_at := null;
  -- end_time <= start_time means the event crosses midnight; ends_at lands
  -- on the following calendar day.
  elsif new.end_time <= new.start_time then
    new.ends_at := ((new.date::date + 1)::text || ' ' || new.end_time)::timestamp at time zone public.app_timezone();
  else
    new.ends_at := (new.date || ' ' || new.end_time)::timestamp at time zone public.app_timezone();
  end if;
  return new;
end$$;

drop trigger if exists trg_sync_game_option_times on public.game_options;
create trigger trg_sync_game_option_times
  before insert or update of date, start_time, end_time on public.game_options
  for each row execute function public.fn_sync_game_option_times();

revoke all on function public.fn_sync_game_option_times() from public, anon, authenticated;

-- Backfill existing rows — the trigger only fires on future inserts/updates.
update public.game_options
set starts_at = (date || ' ' || start_time)::timestamp at time zone public.app_timezone(),
    ends_at = case
      when end_time is null then null
      when end_time <= start_time then ((date::date + 1)::text || ' ' || end_time)::timestamp at time zone public.app_timezone()
      else (date || ' ' || end_time)::timestamp at time zone public.app_timezone()
    end;

alter table public.game_options alter column starts_at set not null;

-- Now safe to add: ends_at correctly lands on the next day for
-- midnight-crossing events, so this no longer conflicts with bd1d6495 or any
-- other legitimate overnight game.
alter table public.game_options drop constraint if exists game_options_ends_after_starts_check;
alter table public.game_options add constraint game_options_ends_after_starts_check
  check (ends_at is null or ends_at > starts_at);

-- ─── 3. auto_transition_game: compare real instants, not ambiguous dates ───
-- Same signature as 019's version, so create or replace is safe.
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

  -- Past confirmed games become completed. Was `go.date::date < current_date`,
  -- which compares the option's local-intended calendar date against
  -- "today" in the session's timezone (UTC) — a game could flip to
  -- completed up to a day early or late depending on the real UTC offset.
  -- go.ends_at is a real instant, so `< now()` is unambiguous.
  if v_game.status = 'confirmed' then
    if exists (
      select 1 from game_options go
      where go.id = v_game.confirmed_option_id
        and go.ends_at < now()
    ) then
      update games set status = 'completed', updated_at = now() where id = p_game_id;
    end if;
    return;
  end if;

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

  update games
  set cancellation_reason = format('Tied on %s time options — host must choose', v_tie_cnt),
      updated_at = now()
  where id = p_game_id
    and coalesce(cancellation_reason, '') not like 'Tied on%';
end$$;

-- ─── 4. create_game_with_options: fix two more implicit-UTC spots ──────────
-- Same 16-arg signature as 021's version, so create or replace is safe.
--
-- (a) The past-date validation compared against `current_date` (UTC) instead
--     of "today" in app_timezone() — could reject a date that's still today
--     locally, or accept one that's already yesterday locally.
-- (b) v_earliest cast the option's naive "date start_time" text straight to
--     timestamptz, which Postgres interprets in the session's timezone
--     (UTC) — silently computing voting_deadline (and the deadline-vs-game
--     clamp that runs even when the client supplies its own deadline) as if
--     every game were in UTC. On a real (non-demo) game this shifted the
--     effective deadline by the app's real UTC offset every single time.
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
  v_uid            uuid := auth.uid();
  v_game_id        uuid;
  v_opt            jsonb;
  v_count          integer := 0;
  v_earliest       timestamptz;
  v_deadline       timestamptz;
  v_invitee        uuid;
  v_earliest_opt   uuid;
  v_today_local    date;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if coalesce(btrim(p_title), '') = '' then
    raise exception 'Title is required' using errcode = 'check_violation';
  end if;

  if p_options is null or jsonb_array_length(p_options) = 0 then
    raise exception 'At least one time option is required' using errcode = 'check_violation';
  end if;

  v_today_local := (now() at time zone public.app_timezone())::date;

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
    if (v_opt->>'date')::date < v_today_local then
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

  select min(((o->>'date') || ' ' || (o->>'start_time'))::timestamp at time zone public.app_timezone())
  into v_earliest
  from jsonb_array_elements(p_options) o;

  v_deadline := coalesce(p_voting_deadline, v_earliest - interval '24 hours');

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

  select go.id into v_earliest_opt
  from game_options go
  where go.game_id = v_game_id
  order by go.starts_at asc
  limit 1;

  if v_earliest_opt is not null then
    insert into votes (option_id, user_id, value)
    values (v_earliest_opt, v_uid, 'in')
    on conflict (option_id, user_id) do nothing;
  end if;

  foreach v_invitee in array coalesce(p_invited_ids, '{}'::uuid[]) loop
    if v_invitee is distinct from v_uid then
      insert into game_players (game_id, user_id, status)
      values (v_game_id, v_invitee, 'invited')
      on conflict (game_id, user_id) do nothing;
    end if;
  end loop;

  return v_game_id;
end$$;

revoke all on function public.app_timezone() from public, anon, authenticated;
grant execute on function public.app_timezone() to authenticated;

commit;
