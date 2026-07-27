-- Add friend request + friendship support for message gating

create table if not exists friend_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_users_different check (requester_id <> addressee_id)
); 

create unique index if not exists idx_friend_requests_pending_unique
  on friend_requests (requester_id, addressee_id)
  where status = 'pending';

create index if not exists idx_friend_requests_addressee_pending
  on friend_requests (addressee_id, status, created_at desc);

create table if not exists friendships (
  id uuid primary key default uuid_generate_v4(),
  user_a_id uuid not null references profiles(id) on delete cascade,
  user_b_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_users_different check (user_a_id <> user_b_id)
);

create unique index if not exists idx_friendships_unique_pair
  on friendships (
    least(user_a_id, user_b_id),
    greatest(user_a_id, user_b_id)
  );

alter table friend_requests enable row level security;
alter table friendships enable row level security;

-- Wrapped with `drop policy if exists` (unlike the original file, which had
-- bare `create policy`): friend_requests/friendships are 003's sole source of
-- RLS for these two tables -- nothing later re-establishes them the way
-- 20260327015818_add_rls_policies_for_all_tables.sql does for every other
-- table -- so these can't be stripped the way 001's were. But this file has no
-- ledger entry, so a push to the real (already-populated) production project
-- runs it fresh regardless of whether the objects already exist, and
-- `CREATE POLICY` has no `IF NOT EXISTS` form. Confirmed live: `ERROR: policy
-- "Users can read own friend requests" for table "friend_requests" already
-- exists (SQLSTATE 42710)`.
drop policy if exists "Users can read own friend requests" on friend_requests;
create policy "Users can read own friend requests"
  on friend_requests for select using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );

drop policy if exists "Users can create outgoing friend requests" on friend_requests;
create policy "Users can create outgoing friend requests"
  on friend_requests for insert with check (
    auth.uid() = requester_id
  );

drop policy if exists "Addressee can update own incoming requests" on friend_requests;
create policy "Addressee can update own incoming requests"
  on friend_requests for update using (
    auth.uid() = addressee_id
  );

drop policy if exists "Users can read own friendships" on friendships;
create policy "Users can read own friendships"
  on friendships for select using (
    auth.uid() = user_a_id or auth.uid() = user_b_id
  );

drop policy if exists "Users can create friendships they are part of" on friendships;
create policy "Users can create friendships they are part of"
  on friendships for insert with check (
    auth.uid() = user_a_id or auth.uid() = user_b_id
  );
