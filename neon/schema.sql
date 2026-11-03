-- ═══════════════════════════════════════════════════════════════════════════════
-- OptIn — Neon schema
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- The full schema for the Neon project backing the app (Neon Auth + Data API).
-- Ported on 2026-11-03 from supabase/000_baseline_schema.sql (in git history),
-- which was itself reconstructed from the live Supabase project's catalogs.
--
-- Differences from the Supabase version:
--   * auth.uid() -> public.current_uid(), a uuid wrapper over Neon's
--     auth.user_id(). Requires the Data API to be enabled first (it creates the
--     `auth` schema and the `authenticated` / `anonymous` roles).
--   * No FK from profiles.id to the auth users table, and no trigger creating a
--     profile on sign-up: Neon Auth's users live in the managed `neon_auth`
--     schema. AuthContext.fetchProfile creates the profile row on first sign-in.
--   * No realtime publication — the app polls instead (src/lib/db.ts `poll`).
--   * Supabase's `anon` role is Neon's `anonymous`.
--   * Explicit table grants (section 11); Supabase granted these implicitly.
--
-- Vocabulary (2026-11-03): OptIn schedules any in-person group plan, with sports
-- as the launch wedge (PRODUCT.md, "Scope"). A plan is an *activity*: tables are
-- activities / activity_options / activity_players, keyed by activity_id. The
-- kind of activity (Basketball, Board games, ...) is its *type*: type /
-- type_emoji / type_color on activities, type / type_emoji on groups (nullable:
-- a friend group can do many things). Casual vs Competitive is `intensity`.
-- Databases built before this need neon/migrations/ (applied in date order).
--
-- Apply to an empty database in one go (Neon SQL editor, psql, or the Neon MCP).
-- It is idempotent for tables/indexes/functions/triggers, but `create policy` is
-- not — re-running needs the policies dropped first.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Neon Auth puts the user id in the JWT `sub` claim, which the Data API exposes
-- as auth.user_id() (text). Every id column here is uuid, so policies and RPCs
-- go through this wrapper instead of Supabase's auth.uid(). Returns null for
-- anonymous requests and direct (non-Data-API) connections.
-- SECURITY DEFINER because Neon does not grant `authenticated` USAGE on the
-- `auth` schema — called as the invoker, every policy fails with
-- "permission denied for schema auth".
create or replace function public.current_uid()
returns uuid language sql stable security definer set search_path = '' as $$
  select nullif(auth.user_id(), '')::uuid
$$;

-- ─── 2. Tables ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid not null,
  email text not null,
  name text not null,
  initials text not null,
  color text not null,
  bio text default ''::text not null,
  avatar_url text,
  activities_played integer default 0 not null,
  weeks_played integer default 0 not null,
  attendance_rate integer default 0 not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  username text
);

create table if not exists public.groups (
  id uuid default gen_random_uuid() not null,
  name text not null,
  type text,                          -- null: the group does many things
  type_emoji text default '' not null,
  color text not null,
  member_count integer default 0 not null,
  next_activity text,
  initials text not null,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  id uuid default gen_random_uuid() not null,
  group_id uuid,
  user_id uuid,
  role text default 'member'::text,
  joined_at timestamptz default now()
);

create table if not exists public.activities (
  id uuid default gen_random_uuid() not null,
  title text not null,
  type text not null,                 -- e.g. 'Basketball', 'Dinner', 'Board games'
  type_emoji text not null,
  type_color text not null,
  status text default 'proposal'::text not null,
  intensity text,
  max_players integer,
  current_players integer default 0 not null,
  created_by uuid not null,
  group_id uuid,
  voting_deadline timestamptz not null,
  total_cost numeric default 0 not null,
  per_person_cost numeric default 0 not null,
  cost_type text default 'fixed'::text not null,     -- 'free' | 'per_player' | 'fixed'
  confirmed_option_id uuid,
  description text,
  visibility text default 'Public'::text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  cancellation_reason text,
  min_players integer
);

