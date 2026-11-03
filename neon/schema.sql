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
create or replace function public.current_uid()
returns uuid language sql stable set search_path = '' as $$
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
  games_played integer default 0 not null,
  weeks_played integer default 0 not null,
  attendance_rate integer default 0 not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  username text
);

create table if not exists public.groups (
  id uuid default gen_random_uuid() not null,
  name text not null,
  sport text not null,
  sport_emoji text not null,
  color text not null,
  member_count integer default 0 not null,
  next_game text,
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

create table if not exists public.games (
  id uuid default gen_random_uuid() not null,
  title text not null,
  sport text not null,
  sport_emoji text not null,
  sport_color text not null,
  status text default 'proposal'::text not null,
  game_type text,
  max_players integer,
  current_players integer default 0 not null,
  created_by uuid not null,
  group_id uuid,
  voting_deadline timestamptz not null,
  total_cost numeric default 0 not null,
  per_person_cost numeric default 0 not null,
  confirmed_option_id uuid,
  description text,
  visibility text default 'Public'::text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  cancellation_reason text,
  min_players integer
);

create table if not exists public.game_options (
  id uuid default gen_random_uuid() not null,
  game_id uuid not null,
  date text not null,
  display_date text not null,
  start_time text not null,
  end_time text,
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

create table if not exists public.game_players (
  id uuid default gen_random_uuid() not null,
  game_id uuid,
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
alter table public.games                add constraint games_pkey PRIMARY KEY (id);
alter table public.game_options         add constraint game_options_pkey PRIMARY KEY (id);
alter table public.votes                add constraint votes_pkey PRIMARY KEY (id);
alter table public.game_players         add constraint game_players_pkey PRIMARY KEY (id);
alter table public.conversations        add constraint conversations_pkey PRIMARY KEY (id);
alter table public.conversation_members add constraint conversation_members_pkey PRIMARY KEY (id);
alter table public.messages             add constraint messages_pkey PRIMARY KEY (id);
alter table public.friend_requests      add constraint friend_requests_pkey PRIMARY KEY (id);
alter table public.friendships          add constraint friendships_pkey PRIMARY KEY (id);

alter table public.game_players add constraint game_players_game_id_user_id_key UNIQUE (game_id, user_id);
alter table public.votes        add constraint votes_option_id_user_id_key UNIQUE (option_id, user_id);

alter table public.games add constraint games_status_check
  CHECK (status = ANY (ARRAY['proposal'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text]));
alter table public.games add constraint games_visibility_check
  CHECK (visibility = ANY (ARRAY['Public'::text, 'Group Only'::text, 'Private'::text]));
alter table public.games add constraint games_game_type_check
  CHECK (game_type = ANY (ARRAY['Casual'::text, 'Competitive'::text]));
alter table public.games add constraint games_max_players_check
  CHECK ((max_players IS NULL) OR (max_players >= 1));
alter table public.games add constraint games_min_players_check
  CHECK ((min_players IS NULL) OR (min_players >= 1));
alter table public.games add constraint games_cost_non_negative
  CHECK ((total_cost >= (0)::numeric) AND (per_person_cost >= (0)::numeric));

-- NOTE: deliberately no `end_time > start_time` CHECK. These are text columns, so
-- the comparison is lexical and rejects every legitimate overnight slot
-- (22:00 -> 01:00). Add one only after migrating times to timestamptz.
alter table public.game_options add constraint game_options_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text]));
alter table public.game_players add constraint game_players_status_check
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

-- ON DELETE CASCADE on created_by: deleting a user deletes the games they
-- created, cascading to those games' options, votes and roster rows. The
-- alternative is SET NULL, which preserves the game but leaves it with nobody
-- who can administer it (every write policy is created_by = public.current_uid()).
alter table public.games add constraint games_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.games add constraint games_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id);
alter table public.games add constraint games_confirmed_option_id_fkey
  FOREIGN KEY (confirmed_option_id) REFERENCES game_options(id) ON DELETE SET NULL;

