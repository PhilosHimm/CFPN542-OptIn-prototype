-- Migration 016: atomic game creation.
--
-- CONTEXT
-- saveGame() performed three separate round-trips (games → game_options →
-- game_players) with no transaction. Any failure after the first left a
-- committed game with no time options, and the client discarded the generated id
-- so it could neither navigate to nor clean up the orphan. Retrying minted
-- another orphan each time.
--
-- This function does the whole insert in one transaction and validates the
-- inputs the client does not. created_by is taken from auth.uid() and never from
-- a parameter, so a caller cannot attribute a game to someone else.
--
-- Apply AFTER 014 and 015.

begin;

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
  p_invited_ids      uuid[] default '{}'::uuid[]
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
    total_cost, per_person_cost, confirmed_option_id, description, visibility
  ) values (
    btrim(p_title), p_sport, coalesce(p_sport_emoji, ''), coalesce(p_sport_color, '#2D7A3A'),
    'proposal', p_game_type,
    p_max_players, p_min_players, v_uid, p_group_id, v_deadline,
    coalesce(p_total_cost, 0), coalesce(p_per_person_cost, 0), null, p_description,
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
  numeric, numeric, text, text, jsonb, uuid[]
) from anon, authenticated;

grant execute on function public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]
) to authenticated;

commit;

-- Depends on 014 having made game_options.end_time nullable (it does, §4), so a
-- blank end_time is stored as NULL — an open-ended event — rather than being
-- coerced to equal start_time.
