import { db, isDemoMode, poll } from "@/lib/db";
import { toast } from "sonner";
import {
  activities as mockActivities,
  groups as mockGroups,
  calendarMarkers as mockCalendarMarkers,
  activityTypes,
  type Activity,
  type Group,
  type ActivityStatus,
  type VoteValue,
} from "../data/activities";

function showNetworkError(context: string) {
  toast.error(`Failed to load ${context}. Check your connection and try again.`);
}

export async function getActivities(userId?: string): Promise<Activity[]> {
  if (isDemoMode()) return mockActivities;
  if (!db) return [];

  try {
    // Fire and forget auto-transition to keep activity statuses up to date
    db.rpc("auto_transition_all_activities").then((res) => {
      if (res.error) console.error("Failed to transition activities:", res.error);
    });

    if (!userId) return [];

    // Resolve which activity IDs this user should see before building the query:
    //   - activities they created (always visible to the creator)
    //   - activities they have explicitly accepted (status = "joined")
    // Activities with status = "invited" are intentionally excluded — they belong in
    // the notifications panel until the user accepts.
    const [{ data: joinedRows }, { data: createdRows }, { data: invitedRows }] = await Promise.all([
      db.from("activity_players").select("activity_id").eq("user_id", userId).eq("status", "joined"),
      db.from("activities").select("id").eq("created_by", userId),
      db.from("activity_players").select("activity_id").eq("user_id", userId).eq("status", "invited"),
    ]);

    const invitedIds = new Set((invitedRows || []).map((r: any) => r.activity_id));
    const visibleIds = [
      ...new Set([
        ...(joinedRows || []).map((r: any) => r.activity_id),
        // Creator always sees their own activities, unless they have been explicitly
        // added as an invitee to their own activity (edge-case guard)
        ...(createdRows || []).map((r: any) => r.id).filter((id: string) => !invitedIds.has(id)),
      ]),
    ];

    if (visibleIds.length === 0) return [];

    const { data: activitiesData, error } = await db
      .from("activities")
      .select("*, activity_options!activity_options_activity_id_fkey(*, votes(value, profiles:user_id(initials)))")
      .in("id", visibleIds)
      .order("created_at", { ascending: false });

    if (error || !activitiesData) return [];

    return activitiesData.map((g: any) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      typeEmoji: g.type_emoji,
      typeColor: g.type_color,
      status: g.status as ActivityStatus,
      intensity: g.intensity,
      maxPlayers: g.max_players,
      currentPlayers: g.current_players,
      createdBy: g.created_by,
      groupId: g.group_id,
      countdownH: 0,
      countdownM: 0,
      countdownS: 0,
      options: (g.activity_options || []).map((o: any) => {
        const votes = o.votes || [];
        const inVoters = votes.filter((v: any) => v.value === "in").map((v: any) => v.profiles?.initials || "?");
        return {
          id: o.id,
          date: o.date,
          displayDate: o.display_date,
          startTime: o.start_time,
          endTime: o.end_time,
          location: o.location,
          inVotes: o.in_votes,
          maybeVotes: o.maybe_votes,
          outVotes: o.out_votes,
          voterInitials: inVoters,
        };
      }),
      totalCost: g.total_cost,
      perPersonCost: g.per_person_cost,
      confirmedOptionId: g.confirmed_option_id,
      description: g.description,
      pendingProposalCount: (g.activity_options || []).filter((o: any) => o.status === "pending").length,
    }));
  } catch {
    showNetworkError("activities");
    return [];
  }
}

export async function getActivityById(id: string): Promise<Activity | null> {
  if (isDemoMode()) {
    return mockActivities.find((g) => g.id === id) || null;
  }
  if (!db) return null;

  try {
    // Fire and forget auto-transition for this specific activity
    db.rpc("auto_transition_activity", { p_activity_id: id }).then((res) => {
      if (res.error) console.error("Failed to transition activity:", res.error);
    });

    const { data, error } = await db
      .from("activities")
      .select("*, activity_options!activity_options_activity_id_fkey(*, votes(value, profiles:user_id(initials)))")
      .eq("id", id)
      .single();

    if (error || !data) {
      if (error) showNetworkError("activity details");
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      type: data.type,
      typeEmoji: data.type_emoji,
      typeColor: data.type_color,
      status: data.status as ActivityStatus,
      intensity: data.intensity as "Casual" | "Competitive",
      maxPlayers: data.max_players,
      currentPlayers: data.current_players,
      createdBy: data.created_by,
      groupId: data.group_id ?? "",
      countdownH: 0,
      countdownM: 0,
      countdownS: 0,
      options: ((data as any).activity_options || []).map((o: any) => {
        const votes = o.votes || [];
        const inVoters = votes.filter((v: any) => v.value === "in").map((v: any) => v.profiles?.initials || "?");
        return {
          id: o.id,
          date: o.date,
          displayDate: o.display_date,
          startTime: o.start_time,
          endTime: o.end_time,
          location: o.location,
          inVotes: o.in_votes,
          maybeVotes: o.maybe_votes,
          outVotes: o.out_votes,
          voterInitials: inVoters,
        };
      }),
      totalCost: data.total_cost,
      perPersonCost: data.per_person_cost,
      confirmedOptionId: data.confirmed_option_id ?? undefined,
      description: data.description ?? undefined,
    };
  } catch {
    showNetworkError("activity details");
    return null;
  }
}

