-- OptIn Sports Scheduling App - Initial Database Schema
-- Run this in the Supabase SQL Editor to set up all required tables
--
-- STRUCTURE-ONLY: no `create policy` statements. The original version of this
-- file defined ~25 RLS policies, most `using (true)` ("Games are viewable by
-- everyone", "Group members are viewable by everyone", etc). Because Postgres
-- OR's every permissive policy on a table together, leaving those in place
-- would silently defeat every later restriction --
-- 20260327015818_add_rls_policies_for_all_tables.sql and every migration after
-- it -- the same "additive policy left an old permissive one active" bug this
-- whole audit kept finding elsewhere (013, 015's ineffective REVOKE). Five of
-- the original policy names also collided by exact name with later files
-- (confirmed: "Authenticated users can create groups", "...join groups",
-- "Users can update own game player status", "...own profile", "...own
-- votes"), which is what surfaced this on a fresh preview-branch build:
-- `ERROR: policy "Authenticated users can create groups" for table "groups"
-- already exists`.
--
-- Tables, RLS-enable, indexes, triggers and the realtime publication are
-- unchanged from the original file. Policies are established fresh starting
-- with 20260327015818_add_rls_policies_for_all_tables.sql.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Profiles ──────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  initials text not null default '',
  color text not null default '#007AFF',
  bio text not null default '',
  avatar_url text,
  games_played integer not null default 0,
  weeks_played integer not null default 0,
  attendance_rate integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- ─── Groups ────────────────────────────────────────────────────────────────────
create table if not exists groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sport text not null,
  sport_emoji text not null default '',
  color text not null default '#007AFF',
  member_count integer not null default 0,
  next_game text,
  initials text not null default '',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table groups enable row level security;

-- ─── Group Members ─────────────────────────────────────────────────────────────
create table if not exists group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

alter table group_members enable row level security;

-- ─── Games ─────────────────────────────────────────────────────────────────────
create table if not exists games (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  sport text not null,
  sport_emoji text not null default '',
  sport_color text not null default '#007AFF',
  status text not null default 'proposal' check (status in ('proposal', 'confirmed', 'completed', 'cancelled')),
  game_type text not null default 'Casual' check (game_type in ('Casual', 'Competitive')),
  max_players integer not null default 10,
  current_players integer not null default 0,
  created_by uuid not null references profiles(id),
  group_id uuid not null references groups(id),
  voting_deadline timestamptz not null default (now() + interval '24 hours'),
  total_cost numeric(10,2) not null default 0,
  per_person_cost numeric(10,2) not null default 0,
  confirmed_option_id uuid,
  description text,
  visibility text not null default 'Public' check (visibility in ('Public', 'Group Only', 'Private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table games enable row level security;

-- ─── Game Options ──────────────────────────────────────────────────────────────
create table if not exists game_options (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references games(id) on delete cascade,
  date text not null,
  display_date text not null,
  start_time text not null,
  end_time text not null,
  location text not null default '',
  in_votes integer not null default 0,
  maybe_votes integer not null default 0,
  out_votes integer not null default 0,
  created_at timestamptz not null default now()
);

alter table game_options enable row level security;

-- ─── Votes ─────────────────────────────────────────────────────────────────────
create table if not exists votes (
  id uuid primary key default uuid_generate_v4(),
  option_id uuid not null references game_options(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  value text not null check (value in ('in', 'maybe', 'out')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(option_id, user_id)
);

alter table votes enable row level security;

-- ─── Game Players ──────────────────────────────────────────────────────────────
create table if not exists game_players (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('joined', 'invited', 'declined')),
  joined_at timestamptz not null default now(),
  unique(game_id, user_id)
);

alter table game_players enable row level security;

-- ─── Conversations ─────────────────────────────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('direct', 'group')),
  group_id uuid references groups(id) on delete set null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversations enable row level security;

-- ─── Conversation Members ──────────────────────────────────────────────────────
create table if not exists conversation_members (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  unread_count integer not null default 0,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  unique(conversation_id, user_id)
);

alter table conversation_members enable row level security;

-- ─── Messages ──────────────────────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  content text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

-- ─── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_games_group on games(group_id);
create index if not exists idx_games_status on games(status);
create index if not exists idx_game_options_game on game_options(game_id);
create index if not exists idx_votes_option on votes(option_id);
create index if not exists idx_game_players_game on game_players(game_id);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_messages_created on messages(created_at);
create index if not exists idx_conversation_members_user on conversation_members(user_id);
create index if not exists idx_group_members_group on group_members(group_id);

-- ─── Updated At Trigger ────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger games_updated_at before update on games
  for each row execute function update_updated_at();

create trigger conversations_updated_at before update on conversations
  for each row execute function update_updated_at();

create trigger votes_updated_at before update on votes
  for each row execute function update_updated_at();

-- ─── Enable Realtime ───────────────────────────────────────────────────────────
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table game_players;