create table if not exists public.activity_options (
  id uuid default gen_random_uuid() not null,
  activity_id uuid not null,
  date text not null,
  display_date text not null,
  start_time text not null,
  end_time text,
  starts_at timestamptz not null,         -- set by trg_sync_activity_option_times
  ends_at timestamptz,
  location text not null,
  in_votes integer default 0,
  maybe_votes integer default 0,
  out_votes integer default 0,
  created_at timestamptz default now(),
  status text default 'approved'::text not null,
  proposed_by uuid
);

create table if not exists public.votes (
  id uuid default gen_random_uuid() not null,
  option_id uuid,
  user_id uuid,
  value text,
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.activity_players (
  id uuid default gen_random_uuid() not null,
  activity_id uuid,
  user_id uuid,
  status text,
  joined_at timestamptz default now()
);

create table if not exists public.conversations (
  id uuid default gen_random_uuid() not null,
  type text,
  group_id uuid,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.conversation_members (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid,
  user_id uuid,
  unread_count integer default 0,
  last_read_at timestamptz default now(),
  joined_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid,
  sender_id uuid,
  content text not null,
  is_system boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.friend_requests (
  id uuid default uuid_generate_v4() not null,
  requester_id uuid not null,
  addressee_id uuid not null,
  status text default 'pending'::text not null,
  created_at timestamptz default now() not null,
  responded_at timestamptz
);

create table if not exists public.friendships (
  id uuid default uuid_generate_v4() not null,
  user_a_id uuid not null,
  user_b_id uuid not null,
  created_at timestamptz default now() not null
);

-- ─── 3. Primary keys, unique and check constraints ────────────────────────────
alter table public.profiles             add constraint profiles_pkey PRIMARY KEY (id);
alter table public.groups               add constraint groups_pkey PRIMARY KEY (id);
alter table public.group_members        add constraint group_members_pkey PRIMARY KEY (id);
alter table public.activities                add constraint activities_pkey PRIMARY KEY (id);
alter table public.activity_options         add constraint activity_options_pkey PRIMARY KEY (id);
alter table public.votes                add constraint votes_pkey PRIMARY KEY (id);
alter table public.activity_players         add constraint activity_players_pkey PRIMARY KEY (id);
alter table public.conversations        add constraint conversations_pkey PRIMARY KEY (id);
alter table public.conversation_members add constraint conversation_members_pkey PRIMARY KEY (id);
alter table public.messages             add constraint messages_pkey PRIMARY KEY (id);
alter table public.friend_requests      add constraint friend_requests_pkey PRIMARY KEY (id);
alter table public.friendships          add constraint friendships_pkey PRIMARY KEY (id);

alter table public.activity_players add constraint activity_players_activity_id_user_id_key UNIQUE (activity_id, user_id);
alter table public.votes        add constraint votes_option_id_user_id_key UNIQUE (option_id, user_id);

alter table public.activities add constraint activities_status_check
  CHECK (status = ANY (ARRAY['proposal'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text]));
alter table public.activities add constraint activities_visibility_check
  CHECK (visibility = ANY (ARRAY['Public'::text, 'Group Only'::text, 'Private'::text]));
alter table public.activities add constraint activities_intensity_check
  CHECK (intensity = ANY (ARRAY['Casual'::text, 'Competitive'::text]));
alter table public.activities add constraint activities_max_players_check
  CHECK ((max_players IS NULL) OR (max_players >= 1));
alter table public.activities add constraint activities_min_players_check
  CHECK ((min_players IS NULL) OR (min_players >= 1));
alter table public.activities add constraint activities_cost_type_check
  CHECK (cost_type = ANY (ARRAY['free'::text, 'per_player'::text, 'fixed'::text]));
alter table public.activity_options add constraint activity_options_ends_after_starts_check
  CHECK (ends_at is null or ends_at > starts_at);
alter table public.activities add constraint activities_cost_non_negative
  CHECK ((total_cost >= (0)::numeric) AND (per_person_cost >= (0)::numeric));

-- NOTE: deliberately no `end_time > start_time` CHECK. These are text columns, so
-- the comparison is lexical and rejects every legitimate overnight slot
-- (22:00 -> 01:00). Add one only after migrating times to timestamptz.
alter table public.activity_options add constraint activity_options_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text]));
alter table public.activity_players add constraint activity_players_status_check
  CHECK (status = ANY (ARRAY['joined'::text, 'invited'::text, 'declined'::text]));