export async function getGroups(): Promise<Group[]> {
  if (isDemoMode()) return mockGroups;
  if (!db) return [];

  try {
    // Previously this selected every group in the database with no membership
    // filter, so CreateActivityScreen's `assignedGroup = mapped[0]` picked whatever
    // group sorted first globally — a stranger's group — and attached the new
    // activity to it.
    const { data: auth } = await db.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return [];

    const { data, error } = await db
      .from("groups")
      .select("*, group_members!inner(user_id)")
      .eq("group_members.user_id", uid)
      .order("name");

    if (error || !data) {
      if (error) showNetworkError("groups");
      return [];
    }

    return data.map((g: any) => ({
      id: g.id,
      name: g.name,
      type: g.type ?? "",
      typeEmoji: g.type_emoji,
      color: g.color,
      memberCount: g.member_count,
      nextActivity: g.next_activity,
      initials: g.initials,
    }));
  } catch {
    showNetworkError("groups");
    return [];
  }
}

export async function getCalendarMarkers(userId?: string): Promise<Record<string, { status: ActivityStatus; activityId: string }[]>> {
  if (isDemoMode()) return mockCalendarMarkers;
  if (!db) return {};

  try {
    let query = db
      .from("activity_options")
      .select("date, activity_id, activities!activity_options_activity_id_fkey!inner(id, status)")
      .order("date");

    if (userId) {
      const [{ data: joinedRows }, { data: createdRows }, { data: invitedRows }] = await Promise.all([
        db.from("activity_players").select("activity_id").eq("user_id", userId).eq("status", "joined"),
        db.from("activities").select("id").eq("created_by", userId),
        db.from("activity_players").select("activity_id").eq("user_id", userId).eq("status", "invited"),
      ]);

      const invitedActivityIds = new Set((invitedRows || []).map((r: any) => r.activity_id));

      const accessibleIds = [
        ...new Set([
          ...(joinedRows || []).map((r: any) => r.activity_id),
          ...(createdRows || []).map((r: any) => r.id),
        ]),
      ].filter((id) => !invitedActivityIds.has(id));

      if (accessibleIds.length === 0) return {};
      query = query.in("activity_id", accessibleIds);
    }

    const { data, error } = await query;

    if (error || !data) {
      if (error) showNetworkError("calendar");
      return {};
    }

    const markers: Record<string, { status: ActivityStatus; activityId: string }[]> = {};
    for (const row of data as any[]) {
      const date = row.date;
      const status = row.activities?.status as ActivityStatus;
      const activityId = row.activity_id;
      if (!markers[date]) markers[date] = [];
      if (!markers[date].some((m: any) => m.activityId === activityId)) {
        markers[date].push({ status, activityId });
      }
    }
    return markers;
  } catch {
    showNetworkError("calendar");
    return {};
  }
}

// Activity creation goes exclusively through activityData.ts's saveActivity(), which calls
// the transactional create_activity_with_options RPC (migration 016). A duplicate
// non-atomic createActivity() used to live here — unused by CreateActivityScreen (or
// anywhere else), with its own divergent per-person-cost formula and silently
// discarded option/invite insert errors. Deleted rather than fixed; see
// docs/BACKLOG.md items #19, #30, #43, #49.

export async function castVote(
  optionId: string,
  userId: string,
  value: VoteValue,
  reason?: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!value) return { error: null };
  if (!db) return { error: "Unable to connect to the database. Please try again later." };

  try {
    // Upsert vote
    const { error } = await db.from("votes").upsert(
      {
        option_id: optionId,
        user_id: userId,
        value,
        reason: reason || null,
      },
      { onConflict: "option_id,user_id" }
    );

    if (error) return { error: error.message };

    // The fn_sync_vote_counts database trigger automatically updates activity_options
    // counts, making vote casting atomic and free of race conditions.

    return { error: null };
  } catch (err) {

    return { error: "Something went wrong while casting your vote. Please try again." };
  }
}

