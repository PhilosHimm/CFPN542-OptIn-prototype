-- OptIn Sports Scheduling App - Initial Database Schema
-- Run this in the Supabase SQL Editor to set up all required tables

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

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

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

create policy "Groups are viewable by everyone"
  on groups for select using (true);

create policy "Authenticated users can create groups"
  on groups for insert with check (auth.uid() = created_by);

create policy "Group creator can update"
  on groups for update using (auth.uid() = created_by);

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

create policy "Group members are viewable by everyone"
  on group_members for select using (true);

create policy "Authenticated users can join groups"
  on group_members for insert with check (auth.uid() = user_id);

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

create policy "Games are viewable by everyone"
  on games for select using (true);

create policy "Authenticated users can create games"
  on games for insert with check (auth.uid() = created_by);

create policy "Game creator can update"
  on games for update using (auth.uid() = created_by);

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

create policy "Game options are viewable by everyone"
  on game_options for select using (true);

create policy "Authenticated users can create game options"
  on game_options for insert with check (true);

create policy "Vote counts can be updated"
  on game_options for update using (true);

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

create policy "Votes are viewable by everyone"
  on votes for select using (true);

create policy "Authenticated users can vote"
  on votes for insert with check (auth.uid() = user_id);

create policy "Users can update own votes"
  on votes for update using (auth.uid() = user_id);

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

create policy "Game players are viewable by everyone"
  on game_players for select using (true);

create policy "Authenticated users can join games"
  on game_players for insert with check (auth.uid() = user_id);

create policy "Users can update own game player status"
  on game_players for update using (auth.uid() = user_id);

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

-- NOTE: the SELECT policy for `conversations` is defined below, after
-- `conversation_members` exists. It used to sit here and referenced that table
-- ten lines before it was created, which failed with
--   ERROR: relation "conversation_members" does not exist (SQLSTATE 42P01)
-- and aborted the rest of the script.

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

create policy "Members can view own memberships"
  on conversation_members for select using (auth.uid() = user_id);

create policy "Members can update own memberships"
  on conversation_members for update using (auth.uid() = user_id);

-- Moved here from the Conversations block above: this policy reads
-- `conversation_members`, so that table must already exist.
create policy "Conversation members can view conversations"
  on conversations for select using (
    exists (
      select 1 from conversation_members
      where conversation_id = conversations.id
      and user_id = auth.uid()
    )
  );

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

create policy "Conversation members can view messages"
  on messages for select using (
    exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id
      and user_id = auth.uid()
    )
  );

create policy "Conversation members can send messages"
  on messages for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id
      and user_id = auth.uid()
    )
  );

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