alter table public.votes add constraint votes_value_check
  CHECK (value = ANY (ARRAY['in'::text, 'maybe'::text, 'out'::text]));
alter table public.group_members add constraint group_members_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'member'::text]));
alter table public.conversations add constraint conversations_type_check
  CHECK (type = ANY (ARRAY['direct'::text, 'group'::text]));
alter table public.friend_requests add constraint friend_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]));
alter table public.friend_requests add constraint friend_requests_users_different
  CHECK (requester_id <> addressee_id);
alter table public.friendships add constraint friendships_users_different
  CHECK (user_a_id <> user_b_id);

-- ─── 4. Foreign keys ──────────────────────────────────────────────────────────
alter table public.groups add constraint groups_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table public.group_members add constraint group_members_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id);
alter table public.group_members add constraint group_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);

-- ON DELETE CASCADE on created_by: deleting a user deletes the activities they
-- created, cascading to those activities' options, votes and roster rows. The
-- alternative is SET NULL, which preserves the activity but leaves it with nobody
-- who can administer it (every write policy is created_by = public.current_uid()).
alter table public.activities add constraint activities_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.activities add constraint activities_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id);
alter table public.activities add constraint activities_confirmed_option_id_fkey
  FOREIGN KEY (confirmed_option_id) REFERENCES activity_options(id) ON DELETE SET NULL;

alter table public.activity_options add constraint activity_options_activity_id_fkey
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;
alter table public.activity_options add constraint activity_options_proposed_by_fkey
  FOREIGN KEY (proposed_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.votes add constraint votes_option_id_fkey
  FOREIGN KEY (option_id) REFERENCES activity_options(id) ON DELETE CASCADE;
alter table public.votes add constraint votes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table public.activity_players add constraint activity_players_activity_id_fkey
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;
alter table public.activity_players add constraint activity_players_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table public.conversations add constraint conversations_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id);
alter table public.conversation_members add constraint conversation_members_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
alter table public.conversation_members add constraint conversation_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);
alter table public.messages add constraint messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
alter table public.messages add constraint messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES profiles(id);

