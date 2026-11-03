-- ═══════════════════════════════════════════════════════════════════════════════
-- 2026-11-03 — game -> activity, activity (kind) -> type
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Second vocabulary pass, run after 2026-11-03_activity_vocabulary.sql. Brings a
-- database to the current neon/schema.sql: a plan is an *activity*, its kind is
-- its *type*, and Casual/Competitive is `intensity`.
--
--   games / game_options / game_players  -> activities / activity_options / activity_players
--   *.game_id                            -> activity_id
--   activities.activity / _emoji / _color -> type / type_emoji / type_color
--   activities.game_type                 -> intensity
--   groups.activity / activity_emoji     -> type / type_emoji
--   groups.next_game                     -> next_activity
--   profiles.games_played                -> activities_played
--   functions, triggers, policies, constraints and indexes renamed to match
--
-- Table and column renames keep the data, grants and RLS-enabled flags. Function
-- bodies are stored as text and do not follow renames, and parameter names can't
-- be changed in place, so every function, trigger and policy that touches these
-- tables is dropped and recreated from neon/schema.sql sections 6, 7, 8 and 10
-- (copied verbatim below).
--
-- The client must ship in the same release: PostgREST rejects the old names the
-- moment this commits. Run as one transaction (Neon MCP run_sql_transaction).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Tables and columns ───────────────────────────────────────────────────────
alter table public.games        rename to activities;
alter table public.game_options rename to activity_options;
alter table public.game_players rename to activity_players;

alter table public.activities rename column activity       to type;
alter table public.activities rename column activity_emoji to type_emoji;
alter table public.activities rename column activity_color to type_color;
alter table public.activities rename column game_type      to intensity;
alter table public.activity_options rename column game_id to activity_id;
alter table public.activity_players rename column game_id to activity_id;
alter table public.groups   rename column activity       to type;
alter table public.groups   rename column activity_emoji to type_emoji;
alter table public.groups   rename column next_game      to next_activity;
alter table public.profiles rename column games_played   to activities_played;

-- ─── Constraint and index names ───────────────────────────────────────────────
alter table public.activities rename constraint games_game_type_check to activities_intensity_check;

-- Everything else follows one pattern (games -> activities, game -> activity,
-- sport -> type), which also matches the NOT NULL constraint names Postgres
-- generates for a fresh database. Renaming a PK/unique constraint renames its
-- index too, so the index pass only sees index-only names.
do $$
declare r record;
begin
  for r in select conrelid::regclass as rel, conname from pg_constraint
           where connamespace = 'public'::regnamespace and conname ~ '(game|sport)' loop
    execute format('alter table %s rename constraint %I to %I', r.rel, r.conname,
      replace(replace(replace(r.conname, 'games', 'activities'), 'game', 'activity'), 'sport', 'type'));
  end loop;
  for r in select indexname from pg_indexes where schemaname = 'public' and indexname ~ '(game|sport)' loop
    execute format('alter index public.%I rename to %I', r.indexname,
      replace(replace(replace(r.indexname, 'games', 'activities'), 'game', 'activity'), 'sport', 'type'));
  end loop;
end$$;

-- ─── Drop objects that are recreated below ────────────────────────────────────
drop policy "Games visible by role or visibility" on public.activities;
drop policy "Create games as self" on public.activities;
drop policy "Game creator can update games" on public.activities;
drop policy "Game creator can delete" on public.activities;
drop policy "Read options of visible games" on public.activity_options;
drop policy "Host adds approved options, others propose pending" on public.activity_options;
drop policy "Game creator can update options" on public.activity_options;
drop policy "Game creator can delete options" on public.activity_options;
drop policy "Read votes of visible games" on public.votes;
drop policy "Participants vote while voting is open" on public.votes;
drop policy "Change own vote while voting is open" on public.votes;
drop policy "Users can delete own votes" on public.votes;
drop policy "Anyone can read game players" on public.activity_players;
drop policy "Join self or be invited by host" on public.activity_players;
drop policy "Users can update own game player status" on public.activity_players;
drop policy "Leave own game or host removes player" on public.activity_players;
drop trigger trg_creator_joins_game     on public.activities;
drop trigger trg_enforce_game_capacity  on public.activity_players;
drop trigger trg_game_players_immutable on public.activity_players;
drop trigger trg_sync_current_players   on public.activity_players;
drop trigger trg_sync_vote_counts       on public.votes;
drop function public.user_in_game(uuid);
drop function public.user_is_game_host(uuid);
drop function public.auto_transition_all_games();
drop function public.auto_transition_game(uuid);
drop function public.create_game_with_options(text, text, text, text, text, integer, integer, uuid, timestamptz, numeric, numeric, text, text, jsonb, uuid[]);
drop function public.fn_creator_joins_game();
drop function public.fn_enforce_game_capacity();