alter table public.game_options add constraint game_options_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table public.game_options add constraint game_options_proposed_by_fkey
  FOREIGN KEY (proposed_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.votes add constraint votes_option_id_fkey
  FOREIGN KEY (option_id) REFERENCES game_options(id) ON DELETE CASCADE;
alter table public.votes add constraint votes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table public.game_players add constraint game_players_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table public.game_players add constraint game_players_user_id_fkey
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
create unique index if not exists game_options_unique_slot
  on public.game_options using btree (game_id, date, start_time);
create index if not exists idx_games_status_deadline
  on public.games using btree (status, voting_deadline);
create index if not exists idx_friend_requests_addressee_pending
  on public.friend_requests using btree (addressee_id, status, created_at desc);
create unique index if not exists idx_friend_requests_pending_unique
  on public.friend_requests using btree (requester_id, addressee_id) where (status = 'pending'::text);
create unique index if not exists idx_friendships_unique_pair
  on public.friendships using btree (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));

-- ─── 6. Functions ─────────────────────────────────────────────────────────────
-- All SECURITY DEFINER functions pin search_path. An unpinned search_path lets a
-- caller who can create objects in an earlier schema shadow the referenced tables.

-- RLS helpers. SECURITY DEFINER so a policy on table X can read table Y without
-- re-entering X's own policy (the 42P17 recursion that migration 011 hit).
create or replace function public.user_in_game(p_game_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from game_players where game_id = p_game_id and user_id = public.current_uid());
$$;

create or replace function public.user_is_game_host(p_game_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from games where id = p_game_id and created_by = public.current_uid());
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
create or replace function public.fn_creator_joins_game()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.game_players (game_id, user_id, status)
  values (new.id, new.created_by, 'joined')
  on conflict (game_id, user_id) do nothing;
  return new;
end;
$$;

-- Denormalised roster count. Counts anything not 'declined', so pending invites
-- are included.
create or replace function public.fn_sync_current_players()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_game_id uuid;
begin
  v_game_id := coalesce(new.game_id, old.game_id);
  update public.games
  set current_players = (
    select count(*) from public.game_players
    where game_id = v_game_id and status <> 'declined'
  ), updated_at = now()
  where id = v_game_id;
  return coalesce(new, old);
end;
$$;

-- Denormalised vote counters. Must be SECURITY DEFINER: game_options UPDATE is
-- host-only, so a non-host's vote could not otherwise maintain these.
create or replace function public.fn_sync_vote_counts()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- Bounds roster size. Without this max_players is decorative.
create or replace function public.fn_enforce_game_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max integer;
  v_count integer;
begin
  if new.status is distinct from 'joined' then
    return new;
  end if;
  select max_players into v_max from games where id = new.game_id;
  if v_max is null then
    return new;
  end if;
  select count(*) into v_count from game_players
  where game_id = new.game_id and status = 'joined' and user_id <> new.user_id;
  if v_count >= v_max then
    raise exception 'Game is full (% of % players)', v_count, v_max
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

