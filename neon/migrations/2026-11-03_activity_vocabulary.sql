-- ═══════════════════════════════════════════════════════════════════════════════
-- 2026-11-03 — sport -> activity vocabulary
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Brings a database built from the earlier neon/schema.sql up to date with the
-- current one. neon/schema.sql stays the source of truth for a fresh database.
-- This file exists only because column renames can't be applied by re-running it.
--
-- The client must ship in the same release: PostgREST rejects the old column
-- names as soon as this runs. Applied to production on 2026-11-03, right after the
-- matching code deployed.
--
-- Run as one transaction (Neon MCP run_sql_transaction, or psql -1).
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.games  rename column sport       to activity;
alter table public.games  rename column sport_emoji to activity_emoji;
alter table public.games  rename column sport_color to activity_color;

alter table public.groups rename column sport       to activity;
alter table public.groups alter  column activity drop not null;
alter table public.groups rename column sport_emoji to activity_emoji;
alter table public.groups alter  column activity_emoji set default '';

-- Parameter names are part of a function's identity for named-argument calls,
-- and CREATE OR REPLACE can't rename them, so drop and recreate.
drop function public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]);

-- ── Transactional game creation ──────────────────────────────────────────────
-- created_by comes from public.current_uid(), never a parameter, so a caller cannot
-- attribute a game to someone else.
create function public.create_game_with_options(
  p_title            text,
  p_activity         text,
  p_activity_emoji   text default '',
  p_activity_color   text default '#2D7A3A',
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
  p_invited_ids      uuid[] default '{}'::uuid[]
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := public.current_uid();
  v_game_id  uuid;
  v_opt      jsonb;
  v_earliest timestamptz;
  v_deadline timestamptz;
  v_invitee  uuid;
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

  for v_opt in select * from jsonb_array_elements(p_options) loop
    if coalesce(v_opt->>'date', '') = '' or coalesce(v_opt->>'start_time', '') = '' then
      raise exception 'Every time option needs a date and a start time'
        using errcode = 'check_violation';
    end if;
  end loop;

  if p_max_players is not null and p_max_players < coalesce(array_length(p_invited_ids, 1), 0) then
    raise exception 'max_players (%) is below the number of people invited (%)',
      p_max_players, array_length(p_invited_ids, 1) using errcode = 'check_violation';
  end if;

  if p_group_id is not null and not public.user_in_group(p_group_id) then
    raise exception 'You are not a member of that group' using errcode = 'insufficient_privilege';
  end if;

  select min(((o->>'date') || ' ' || (o->>'start_time'))::timestamptz) into v_earliest
  from jsonb_array_elements(p_options) o;

  -- Voting closes before the earliest proposed start, clamped into (now, start)
  -- so it can neither land in the past nor after the game itself.
  v_deadline := coalesce(p_voting_deadline, v_earliest - interval '24 hours');
  if v_deadline >= v_earliest then v_deadline := v_earliest - interval '1 hour'; end if;
  if v_deadline <= now() then v_deadline := least(now() + interval '1 hour', v_earliest); end if;

  insert into games (
    title, activity, activity_emoji, activity_color, status, game_type,
    max_players, min_players, created_by, group_id, voting_deadline,
    total_cost, per_person_cost, confirmed_option_id, description, visibility
  ) values (
    btrim(p_title), p_activity, coalesce(p_activity_emoji, ''), coalesce(p_activity_color, '#2D7A3A'),
    'proposal', p_game_type,
    p_max_players, p_min_players, v_uid, p_group_id, v_deadline,
    coalesce(p_total_cost, 0), coalesce(p_per_person_cost, 0), null, p_description,
    case when p_visibility in ('Public', 'Group Only', 'Private') then p_visibility else 'Private' end
  ) returning id into v_game_id;

  insert into game_options (game_id, date, display_date, start_time, end_time, location, status)
  select v_game_id, o->>'date', to_char(((o->>'date')::date), 'Dy, Mon FMDD'),
         o->>'start_time', nullif(o->>'end_time', ''), coalesce(o->>'location', ''), 'approved'
  from jsonb_array_elements(p_options) o;

  -- The creator is added by trg_creator_joins_game, so skip them here to avoid
  -- tripping unique(game_id, user_id).
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
  numeric, numeric, text, text, jsonb, uuid[]) from public, anonymous, authenticated;
grant execute on function public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]) to authenticated;