export async function joinActivity(activityId: string, userId: string): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!db) return { error: "Unable to connect to the database. Please try again later." };

  try {
    // fn_sync_current_players (trigger on activity_players, migration 006) keeps
    // activities.current_players correct server-side; writing it here too raced
    // against the trigger and, for non-hosts, silently no-op'd under RLS
    // (activities UPDATE requires created_by = auth.uid()).
    const { error } = await db.from("activity_players").upsert(
      { activity_id: activityId, user_id: userId, status: "joined" },
      { onConflict: "activity_id,user_id" }
    );

    return { error: error?.message ?? null };
  } catch (err) {

    return { error: "Something went wrong while joining the activity. Please try again." };
  }
}

export async function leaveActivity(activityId: string, userId: string): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!db) return { error: "Unable to connect to the database. Please try again later." };

  try {
    // fn_sync_current_players (trigger on activity_players, migration 006) keeps
    // activities.current_players correct server-side; see joinActivity for why the
    // client used to also write it and no longer does.
    const { error } = await db
      .from("activity_players")
      .update({ status: "declined" })
      .eq("activity_id", activityId)
      .eq("user_id", userId);

    return { error: error?.message ?? null };
  } catch (err) {

    return { error: "Something went wrong while leaving the activity. Please try again." };
  }
}

export async function createGroup(input: {
  name: string;
  type: string;
  createdBy: string;
}): Promise<{ id: string; error: string | null }> {
  if (isDemoMode()) return { id: `group-${Date.now()}`, error: null };
  if (!db) return { id: "", error: "Unable to connect to the database. Please try again later." };

  try {
    const typeData = activityTypes.find((s) => s.name === input.type);
    const initials = input.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const groupId = crypto.randomUUID();

    const { error } = await db.from("groups").insert({
      id: groupId,
      name: input.name,
      type: input.type,
      type_emoji: typeData?.emoji || "",
      color: typeData?.color || "#007AFF",
      initials,
      created_by: input.createdBy,
    });

    if (error) return { id: "", error: error.message };

    // Add creator as admin member
    await db.from("group_members").insert({
      group_id: groupId,
      user_id: input.createdBy,
      role: "admin",
    });

    return { id: groupId, error: null };
  } catch (err) {

    return { id: "", error: "Something went wrong while creating the group. Please try again." };
  }
}

export async function joinGroup(
  groupId: string,
  userId: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!db) return { error: "Unable to connect to the database. Please try again later." };

  try {
    const { error } = await db.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
      role: "member",
    });

    if (!error) {
      // Update member count
      const { count } = await db
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);

      if (count !== null) {
        await db.from("groups").update({ member_count: count }).eq("id", groupId);
      }
    }

    return { error: error?.message ?? null };
  } catch (err) {

    return { error: "Something went wrong while joining the group. Please try again." };
  }
}

export async function leaveGroup(
  groupId: string,
  userId: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!db) return { error: "Unable to connect to the database. Please try again later." };

  try {
    const { error } = await db
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (!error) {
      const { count } = await db
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);

      if (count !== null) {
        await db.from("groups").update({ member_count: count }).eq("id", groupId);
      }
    }

    return { error: error?.message ?? null };
  } catch (err) {

    return { error: "Something went wrong while leaving the group. Please try again." };
  }
}

export async function getUserVotes(
  activityId: string,
  userId: string
): Promise<Record<string, VoteValue>> {
  if (isDemoMode()) return {};
  if (!db) return {};

  try {
    // First get all option IDs belonging to this activity
    const { data: options, error: optionsError } = await db
      .from("activity_options")
      .select("id")
      .eq("activity_id", activityId);

    if (optionsError || !options || options.length === 0) return {};

    const optionIds = options.map((o: any) => o.id);

    // Then fetch votes by this user for those options
    const { data: votes, error: votesError } = await db
      .from("votes")
      .select("option_id, value")
      .eq("user_id", userId)
      .in("option_id", optionIds);

    if (votesError || !votes) return {};

    const result: Record<string, VoteValue> = {};
    for (const v of votes as any[]) {
      result[v.option_id] = v.value as VoteValue;
    }
    return result;
  } catch (err) {

    return {};
  }
}

