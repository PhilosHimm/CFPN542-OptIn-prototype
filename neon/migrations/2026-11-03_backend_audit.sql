-- ═══════════════════════════════════════════════════════════════════════════════
-- 2026-11-03 — backend audit fixes
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Run after 2026-11-03_activity_noun.sql. Brings a database to the current
-- neon/schema.sql. Two groups of fixes:
--
-- 1. Restores the last five Supabase migrations (019, 021, 022, 023; 020 was
--    already reflected), which the Neon port never carried over. Without them
--    activity creation was broken: the client sends p_cost_type, and the RPC
--    had no such parameter.
--      * activities.cost_type, and p_cost_type on create_activity_with_options
--      * activity_options.starts_at / ends_at + app_timezone(); completion and
--        the past-date check use real instants, not UTC calendar dates
--      * user_in_activity excludes 'declined' (leaving revokes access)
--      * maybe-vote tiebreak; attendance stats when an activity completes
--      * the creator is auto-voted "in" on their earliest option
-- 2. Social and messaging holes found in the audit:
--      * any user could add anyone (themselves included) to any conversation,
--        and read it -> conversations are created only by RPCs
--      * unread_count was never incremented -> trigger on messages
--      * DMs were duplicated on every "start chat" -> get-or-create RPC
--      * clients could insert is_system messages
--      * anyone could insert a friendship directly, skipping the request;
--        "remove friend" had no DELETE policy and silently did nothing
--      * anyone could self-join a Private activity by id; anyone could propose
--        times on activities they aren't in; hosts couldn't clear others' votes
--
-- The client must ship in the same release (the old client creates
-- conversations and friend requests with direct inserts, which this removes).
-- Run as one transaction (Neon MCP run_sql_transaction).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Columns ──────────────────────────────────────────────────────────────────
-- cost_type: "Free" and "$0/player" were indistinguishable (BACKLOG #48).
alter table public.activities add column if not exists cost_type text;
update public.activities set cost_type = case
  when coalesce(total_cost, 0) = 0 and coalesce(per_person_cost, 0) > 0 then 'per_player'
  when coalesce(total_cost, 0) > 0 then 'fixed'
  else 'free' end
where cost_type is null;
alter table public.activities alter column cost_type set default 'fixed';
alter table public.activities alter column cost_type set not null;
alter table public.activities drop constraint if exists activities_cost_type_check;
alter table public.activities add constraint activities_cost_type_check
  CHECK (cost_type = ANY (ARRAY['free'::text, 'per_player'::text, 'fixed'::text]));

-- starts_at / ends_at: real instants for the text date/time columns (BACKLOG #23, #24).
alter table public.activity_options add column if not exists starts_at timestamptz;
alter table public.activity_options add column if not exists ends_at timestamptz;

-- The one place the app's timezone assumption lives (single-region app; see
-- docs/BACKLOG.md item #23). Every comparison of a proposed time against "now"
-- goes through this, so correcting the region is a one-line change.
create or replace function public.app_timezone()
returns text language sql immutable set search_path = public as $$
  select 'America/New_York'
$$;

update public.activity_options
set starts_at = (date || ' ' || start_time)::timestamp at time zone public.app_timezone(),
    ends_at = case
      when end_time is null or end_time = '' then null
      when end_time <= start_time then ((date::date + 1)::text || ' ' || end_time)::timestamp at time zone public.app_timezone()
      else (date || ' ' || end_time)::timestamp at time zone public.app_timezone() end;
alter table public.activity_options alter column starts_at set not null;
alter table public.activity_options drop constraint if exists activity_options_ends_after_starts_check;
alter table public.activity_options add constraint activity_options_ends_after_starts_check
  CHECK (ends_at is null or ends_at > starts_at);

-- ─── Functions ────────────────────────────────────────────────────────────────
-- Appending p_cost_type changes the signature, so drop the 15-arg form first.
drop function if exists public.create_activity_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[]);

-- 'declined' is excluded so leaving an activity actually revokes access
-- (BACKLOG #22); 'invited' still sees the activity so they can decide.
create or replace function public.user_in_activity(p_activity_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from activity_players
                 where activity_id = p_activity_id and user_id = public.current_uid()
                   and status <> 'declined');
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

-- ─── Triggers ─────────────────────────────────────────────────────────────────
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

-- ─── Policies ─────────────────────────────────────────────────────────────────
drop policy if exists "Join self or be invited by host" on public.activity_players;
create policy "Join self or be invited by host" on public.activity_players
  for insert to authenticated with check (
    public.user_is_activity_host(activity_id)
    or (user_id = public.current_uid() and public.can_self_join_activity(activity_id))
  );
drop policy if exists "Host adds approved options, others propose pending" on public.activity_options;
create policy "Host adds approved options, others propose pending" on public.activity_options
  for insert to authenticated with check (
    public.user_is_activity_host(activity_id)
    or (status = 'pending' and proposed_by = public.current_uid() and public.user_in_activity(activity_id))
  );
drop policy if exists "Host can clear votes on own options" on public.votes;
create policy "Host can clear votes on own options" on public.votes
  for delete to authenticated using (
    exists (select 1 from activity_options go
            where go.id = votes.option_id and public.user_is_activity_host(go.activity_id))
  );
-- Conversations and members are created only by the messaging RPCs.
drop policy if exists "Authenticated users can create conversations" on public.conversations;
drop policy if exists "Authenticated users can add conversation members" on public.conversation_members;
drop policy if exists "Users can leave conversations" on public.conversation_members;
create policy "Users can leave conversations" on public.conversation_members
  for delete to authenticated using (user_id = public.current_uid());
-- System messages are written by the server, never spoofed by a client.
drop policy if exists "Users can send messages in own conversations" on public.messages;
create policy "Users can send messages in own conversations" on public.messages
  for insert to authenticated
  with check (sender_id = public.current_uid() and coalesce(is_system, false) = false
              and public.user_in_conversation(conversation_id));
-- Friend requests and friendships change only through the friend RPCs; the old
-- insert policy let anyone create a friendship with anyone, skipping the request.
drop policy if exists "Users can create outgoing friend requests" on public.friend_requests;
drop policy if exists "Addressee can update own incoming requests" on public.friend_requests;
drop policy if exists "Users can create friendships they are part of" on public.friendships;
drop policy if exists "Users can remove own friendships" on public.friendships;
create policy "Users can remove own friendships" on public.friendships
  for delete to authenticated using (public.current_uid() = user_a_id or public.current_uid() = user_b_id);

-- ─── Grants ───────────────────────────────────────────────────────────────────
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
revoke all on function public.create_activity_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[], text) from public, anonymous, authenticated;
grant execute on function public.create_activity_with_options(
  text, text, text, text, text, integer, integer, uuid, timestamptz,
  numeric, numeric, text, text, jsonb, uuid[], text) to authenticated;

notify pgrst, 'reload schema';