alter table public.friend_requests add constraint friend_requests_requester_id_fkey
  FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.friend_requests add constraint friend_requests_addressee_id_fkey
  FOREIGN KEY (addressee_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.friendships add constraint friendships_user_a_id_fkey
  FOREIGN KEY (user_a_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.friendships add constraint friendships_user_b_id_fkey
  FOREIGN KEY (user_b_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ─── 5. Indexes ───────────────────────────────────────────────────────────────
create unique index if not exists profiles_username_unique
  on public.profiles using btree (username) where (username is not null);
create unique index if not exists activity_options_unique_slot
  on public.activity_options using btree (activity_id, date, start_time);
create index if not exists idx_activities_status_deadline
  on public.activities using btree (status, voting_deadline);
create index if not exists idx_friend_requests_addressee_pending
  on public.friend_requests using btree (addressee_id, status, created_at desc);
create unique index if not exists idx_friend_requests_pending_unique
  on public.friend_requests using btree (requester_id, addressee_id) where (status = 'pending'::text);
create unique index if not exists idx_friendships_unique_pair
  on public.friendships using btree (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));

-- ─── 6. Functions ─────────────────────────────────────────────────────────────

-- The one place the app's timezone assumption lives (single-region app; see
-- docs/BACKLOG.md item #23). Every comparison of a proposed time against "now"
-- goes through this, so correcting the region is a one-line change.
create or replace function public.app_timezone()
returns text language sql immutable set search_path = public as $$
  select 'America/New_York'
$$;

-- All SECURITY DEFINER functions pin search_path. An unpinned search_path lets a
-- caller who can create objects in an earlier schema shadow the referenced tables.

-- 'declined' is excluded so leaving an activity actually revokes access
-- (BACKLOG #22); 'invited' still sees the activity so they can decide.
create or replace function public.user_in_activity(p_activity_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from activity_players
                 where activity_id = p_activity_id and user_id = public.current_uid()
                   and status <> 'declined');
$$;

create or replace function public.user_is_activity_host(p_activity_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from activities where id = p_activity_id and created_by = public.current_uid());
$$;

-- Whether the caller may add themselves to an activity: they already have a row
-- (invited, or declined and coming back), or the activity is Public, or it is
-- Group Only and they are in the group. Private activities need an invite.
create or replace function public.can_self_join_activity(p_activity_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from activity_players
                 where activity_id = p_activity_id and user_id = public.current_uid())
      or exists (select 1 from activities a
                 where a.id = p_activity_id
                   and (a.visibility = 'Public'
                        or (a.visibility = 'Group Only' and public.user_in_group(a.group_id))));
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

create or replace function public.auto_transition_activity(p_activity_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_activity    activities;
  v_max_in      integer;
  v_tie_cnt     integer;
  v_winner      uuid;
  v_min         integer;
  v_total_votes integer;
  v_max_maybe   integer;
  v_maybe_ties  integer;
begin
  select * into v_activity from activities where id = p_activity_id;
  if not found then return; end if;

  -- Past confirmed activities become completed. Compares a real instant
  -- (ends_at, or starts_at for an option with no end time) with now(), not
  -- `date::date < current_date`, which resolved "today" in UTC.
  if v_activity.status = 'confirmed' then
    if exists (select 1 from activity_options go
               where go.id = v_activity.confirmed_option_id
                 and coalesce(go.ends_at, go.starts_at) < now()) then
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
    update activities set status = 'confirmed', confirmed_option_id = v_winner,
      cancellation_reason = null, updated_at = now()
    where id = p_activity_id;
    return;
  end if;

  -- Tied on 'in' votes: a strictly higher 'maybe' count breaks the tie (BACKLOG #39).
  select max(t.maybe_cnt) into v_max_maybe
  from (select go.id, count(*) filter (where v.value = 'maybe') as maybe_cnt
        from activity_options go left join votes v on v.option_id = go.id
        where go.activity_id = p_activity_id and go.status = 'approved'
        group by go.id
        having count(*) filter (where v.value = 'in') = v_max_in) t;

  select count(*) into v_maybe_ties
  from (select go.id, count(*) filter (where v.value = 'maybe') as maybe_cnt
        from activity_options go left join votes v on v.option_id = go.id
        where go.activity_id = p_activity_id and go.status = 'approved'
        group by go.id
        having count(*) filter (where v.value = 'in') = v_max_in) t
  where t.maybe_cnt = v_max_maybe;

  if v_maybe_ties = 1 then
    select t.id into v_winner
    from (select go.id, count(*) filter (where v.value = 'maybe') as maybe_cnt
          from activity_options go left join votes v on v.option_id = go.id
          where go.activity_id = p_activity_id and go.status = 'approved'
          group by go.id
          having count(*) filter (where v.value = 'in') = v_max_in) t
    where t.maybe_cnt = v_max_maybe;
    update activities set status = 'confirmed', confirmed_option_id = v_winner,
      cancellation_reason = null, updated_at = now()
    where id = p_activity_id;
    return;
  end if;

  -- Still tied: stay in proposal for the host to break, but record it so the
  -- UI can surface the tie without the host opening the activity.
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

-- created_by comes from public.current_uid(), never a parameter, so a caller
-- cannot attribute an activity to someone else. The creator is joined by
-- trg_creator_joins_activity and auto-voted "in" on their earliest option, so a
-- solo plan doesn't cancel itself at the deadline (BACKLOG #41).
create or replace function public.create_activity_with_options(
  p_title            text,
  p_type             text,
  p_type_emoji       text default '',
  p_type_color       text default '#2D7A3A',
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
  p_invited_ids      uuid[] default '{}'::uuid[],
  p_cost_type        text default 'fixed'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid          uuid := public.current_uid();
  v_activity_id  uuid;
  v_opt          jsonb;
  v_earliest     timestamptz;
  v_deadline     timestamptz;
  v_invitee      uuid;
  v_earliest_opt uuid;
  v_today_local  date := (now() at time zone public.app_timezone())::date;
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
    -- "Today" in the app's timezone, not UTC (BACKLOG #42).
    if (v_opt->>'date')::date < v_today_local then
      raise exception 'Proposed times can''t be in the past (option %)', v_opt->>'date'
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

  select min(((o->>'date') || ' ' || (o->>'start_time'))::timestamp at time zone public.app_timezone())
  into v_earliest
  from jsonb_array_elements(p_options) o;

  -- Voting closes before the earliest proposed start, clamped into (now, start)
  -- so it can neither land in the past nor after the activity itself.
  v_deadline := coalesce(p_voting_deadline, v_earliest - interval '24 hours');
  if v_deadline >= v_earliest then v_deadline := v_earliest - interval '1 hour'; end if;
  if v_deadline <= now() then v_deadline := least(now() + interval '1 hour', v_earliest); end if;

  insert into activities (
    title, type, type_emoji, type_color, status, intensity,
    max_players, min_players, created_by, group_id, voting_deadline,
    total_cost, per_person_cost, cost_type, confirmed_option_id, description, visibility
  ) values (
    btrim(p_title), p_type, coalesce(p_type_emoji, ''), coalesce(p_type_color, '#2D7A3A'),
    'proposal', p_intensity,
    p_max_players, p_min_players, v_uid, p_group_id, v_deadline,
    coalesce(p_total_cost, 0), coalesce(p_per_person_cost, 0),
    case when p_cost_type in ('free', 'per_player', 'fixed') then p_cost_type else 'fixed' end,
    null, p_description,
    case when p_visibility in ('Public', 'Group Only', 'Private') then p_visibility else 'Private' end
  ) returning id into v_activity_id;

  insert into activity_options (activity_id, date, display_date, start_time, end_time, location, status)
  select v_activity_id, o->>'date', to_char(((o->>'date')::date), 'Dy, Mon FMDD'),
         o->>'start_time', nullif(o->>'end_time', ''), coalesce(o->>'location', ''), 'approved'
  from jsonb_array_elements(p_options) o;

  select go.id into v_earliest_opt
  from activity_options go where go.activity_id = v_activity_id
  order by go.starts_at asc limit 1;
  if v_earliest_opt is not null then
    insert into votes (option_id, user_id, value) values (v_earliest_opt, v_uid, 'in')
    on conflict (option_id, user_id) do nothing;
  end if;

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

-- Real instants alongside the text date/start_time/end_time columns, computed
-- in app_timezone(). end_time <= start_time means the option crosses midnight.
create or replace function public.fn_sync_activity_option_times()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.starts_at := (new.date || ' ' || new.start_time)::timestamp at time zone public.app_timezone();
  if new.end_time is null or new.end_time = '' then
    new.ends_at := null;
  elsif new.end_time <= new.start_time then
    new.ends_at := ((new.date::date + 1)::text || ' ' || new.end_time)::timestamp at time zone public.app_timezone();
  else
    new.ends_at := (new.date || ' ' || new.end_time)::timestamp at time zone public.app_timezone();
  end if;
  return new;
end$$;

-- Attendance stats, written when an activity completes (BACKLOG #20, #34).
-- SECURITY DEFINER because profiles UPDATE is self-only, so the client could
-- never update other attendees' rows.
create or replace function public.fn_record_activity_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    for v_user_id in
      select user_id from activity_players where activity_id = new.id and status = 'joined'
    loop
      update profiles p
      set activities_played = activities_played + 1,
          weeks_played = weeks_played + 1,
          attendance_rate = coalesce((
            select round(100.0 * count(*) filter (where ap.status = 'joined') / count(*))::integer
            from activity_players ap
            join activities a on a.id = ap.activity_id
            where ap.user_id = v_user_id
              and a.status = 'completed'
              and ap.status in ('joined', 'declined')
          ), 0)
      where p.id = v_user_id;
    end loop;
  end if;
  return new;
end$$;

-- Messaging RPCs. Conversations and their members are only ever created here,
-- never by direct inserts: the old "any signed-in user may add any member"
-- policy let anyone join any conversation (and read it) by id.
--
-- Returns the caller's existing 1:1 conversation with p_other, or creates one.
-- Requires a friendship: direct messages are friends-only.
create or replace function public.get_or_create_direct_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := public.current_uid();
  v_conv uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if p_other is null or p_other = v_uid then
    raise exception 'Pick someone else to message' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from friendships
                 where least(user_a_id, user_b_id) = least(v_uid, p_other)
                   and greatest(user_a_id, user_b_id) = greatest(v_uid, p_other)) then
    raise exception 'You can only message friends' using errcode = 'insufficient_privilege';
  end if;

  -- Serialise concurrent calls for the same pair so they can't create two.
  perform pg_advisory_xact_lock(hashtext(least(v_uid, p_other)::text || greatest(v_uid, p_other)::text));

  select c.id into v_conv
  from conversations c
  where c.type = 'direct'
    and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = v_uid)
    and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = p_other)
  order by c.created_at
  limit 1;

  if v_conv is null then
    insert into conversations (type, name) values ('direct', null) returning id into v_conv;
    insert into conversation_members (conversation_id, user_id)
    values (v_conv, v_uid), (v_conv, p_other);
  end if;
  return v_conv;
end$$;

-- Group chats are friends-only, as the UI already says; enforced here too.
create or replace function public.create_group_conversation(p_name text, p_member_ids uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := public.current_uid();
  v_conv   uuid;
  v_others uuid[];
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(array_agg(distinct m), '{}') into v_others
  from unnest(coalesce(p_member_ids, '{}'::uuid[])) m where m is distinct from v_uid;
  if cardinality(v_others) = 0 then
    raise exception 'Add at least one other person' using errcode = 'check_violation';
  end if;
  if exists (select 1 from unnest(v_others) o
             where not exists (select 1 from friendships f
                               where least(f.user_a_id, f.user_b_id) = least(v_uid, o)
                                 and greatest(f.user_a_id, f.user_b_id) = greatest(v_uid, o))) then
    raise exception 'Group chats can only include friends' using errcode = 'insufficient_privilege';
  end if;

  insert into conversations (type, name)
  values ('group', nullif(btrim(coalesce(p_name, '')), ''))
  returning id into v_conv;
  insert into conversation_members (conversation_id, user_id)
  select v_conv, u from unnest(array_append(v_others, v_uid)) u;
  return v_conv;
end$$;

-- Bumps the conversation's updated_at (chat list order) and every other
-- member's unread_count. Nothing incremented unread_count before, so unread
-- badges could never appear.
create or replace function public.fn_on_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set updated_at = new.created_at where id = new.conversation_id;
  update conversation_members
  set unread_count = coalesce(unread_count, 0) + 1
  where conversation_id = new.conversation_id and user_id is distinct from new.sender_id;
  return null;
end$$;

-- Friend requests (the UI calls them message requests) go through these two
-- RPCs only. Returns 'sent', 'already_pending', 'already_friends', or 'accepted'
-- when the other person had already asked you (their request is accepted
-- instead of creating a crossed duplicate).
create or replace function public.send_friend_request(p_addressee uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := public.current_uid();
  v_reverse uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if p_addressee is null or p_addressee = v_uid
     or not exists (select 1 from profiles where id = p_addressee) then
    raise exception 'Pick someone else to add' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext(least(v_uid, p_addressee)::text || greatest(v_uid, p_addressee)::text));

  if exists (select 1 from friendships
             where least(user_a_id, user_b_id) = least(v_uid, p_addressee)
               and greatest(user_a_id, user_b_id) = greatest(v_uid, p_addressee)) then
    return 'already_friends';
  end if;
  if exists (select 1 from friend_requests
             where requester_id = v_uid and addressee_id = p_addressee and status = 'pending') then
    return 'already_pending';
  end if;

  select id into v_reverse from friend_requests
  where requester_id = p_addressee and addressee_id = v_uid and status = 'pending';
  if v_reverse is not null then
    perform public.respond_to_friend_request(v_reverse, true);
    return 'accepted';
  end if;

  insert into friend_requests (requester_id, addressee_id, status) values (v_uid, p_addressee, 'pending');
  return 'sent';
end$$;

-- Accept or decline an incoming request in one transaction. On accept, creates
-- the friendship and returns the pair's direct conversation id.
create or replace function public.respond_to_friend_request(p_request_id uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.current_uid();
  v_req friend_requests;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_req from friend_requests
  where id = p_request_id and addressee_id = v_uid and status = 'pending'
  for update;
  if not found then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;

  update friend_requests
  set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
  where id = v_req.id;

  if not p_accept then return null; end if;

  insert into friendships (user_a_id, user_b_id)
  values (least(v_req.requester_id, v_uid), greatest(v_req.requester_id, v_uid))
  on conflict do nothing;
  return public.get_or_create_direct_conversation(v_req.requester_id);
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

drop trigger if exists trg_sync_activity_option_times on public.activity_options;
create trigger trg_sync_activity_option_times
  before insert or update of date, start_time, end_time on public.activity_options
  for each row execute function public.fn_sync_activity_option_times();

drop trigger if exists trg_record_activity_attendance on public.activities;
create trigger trg_record_activity_attendance
  after update on public.activities
  for each row execute function public.fn_record_activity_attendance();

drop trigger if exists trg_on_message_insert on public.messages;
create trigger trg_on_message_insert
  after insert on public.messages
  for each row execute function public.fn_on_message_insert();

-- ─── 8. Row level security ────────────────────────────────────────────────────
alter table public.profiles             enable row level security;
alter table public.groups               enable row level security;
alter table public.group_members        enable row level security;
alter table public.activities                enable row level security;
alter table public.activity_options         enable row level security;
alter table public.votes                enable row level security;
alter table public.activity_players         enable row level security;
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.friend_requests      enable row level security;
alter table public.friendships          enable row level security;

-- profiles
create policy "Users can read all profiles" on public.profiles
  for select to authenticated using (true);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (public.current_uid() = id);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (public.current_uid() = id) with check (public.current_uid() = id);

-- groups
create policy "Anyone can read groups" on public.groups
  for select to authenticated using (true);
create policy "Authenticated users can create groups" on public.groups
  for insert to authenticated with check (public.current_uid() = created_by);
create policy "Group admins can update groups" on public.groups
  for update to authenticated
  using (id in (select group_id from group_members
                where user_id = public.current_uid() and role = 'admin'))
  with check (id in (select group_id from group_members
                     where user_id = public.current_uid() and role = 'admin'));

-- group_members
create policy "Anyone can read group members" on public.group_members
  for select to authenticated using (true);
create policy "Users can join groups" on public.group_members
  for insert to authenticated with check (user_id = public.current_uid());
create policy "Users can leave groups" on public.group_members
  for delete to authenticated using (user_id = public.current_uid());

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
    or (status = 'pending' and proposed_by = public.current_uid() and public.user_in_activity(activity_id))
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
create policy "Host can clear votes on own options" on public.votes
  for delete to authenticated using (
    exists (select 1 from activity_options go
            where go.id = votes.option_id and public.user_is_activity_host(go.activity_id))
  );

-- activity_players
create policy "Anyone can read activity players" on public.activity_players
  for select to authenticated using (true);
create policy "Join self or be invited by host" on public.activity_players
  for insert to authenticated with check (
    public.user_is_activity_host(activity_id)
    or (user_id = public.current_uid() and public.can_self_join_activity(activity_id))
  );
create policy "Users can update own activity player status" on public.activity_players
  for update to authenticated
  using (user_id = public.current_uid() or public.user_is_activity_host(activity_id))
  with check (user_id = public.current_uid() or public.user_is_activity_host(activity_id));
create policy "Leave own activity or host removes player" on public.activity_players
  for delete to authenticated using (user_id = public.current_uid() or public.user_is_activity_host(activity_id));

-- conversations — created only by get_or_create_direct_conversation /
-- create_group_conversation, so there is no INSERT policy here or on members.
create policy "Users can read own conversations" on public.conversations
  for select to authenticated using (public.user_in_conversation(id));
create policy "Conversation members can update conversations" on public.conversations
  for update to authenticated
  using (public.user_in_conversation(id)) with check (public.user_in_conversation(id));

-- conversation_members
-- Single SELECT policy via the SECURITY DEFINER helper. Production still carries
-- a second, self-referential policy from an earlier migration; permissive
-- policies OR together, so that one is redundant at best and a 42P17 recursion
-- risk at worst. Not reproduced here.
create policy "Users can view conversation members if they are in the conversation"
  on public.conversation_members
  for select to authenticated using (public.user_in_conversation(conversation_id));
create policy "Users can leave conversations" on public.conversation_members
  for delete to authenticated using (user_id = public.current_uid());
create policy "Users can update own conversation membership" on public.conversation_members
  for update to authenticated using (user_id = public.current_uid()) with check (user_id = public.current_uid());

-- messages
create policy "Users can read messages in own conversations" on public.messages
  for select to authenticated using (public.user_in_conversation(conversation_id));
create policy "Users can send messages in own conversations" on public.messages
  for insert to authenticated
  with check (sender_id = public.current_uid() and coalesce(is_system, false) = false
              and public.user_in_conversation(conversation_id));

-- friend_requests — insert/update only through send_friend_request /
-- respond_to_friend_request (SECURITY DEFINER), so there are no write policies.
create policy "Users can read own friend requests" on public.friend_requests
  for select to authenticated using (public.current_uid() = requester_id or public.current_uid() = addressee_id);

-- friendships — created only by respond_to_friend_request; either side may remove.
create policy "Users can read own friendships" on public.friendships
  for select to authenticated using (public.current_uid() = user_a_id or public.current_uid() = user_b_id);
create policy "Users can remove own friendships" on public.friendships
  for delete to authenticated using (public.current_uid() = user_a_id or public.current_uid() = user_b_id);

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
  numeric, numeric, text, text, jsonb, uuid[], text) from public, anonymous, authenticated;
grant execute on function public.create_activity_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[], text) to authenticated;

revoke all on function public.app_timezone() from public, anonymous, authenticated;
grant execute on function public.app_timezone() to authenticated;
revoke all on function public.can_self_join_activity(uuid) from public, anonymous, authenticated;
grant execute on function public.can_self_join_activity(uuid) to authenticated;
revoke all on function public.fn_sync_activity_option_times() from public, anonymous, authenticated;
revoke all on function public.fn_record_activity_attendance() from public, anonymous, authenticated;
revoke all on function public.fn_on_message_insert()          from public, anonymous, authenticated;
revoke all on function public.get_or_create_direct_conversation(uuid) from public, anonymous, authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
revoke all on function public.create_group_conversation(text, uuid[]) from public, anonymous, authenticated;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;
revoke all on function public.send_friend_request(uuid) from public, anonymous, authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public, anonymous, authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;

-- ─── 11. Table grants ─────────────────────────────────────────────────────────
-- The Data API runs each request as `authenticated` (signed-in) or `anonymous`.
-- Table privileges are the first gate; RLS (section 8) then filters rows.
-- `anonymous` gets nothing: every screen requires sign-in.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.current_uid() to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STILL REQUIRED AFTER THIS FILE — not expressible in SQL alone
--
-- 1. pg_cron, or nothing ever advances an activity unless a user opens the app:
--      create extension if not exists pg_cron;
--      select cron.schedule('auto-transition-activities', '*/15 * * * *',
--                           $$select public.auto_transition_all_activities()$$);
--
--
-- KNOWN-OPEN, carried over from production (see docs/BACKLOG.md):
--   * `activity_players`, `profiles`, `groups`, `group_members` SELECT are USING
--     (true). Scoped TO authenticated here (production still has TO public, so
--     anonymous can read them there), but still unrestricted among signed-in users.
--   * activity_options.date / start_time / end_time stay text for display;
--     starts_at / ends_at (trigger-maintained, in app_timezone()) are what the
--     server compares. app_timezone() is a single fixed zone for the whole app.
--   * `current_players` has two writers that count different things.
-- ═══════════════════════════════════════════════════════════════════════════════