-- ── Game state machine: proposal -> confirmed | cancelled -> completed ────────
create or replace function public.auto_transition_game(p_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_game        games;
  v_max_in      integer;
  v_tie_cnt     integer;
  v_winner      uuid;
  v_min         integer;
  v_total_votes integer;
begin
  select * into v_game from games where id = p_game_id;
  if not found then return; end if;

  if v_game.status = 'confirmed' then
    if exists (select 1 from game_options go
               where go.id = v_game.confirmed_option_id and go.date::date < current_date) then
      update games set status = 'completed', updated_at = now() where id = p_game_id;
    end if;
    return;
  end if;

  if v_game.status <> 'proposal' or v_game.voting_deadline > now() then return; end if;

  select count(*) into v_total_votes
  from votes v join game_options go on go.id = v.option_id
  where go.game_id = p_game_id;

  select coalesce(max(cnt), 0) into v_max_in
  from (select count(*) filter (where v.value = 'in') as cnt
        from game_options go left join votes v on v.option_id = go.id
        where go.game_id = p_game_id and go.status = 'approved'
        group by go.id) s;

  if v_max_in = 0 then
    update games set status = 'cancelled',
      cancellation_reason = case when v_total_votes = 0
        then 'Voting closed with no votes cast'
        else 'Voting closed with no attendees available' end,
      updated_at = now()
    where id = p_game_id;
    return;
  end if;

  v_min := coalesce(v_game.min_players, 1);
  if v_max_in < v_min then
    update games set status = 'cancelled',
      cancellation_reason = format('Voting closed below minimum attendees (%s of %s)', v_max_in, v_min),
      updated_at = now()
    where id = p_game_id;
    return;
  end if;

  select count(*) into v_tie_cnt
  from (select go.id, count(*) filter (where v.value = 'in') as cnt
        from game_options go left join votes v on v.option_id = go.id
        where go.game_id = p_game_id and go.status = 'approved'
        group by go.id) s
  where s.cnt = v_max_in;

  if v_tie_cnt = 1 then
    select s.id into v_winner
    from (select go.id, count(*) filter (where v.value = 'in') as cnt
          from game_options go left join votes v on v.option_id = go.id
          where go.game_id = p_game_id and go.status = 'approved'
          group by go.id) s
    where s.cnt = v_max_in;
    update games set status = 'confirmed', confirmed_option_id = v_winner, updated_at = now()
    where id = p_game_id;
    return;
  end if;

  -- Tie: stay in proposal for the host to break, but record it so the UI can
  -- surface a tie without the host having to open the game as the clock expires.
  update games
  set cancellation_reason = format('Tied on %s time options - host must choose', v_tie_cnt),
      updated_at = now()
  where id = p_game_id and coalesce(cancellation_reason, '') not like 'Tied on%';
end$$;

create or replace function public.auto_transition_all_games()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_ct integer := 0;
begin
  for v_id in
    select id from games
    where (status = 'proposal'  and voting_deadline < now())
       or (status = 'confirmed' and confirmed_option_id is not null)
  loop
    -- Per-game guard: one malformed `date` text value would otherwise abort the
    -- whole sweep and block every pending transition for every game.
    begin
      perform public.auto_transition_game(v_id);
      v_ct := v_ct + 1;
    exception when others then
      raise warning 'auto_transition_game(%) failed: %', v_id, sqlerrm;
    end;
  end loop;
  return v_ct;
end$$;

-- ── Transactional game creation ──────────────────────────────────────────────
-- created_by comes from public.current_uid(), never a parameter, so a caller cannot
-- attribute a game to someone else.
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
    title, sport, sport_emoji, sport_color, status, game_type,
    max_players, min_players, created_by, group_id, voting_deadline,
    total_cost, per_person_cost, confirmed_option_id, description, visibility
  ) values (
    btrim(p_title), p_sport, coalesce(p_sport_emoji, ''), coalesce(p_sport_color, '#2D7A3A'),
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

-- ─── 7. Triggers ──────────────────────────────────────────────────────────────
drop trigger if exists trg_creator_joins_game on public.games;
create trigger trg_creator_joins_game
  after insert on public.games
  for each row execute function public.fn_creator_joins_game();

drop trigger if exists trg_sync_current_players on public.game_players;
create trigger trg_sync_current_players
  after insert or delete or update on public.game_players
  for each row execute function public.fn_sync_current_players();

drop trigger if exists trg_enforce_game_capacity on public.game_players;
create trigger trg_enforce_game_capacity
  before insert or update on public.game_players
  for each row execute function public.fn_enforce_game_capacity();

drop trigger if exists trg_game_players_immutable on public.game_players;
create trigger trg_game_players_immutable
  before update on public.game_players
  for each row execute function public.fn_forbid_column_change('game_id', 'user_id');

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

-- ─── 8. Row level security ────────────────────────────────────────────────────
alter table public.profiles             enable row level security;
alter table public.groups               enable row level security;
alter table public.group_members        enable row level security;
alter table public.games                enable row level security;
alter table public.game_options         enable row level security;
alter table public.votes                enable row level security;
alter table public.game_players         enable row level security;
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

-- games
create policy "Games visible by role or visibility" on public.games
  for select to authenticated using (
    created_by = public.current_uid()
    or public.user_in_game(id)
    or visibility = 'Public'
    or (visibility = 'Group Only' and public.user_in_group(group_id))
  );
create policy "Create games as self" on public.games
  for insert to authenticated with check (created_by = public.current_uid());
create policy "Game creator can update games" on public.games
  for update to authenticated using (created_by = public.current_uid()) with check (created_by = public.current_uid());
create policy "Game creator can delete" on public.games
  for delete to authenticated using (public.current_uid() = created_by);

-- game_options
create policy "Read options of visible games" on public.game_options
  for select to authenticated using (
    public.user_is_game_host(game_id)
    or public.user_in_game(game_id)
    or exists (select 1 from games g where g.id = game_options.game_id and g.visibility = 'Public')
  );
create policy "Host adds approved options, others propose pending" on public.game_options
  for insert to authenticated with check (
    public.user_is_game_host(game_id)
    or (status = 'pending' and proposed_by = public.current_uid())
  );
create policy "Game creator can update options" on public.game_options
  for update to authenticated
  using (public.user_is_game_host(game_id)) with check (public.user_is_game_host(game_id));
create policy "Game creator can delete options" on public.game_options
  for delete to authenticated using (public.user_is_game_host(game_id));

-- votes
create policy "Read votes of visible games" on public.votes
  for select to authenticated using (
    exists (select 1 from game_options go where go.id = votes.option_id
            and (public.user_is_game_host(go.game_id) or public.user_in_game(go.game_id)))
  );
create policy "Participants vote while voting is open" on public.votes
  for insert to authenticated with check (
    user_id = public.current_uid()
    and exists (
      select 1 from game_options go join games g on g.id = go.game_id
      where go.id = votes.option_id
        and go.status = 'approved' and g.status = 'proposal' and g.voting_deadline > now()
        and (public.user_is_game_host(go.game_id) or public.user_in_game(go.game_id))
    )
  );
create policy "Change own vote while voting is open" on public.votes
  for update to authenticated
  using (user_id = public.current_uid())
  with check (
    user_id = public.current_uid()
    and exists (
      select 1 from game_options go join games g on g.id = go.game_id
      where go.id = votes.option_id and g.status = 'proposal' and g.voting_deadline > now()
    )
  );
create policy "Users can delete own votes" on public.votes
  for delete to authenticated using (public.current_uid() = user_id);

-- game_players
create policy "Anyone can read game players" on public.game_players
  for select to authenticated using (true);
create policy "Join self or be invited by host" on public.game_players
  for insert to authenticated with check (user_id = public.current_uid() or public.user_is_game_host(game_id));
create policy "Users can update own game player status" on public.game_players
  for update to authenticated
  using (user_id = public.current_uid() or public.user_is_game_host(game_id))
  with check (user_id = public.current_uid() or public.user_is_game_host(game_id));
create policy "Leave own game or host removes player" on public.game_players
  for delete to authenticated using (user_id = public.current_uid() or public.user_is_game_host(game_id));

-- conversations
create policy "Users can read own conversations" on public.conversations
  for select to authenticated using (public.user_in_conversation(id));
create policy "Authenticated users can create conversations" on public.conversations
  for insert to authenticated with check (public.current_uid() is not null);
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
create policy "Authenticated users can add conversation members" on public.conversation_members
  for insert to authenticated with check (public.current_uid() is not null);
create policy "Users can update own conversation membership" on public.conversation_members
  for update to authenticated using (user_id = public.current_uid()) with check (user_id = public.current_uid());

-- messages
create policy "Users can read messages in own conversations" on public.messages
  for select to authenticated using (public.user_in_conversation(conversation_id));
create policy "Users can send messages in own conversations" on public.messages
  for insert to authenticated
  with check (sender_id = public.current_uid() and public.user_in_conversation(conversation_id));

-- friend_requests
create policy "Users can read own friend requests" on public.friend_requests
  for select to authenticated using (public.current_uid() = requester_id or public.current_uid() = addressee_id);
create policy "Users can create outgoing friend requests" on public.friend_requests
  for insert to authenticated with check (public.current_uid() = requester_id);
create policy "Addressee can update own incoming requests" on public.friend_requests
  for update to authenticated
  using (public.current_uid() = addressee_id) with check (public.current_uid() = addressee_id);

-- friendships
create policy "Users can read own friendships" on public.friendships
  for select to authenticated using (public.current_uid() = user_a_id or public.current_uid() = user_b_id);
create policy "Users can create friendships they are part of" on public.friendships
  for insert to authenticated with check (public.current_uid() = user_a_id or public.current_uid() = user_b_id);

-- ─── 10. Function EXECUTE grants ──────────────────────────────────────────────
-- Postgres grants EXECUTE to PUBLIC on every new function, and anonymous/authenticated
-- inherit it. Revoking from the role alone does nothing — PUBLIC must be revoked
-- first. Trigger functions need no role-level EXECUTE (it is checked when the
-- trigger is created), so they are revoked outright.
revoke all on function public.fn_sync_vote_counts()       from public, anonymous, authenticated;
revoke all on function public.fn_enforce_game_capacity()  from public, anonymous, authenticated;
revoke all on function public.fn_creator_joins_game()     from public, anonymous, authenticated;
revoke all on function public.fn_sync_current_players()   from public, anonymous, authenticated;
revoke all on function public.fn_forbid_column_change()   from public, anonymous, authenticated;

revoke all on function public.user_in_game(uuid)         from public, anonymous, authenticated;
revoke all on function public.user_is_game_host(uuid)    from public, anonymous, authenticated;
revoke all on function public.user_in_group(uuid)        from public, anonymous, authenticated;
revoke all on function public.user_in_conversation(uuid) from public, anonymous, authenticated;
grant execute on function public.user_in_game(uuid)         to authenticated;
grant execute on function public.user_is_game_host(uuid)    to authenticated;
grant execute on function public.user_in_group(uuid)        to authenticated;
grant execute on function public.user_in_conversation(uuid) to authenticated;

revoke all on function public.auto_transition_game(uuid)  from public, anonymous, authenticated;
revoke all on function public.auto_transition_all_games() from public, anonymous, authenticated;
grant execute on function public.auto_transition_game(uuid)  to authenticated;
grant execute on function public.auto_transition_all_games() to authenticated;

revoke all on function public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]) from public, anonymous, authenticated;
grant execute on function public.create_game_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]) to authenticated;

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
-- 1. pg_cron, or nothing ever advances a game unless a user opens the app:
--      create extension if not exists pg_cron;
--      select cron.schedule('auto-transition-games', '*/15 * * * *',
--                           $$select public.auto_transition_all_games()$$);
--
--
-- KNOWN-OPEN, carried over from production (see docs/BACKLOG.md):
--   * `game_players`, `profiles`, `groups`, `group_members` SELECT are USING
--     (true). Scoped TO authenticated here (production still has TO public, so
--     anonymous can read them there), but still unrestricted among signed-in users.
--   * game_options.date / start_time / end_time are text with no timezone.
--     auto_transition compares `date::date < current_date`, which resolves in the
--     session timezone (UTC), so games flip to completed at UTC midnight.
--   * `current_players` has two writers that count different things.
-- ═══════════════════════════════════════════════════════════════════════════════