export async function confirmActivity(activityId: string, optionId: string): Promise<{ error: string | null }> {
  if (isDemoMode() || !db) return { error: null };
  try {
    const { error } = await db
      .from("activities")
      .update({
        status: "confirmed",
        confirmed_option_id: optionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activityId);

    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteActivity(activityId: string): Promise<{ error: string | null }> {
  if (isDemoMode() || !db) {
    const idx = mockActivities.findIndex((g) => g.id === activityId);
    if (idx !== -1) mockActivities.splice(idx, 1);
    return { error: null };
  }
  try {
    const { error } = await db
      .from("activities")
      .delete()
      .eq("id", activityId);

    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function cancelActivity(activityId: string, reason?: string): Promise<{ error: string | null }> {
  if (isDemoMode() || !db) return { error: null };
  try {
    const { error } = await db
      .from("activities")
      .update({
        status: "cancelled",
        cancellation_reason: reason || "Cancelled by host",
        updated_at: new Date().toISOString(),
      })
      .eq("id", activityId);

    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export interface ActivityInvite {
  activityPlayerId: string;
  activityId: string;
  title: string;
  type: string;
  typeColor: string;
  typeEmoji: string;
  bestOptionDisplayDate: string | null;
  bestOptionStartTime: string | null;
}

export async function getInvites(userId: string): Promise<ActivityInvite[]> {
  if (isDemoMode()) return [];
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("activity_players")
      .select(`
        id,
        activity_id,
        activities (
          id,
          title,
          type,
          type_color,
          type_emoji,
          confirmed_option_id,
          activity_options!activity_options_activity_id_fkey ( id, display_date, start_time, in_votes )
        )
      `)
      .eq("user_id", userId)
      .eq("status", "invited");
    if (error || !data) return [];
    return (data as any[]).map((row) => {
      const activity = row.activities;
      if (!activity) return null;
      const options: any[] = activity.activity_options || [];
      let bestOption: any = null;
      if (activity.confirmed_option_id) {
        bestOption = options.find((o: any) => o.id === activity.confirmed_option_id) || null;
      }
      if (!bestOption && options.length > 0) {
        bestOption = [...options].sort((a: any, b: any) => b.in_votes - a.in_votes)[0];
      }
      return {
        activityPlayerId: row.id,
        activityId: activity.id,
        title: activity.title,
        type: activity.type,
        typeColor: activity.type_color,
        typeEmoji: activity.type_emoji,
        bestOptionDisplayDate: bestOption?.display_date ?? null,
        bestOptionStartTime: bestOption?.start_time ?? null,
      } as ActivityInvite;
    }).filter(Boolean) as ActivityInvite[];
  } catch {
    return [];
  }
}

export async function respondToInvite(
  activityId: string,
  userId: string,
  accept: boolean
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!db) return { error: "Unable to connect to the database. Please try again later." };
  return accept ? joinActivity(activityId, userId) : leaveActivity(activityId, userId);
}

export function subscribeToActivityPlayers(
  activityId: string,
  onPlayerChange: () => void
): { unsubscribe: () => void } {
  if (isDemoMode()) return { unsubscribe: () => {} };
  if (!db) return { unsubscribe: () => {} };
  // Polls the roster and fires only when it actually changed. The first tick
  // records a baseline without firing, since the caller already has the data.
  let last: string | null = null;
  const stop = poll(async () => {
    if (!db) return;
    const { data, error } = await db
      .from("activity_players")
      .select("*")
      .eq("activity_id", activityId)
      .order("user_id");
    if (error) return;
    const fingerprint = JSON.stringify(data);
    if (last !== null && fingerprint !== last) onPlayerChange();
    last = fingerprint;
  });
  return { unsubscribe: stop };
}

export function subscribeToVotes(
  optionIds: string[],
  onVoteChange: () => void
): { unsubscribe: () => void } {
  if (isDemoMode()) return { unsubscribe: () => {} };
  if (!db) return { unsubscribe: () => {} };
  if (optionIds.length === 0) return { unsubscribe: () => {} };
  let last: string | null = null;
  const stop = poll(async () => {
    if (!db) return;
    const { data, error } = await db
      .from("votes")
      .select("*")
      .in("option_id", optionIds)
      .order("id");
    if (error) return;
    const fingerprint = JSON.stringify(data);
    if (last !== null && fingerprint !== last) onVoteChange();
    last = fingerprint;
  });
  return { unsubscribe: stop };
}

export async function getPlayerStatusForActivity(
  activityId: string,
  userId: string
): Promise<"invited" | "joined" | "declined" | null> {
  if (isDemoMode() || !db) return null;
  try {
    const { data } = await db
      .from("activity_players")
      .select("status")
      .eq("activity_id", activityId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.status as "invited" | "joined" | "declined") ?? null;
  } catch {
    return null;
  }
}

export { activityTypes };