-- ═══ From neon/schema.sql ═════════════════════════════════════════════════════

-- ─── 6. Functions ─────────────────────────────────────────────────────────────
-- All SECURITY DEFINER functions pin search_path. An unpinned search_path lets a
-- caller who can create objects in an earlier schema shadow the referenced tables.

-- RLS helpers. SECURITY DEFINER so a policy on table X can read table Y without
-- re-entering X's own policy (the 42P17 recursion that migration 011 hit).
create or replace function public.user_in_activity(p_activity_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from activity_players where activity_id = p_activity_id and user_id = public.current_uid());
$$;

create or replace function public.user_is_activity_host(p_activity_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from activities where id = p_activity_id and created_by = public.current_uid());
$$;

create or replace function public.user_in_group(p_group_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select p_group_id is not null and exists (
    select 1 from group_members where group_id = p_group_id and user_id = public.current_uid());
$$;

create or replace function public.user_in_conversation(conv_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from conversation_members
                 where conversation_id = conv_id and user_id = public.current_uid());
$$;

-- The creator is always on their own roster.
create or replace function public.fn_creator_joins_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.activity_players (activity_id, user_id, status)
  values (new.id, new.created_by, 'joined')
  on conflict (activity_id, user_id) do nothing;
  return new;
end;
$$;

-- Denormalised roster count. Counts anything not 'declined', so pending invites
-- are included.
create or replace function public.fn_sync_current_players()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_activity_id uuid;
begin
  v_activity_id := coalesce(new.activity_id, old.activity_id);
  update public.activities
  set current_players = (
    select count(*) from public.activity_players
    where activity_id = v_activity_id and status <> 'declined'
  ), updated_at = now()
  where id = v_activity_id;
  return coalesce(new, old);
end;
$$;

-- Denormalised vote counters. Must be SECURITY DEFINER: activity_options UPDATE is
-- host-only, so a non-host's vote could not otherwise maintain these.
create or replace function public.fn_sync_vote_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_option_id uuid := coalesce(new.option_id, old.option_id);
begin
  update activity_options go
  set in_votes    = (select count(*) from votes v where v.option_id = v_option_id and v.value = 'in'),
      maybe_votes = (select count(*) from votes v where v.option_id = v_option_id and v.value = 'maybe'),
      out_votes   = (select count(*) from votes v where v.option_id = v_option_id and v.value = 'out')
  where go.id = v_option_id;
  return null;
end$$;

-- Bounds roster size. Without this max_players is decorative.
create or replace function public.fn_enforce_activity_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max integer;
  v_count integer;
begin
  if new.status is distinct from 'joined' then
    return new;
  end if;
  select max_players into v_max from activities where id = new.activity_id;
  if v_max is null then
    return new;
  end if;
  select count(*) into v_count from activity_players
  where activity_id = new.activity_id and status = 'joined' and user_id <> new.user_id;
  if v_count >= v_max then
    raise exception 'Activity is full (% of % players)', v_count, v_max
      using errcode = 'check_violation';
  end if;
  return new;
end$$;

-- Generic column-immutability guard. RLS WITH CHECK sees only NEW, never OLD, so
-- a policy cannot express "this column must not change" — this can.
create or replace function public.fn_forbid_column_change()
returns trigger language plpgsql set search_path = public as $$
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

-- ── Activity state machine: proposal -> confirmed | cancelled -> completed ────────
create or replace function public.auto_transition_activity(p_activity_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_activity        activities;
  v_max_in      integer;
  v_tie_cnt     integer;
  v_winner      uuid;
  v_min         integer;
  v_total_votes integer;
begin
  select * into v_activity from activities where id = p_activity_id;
  if not found then return; end if;

  if v_activity.status = 'confirmed' then
    if exists (select 1 from activity_options go
               where go.id = v_activity.confirmed_option_id and go.date::date < current_date) then
      update activities set status = 'completed', updated_at = now() where id = p_activity_id;
    end if;
    return;
  end if;

  if v_activity.status <> 'proposal' or v_activity.voting_deadline > now() then return; end if;

  select count(*) into v_total_votes
  from votes v join activity_options go on go.id = v.option_id
  where go.activity_id = p_activity_id;

  select coalesce(max(cnt), 0) into v_max_in
  from (select count(*) filter (where v.value = 'in') as cnt
        from activity_options go left join votes v on v.option_id = go.id
        where go.activity_id = p_activity_id and go.status = 'approved'
        group by go.id) s;

  if v_max_in = 0 then
    update activities set status = 'cancelled',
      cancellation_reason = case when v_total_votes = 0
        then 'Voting closed with no votes cast'
        else 'Voting closed with no attendees available' end,
      updated_at = now()
    where id = p_activity_id;
    return;
  end if;

  v_min := coalesce(v_activity.min_players, 1);
  if v_max_in < v_min then
    update activities set status = 'cancelled',
      cancellation_reason = format('Voting closed below minimum attendees (%s of %s)', v_max_in, v_min),
      updated_at = now()
    where id = p_activity_id;
    return;
  end if;

  select count(*) into v_tie_cnt
  from (select go.id, count(*) filter (where v.value = 'in') as cnt
        from activity_options go left join votes v on v.option_id = go.id
        where go.activity_id = p_activity_id and go.status = 'approved'
        group by go.id) s
  where s.cnt = v_max_in;

  if v_tie_cnt = 1 then
    select s.id into v_winner
    from (select go.id, count(*) filter (where v.value = 'in') as cnt
          from activity_options go left join votes v on v.option_id = go.id
          where go.activity_id = p_activity_id and go.status = 'approved'
          group by go.id) s
    where s.cnt = v_max_in;
    update activities set status = 'confirmed', confirmed_option_id = v_winner, updated_at = now()
    where id = p_activity_id;
    return;
  end if;

  -- Tie: stay in proposal for the host to break, but record it so the UI can
  -- surface a tie without the host having to open the activity as the clock expires.
  update activities
  set cancellation_reason = format('Tied on %s time options - host must choose', v_tie_cnt),
      updated_at = now()
  where id = p_activity_id and coalesce(cancellation_reason, '') not like 'Tied on%';
end$$;

create or replace function public.auto_transition_all_activities()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_ct integer := 0;
begin
  for v_id in
    select id from activities
    where (status = 'proposal'  and voting_deadline < now())
       or (status = 'confirmed' and confirmed_option_id is not null)
  loop
    -- Per-activity guard: one malformed `date` text value would otherwise abort the
    -- whole sweep and block every pending transition for every activity.
    begin
      perform public.auto_transition_activity(v_id);
      v_ct := v_ct + 1;
    exception when others then
      raise warning 'auto_transition_activity(%) failed: %', v_id, sqlerrm;
    end;
  end loop;
  return v_ct;
end$$;

-- ── Transactional activity creation ──────────────────────────────────────────────
-- created_by comes from public.current_uid(), never a parameter, so a caller cannot
-- attribute an activity to someone else.
create or replace function public.create_activity_with_options(
  p_title            text,
  p_type         text,
  p_type_emoji   text default '',
  p_type_color   text default '#2D7A3A',
  p_intensity        text default 'Casual',
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
  v_activity_id  uuid;
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
  -- so it can neither land in the past nor after the activity itself.
  v_deadline := coalesce(p_voting_deadline, v_earliest - interval '24 hours');
  if v_deadline >= v_earliest then v_deadline := v_earliest - interval '1 hour'; end if;
  if v_deadline <= now() then v_deadline := least(now() + interval '1 hour', v_earliest); end if;

  insert into activities (
    title, type, type_emoji, type_color, status, intensity,
    max_players, min_players, created_by, group_id, voting_deadline,
    total_cost, per_person_cost, confirmed_option_id, description, visibility
  ) values (
    btrim(p_title), p_type, coalesce(p_type_emoji, ''), coalesce(p_type_color, '#2D7A3A'),
    'proposal', p_intensity,
    p_max_players, p_min_players, v_uid, p_group_id, v_deadline,
    coalesce(p_total_cost, 0), coalesce(p_per_person_cost, 0), null, p_description,
    case when p_visibility in ('Public', 'Group Only', 'Private') then p_visibility else 'Private' end
  ) returning id into v_activity_id;

  insert into activity_options (activity_id, date, display_date, start_time, end_time, location, status)
  select v_activity_id, o->>'date', to_char(((o->>'date')::date), 'Dy, Mon FMDD'),
         o->>'start_time', nullif(o->>'end_time', ''), coalesce(o->>'location', ''), 'approved'
  from jsonb_array_elements(p_options) o;

  -- The creator is added by trg_creator_joins_activity, so skip them here to avoid
  -- tripping unique(activity_id, user_id).
  foreach v_invitee in array coalesce(p_invited_ids, '{}'::uuid[]) loop
    if v_invitee is distinct from v_uid then
      insert into activity_players (activity_id, user_id, status)
      values (v_activity_id, v_invitee, 'invited')
      on conflict (activity_id, user_id) do nothing;
    end if;
  end loop;

  return v_activity_id;
end$$;

-- ─── 7. Triggers ──────────────────────────────────────────────────────────────
drop trigger if exists trg_creator_joins_activity on public.activities;
create trigger trg_creator_joins_activity
  after insert on public.activities
  for each row execute function public.fn_creator_joins_activity();

drop trigger if exists trg_sync_current_players on public.activity_players;
create trigger trg_sync_current_players
  after insert or delete or update on public.activity_players
  for each row execute function public.fn_sync_current_players();

drop trigger if exists trg_enforce_activity_capacity on public.activity_players;
create trigger trg_enforce_activity_capacity
  before insert or update on public.activity_players
  for each row execute function public.fn_enforce_activity_capacity();

drop trigger if exists trg_activity_players_immutable on public.activity_players;
create trigger trg_activity_players_immutable
  before update on public.activity_players
  for each row execute function public.fn_forbid_column_change('activity_id', 'user_id');

drop trigger if exists trg_sync_vote_counts on public.votes;
create trigger trg_sync_vote_counts
  after insert or delete or update on public.votes
  for each row execute function public.fn_sync_vote_counts();

drop trigger if exists trg_conversation_members_immutable on public.conversation_members;
create trigger trg_conversation_members_immutable
  before update on public.conversation_members
  for each row execute function public.fn_forbid_column_change('conversation_id', 'user_id');

drop trigger if exists trg_friend_requests_immutable on public.friend_requests;
create trigger trg_friend_requests_immutable
  before update on public.friend_requests
  for each row execute function public.fn_forbid_column_change('requester_id', 'addressee_id');

-- ─── 8. Row level security (policies on the renamed tables) ──────────────────
-- activities
create policy "Activities visible by role or visibility" on public.activities
  for select to authenticated using (
    created_by = public.current_uid()
    or public.user_in_activity(id)
    or visibility = 'Public'
    or (visibility = 'Group Only' and public.user_in_group(group_id))
  );
create policy "Create activities as self" on public.activities
  for insert to authenticated with check (created_by = public.current_uid());
create policy "Activity creator can update activities" on public.activities
  for update to authenticated using (created_by = public.current_uid()) with check (created_by = public.current_uid());
create policy "Activity creator can delete" on public.activities
  for delete to authenticated using (public.current_uid() = created_by);

-- activity_options
create policy "Read options of visible activities" on public.activity_options
  for select to authenticated using (
    public.user_is_activity_host(activity_id)
    or public.user_in_activity(activity_id)
    or exists (select 1 from activities g where g.id = activity_options.activity_id and g.visibility = 'Public')
  );
create policy "Host adds approved options, others propose pending" on public.activity_options
  for insert to authenticated with check (
    public.user_is_activity_host(activity_id)
    or (status = 'pending' and proposed_by = public.current_uid())
  );
create policy "Activity creator can update options" on public.activity_options
  for update to authenticated
  using (public.user_is_activity_host(activity_id)) with check (public.user_is_activity_host(activity_id));
create policy "Activity creator can delete options" on public.activity_options
  for delete to authenticated using (public.user_is_activity_host(activity_id));

-- votes
create policy "Read votes of visible activities" on public.votes
  for select to authenticated using (
    exists (select 1 from activity_options go where go.id = votes.option_id
            and (public.user_is_activity_host(go.activity_id) or public.user_in_activity(go.activity_id)))
  );
create policy "Participants vote while voting is open" on public.votes
  for insert to authenticated with check (
    user_id = public.current_uid()
    and exists (
      select 1 from activity_options go join activities g on g.id = go.activity_id
      where go.id = votes.option_id
        and go.status = 'approved' and g.status = 'proposal' and g.voting_deadline > now()
        and (public.user_is_activity_host(go.activity_id) or public.user_in_activity(go.activity_id))
    )
  );
create policy "Change own vote while voting is open" on public.votes
  for update to authenticated
  using (user_id = public.current_uid())
  with check (
    user_id = public.current_uid()
    and exists (
      select 1 from activity_options go join activities g on g.id = go.activity_id
      where go.id = votes.option_id and g.status = 'proposal' and g.voting_deadline > now()
    )
  );
create policy "Users can delete own votes" on public.votes
  for delete to authenticated using (public.current_uid() = user_id);

-- activity_players
create policy "Anyone can read activity players" on public.activity_players
  for select to authenticated using (true);
create policy "Join self or be invited by host" on public.activity_players
  for insert to authenticated with check (user_id = public.current_uid() or public.user_is_activity_host(activity_id));
create policy "Users can update own activity player status" on public.activity_players
  for update to authenticated
  using (user_id = public.current_uid() or public.user_is_activity_host(activity_id))
  with check (user_id = public.current_uid() or public.user_is_activity_host(activity_id));
create policy "Leave own activity or host removes player" on public.activity_players
  for delete to authenticated using (user_id = public.current_uid() or public.user_is_activity_host(activity_id));

-- ─── 10. Function EXECUTE grants ──────────────────────────────────────────────
-- Postgres grants EXECUTE to PUBLIC on every new function, and anonymous/authenticated
-- inherit it. Revoking from the role alone does nothing — PUBLIC must be revoked
-- first. Trigger functions need no role-level EXECUTE (it is checked when the
-- trigger is created), so they are revoked outright.
revoke all on function public.fn_sync_vote_counts()       from public, anonymous, authenticated;
revoke all on function public.fn_enforce_activity_capacity()  from public, anonymous, authenticated;
revoke all on function public.fn_creator_joins_activity()     from public, anonymous, authenticated;
revoke all on function public.fn_sync_current_players()   from public, anonymous, authenticated;
revoke all on function public.fn_forbid_column_change()   from public, anonymous, authenticated;

revoke all on function public.user_in_activity(uuid)         from public, anonymous, authenticated;
revoke all on function public.user_is_activity_host(uuid)    from public, anonymous, authenticated;
revoke all on function public.user_in_group(uuid)        from public, anonymous, authenticated;
revoke all on function public.user_in_conversation(uuid) from public, anonymous, authenticated;
grant execute on function public.user_in_activity(uuid)         to authenticated;
grant execute on function public.user_is_activity_host(uuid)    to authenticated;
grant execute on function public.user_in_group(uuid)        to authenticated;
grant execute on function public.user_in_conversation(uuid) to authenticated;

revoke all on function public.auto_transition_activity(uuid)  from public, anonymous, authenticated;
revoke all on function public.auto_transition_all_activities() from public, anonymous, authenticated;
grant execute on function public.auto_transition_activity(uuid)  to authenticated;
grant execute on function public.auto_transition_all_activities() to authenticated;

revoke all on function public.create_activity_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]) from public, anonymous, authenticated;
grant execute on function public.create_activity_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]) to authenticated;

-- Make the Data API pick up the new names immediately.
notify pgrst, 'reload schema';
