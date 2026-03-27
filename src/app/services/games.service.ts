import { supabase, isDemoMode } from "@/lib/supabase";
import {
  games as mockGames,
  groups as mockGroups,
  calendarMarkers as mockCalendarMarkers,
  sports,
  type Game,
  type Group,
  type GameStatus,
  type VoteValue,
} from "../data/games";

export async function getGames(): Promise<Game[]> {
  if (isDemoMode()) return mockGames;

  const { data: gamesData, error } = await supabase!
    .from("games")
    .select("*, game_options(*, votes(value, profiles:user_id(initials)))")
    .order("created_at", { ascending: false });

  if (error || !gamesData) return mockGames;

  return gamesData.map((g: any) => ({
    id: g.id,
    title: g.title,
    sport: g.sport,
    sportEmoji: g.sport_emoji,
    sportColor: g.sport_color,
    status: g.status as GameStatus,
    gameType: g.game_type,
    maxPlayers: g.max_players,
    currentPlayers: g.current_players,
    createdBy: g.created_by,
    groupId: g.group_id,
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    options: (g.game_options || []).map((o: any) => {
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
  }));
}

export async function getGameById(id: string): Promise<Game | null> {
  if (isDemoMode()) {
    return mockGames.find((g) => g.id === id) || null;
  }

  const { data, error } = await supabase!
    .from("games")
    .select("*, game_options(*, votes(value, profiles:user_id(initials)))")
    .eq("id", id)
    .single();

  if (error || !data) return mockGames.find((g) => g.id === id) || null;

  return {
    id: data.id,
    title: data.title,
    sport: data.sport,
    sportEmoji: data.sport_emoji,
    sportColor: data.sport_color,
    status: data.status as GameStatus,
    gameType: data.game_type as "Casual" | "Competitive",
    maxPlayers: data.max_players,
    currentPlayers: data.current_players,
    createdBy: data.created_by,
    groupId: data.group_id,
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    options: ((data as any).game_options || []).map((o: any) => {
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
    confirmedOptionId: data.confirmed_option_id,
    description: data.description,
  };
}

export async function getGroups(): Promise<Group[]> {
  if (isDemoMode()) return mockGroups;

  const { data, error } = await supabase!
    .from("groups")
    .select("*")
    .order("name");

  if (error || !data) return mockGroups;

  return data.map((g: any) => ({
    id: g.id,
    name: g.name,
    sport: g.sport,
    sportEmoji: g.sport_emoji,
    color: g.color,
    memberCount: g.member_count,
    nextGame: g.next_game,
    initials: g.initials,
  }));
}

export async function getCalendarMarkers(): Promise<Record<string, { status: GameStatus; gameId: string }[]>> {
  if (isDemoMode()) return mockCalendarMarkers;

  const { data, error } = await supabase!
    .from("game_options")
    .select("date, game_id, games!inner(id, status)")
    .order("date");

  if (error || !data) return mockCalendarMarkers;

  const markers: Record<string, { status: GameStatus; gameId: string }[]> = {};
  for (const row of data as any[]) {
    const date = row.date;
    const status = row.games?.status as GameStatus;
    const gameId = row.game_id;
    if (!markers[date]) markers[date] = [];
    if (!markers[date].some((m: any) => m.gameId === gameId)) {
      markers[date].push({ status, gameId });
    }
  }
  return markers;
}

interface CreateGameInput {
  title: string;
  sport: string;
  gameType: "Casual" | "Competitive";
  maxPlayers: number;
  groupId: string;
  totalCost: number;
  visibility: string;
  createdBy: string;
  timeOptions: {
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  }[];
  invitedPlayerIds: string[];
}

export async function createGame(input: CreateGameInput): Promise<{ id: string; error: string | null }> {
  if (isDemoMode()) {
    return { id: `game-${Date.now()}`, error: null };
  }

  const sportData = sports.find((s) => s.name === input.sport);
  const perPersonCost = input.totalCost > 0 && input.invitedPlayerIds.length > 0
    ? input.totalCost / input.invitedPlayerIds.length
    : 0;

  const votingDeadline = new Date();
  votingDeadline.setHours(votingDeadline.getHours() + 24);

  const { data: game, error } = await supabase!
    .from("games")
    .insert({
      id: crypto.randomUUID(),
      title: input.title,
      sport: input.sport,
      sport_emoji: sportData?.emoji || "",
      sport_color: sportData?.color || "#007AFF",
      status: "proposal",
      game_type: input.gameType,
      max_players: input.maxPlayers,
      created_by: input.createdBy,
      group_id: input.groupId,
      voting_deadline: votingDeadline.toISOString(),
      total_cost: input.totalCost,
      per_person_cost: perPersonCost,
      confirmed_option_id: null,
      description: null,
      visibility: input.visibility as any,
    })
    .select()
    .single();

  if (error || !game) return { id: "", error: error?.message || "Failed to create game" };

  // Insert time options
  const optionInserts = input.timeOptions
    .filter((o) => o.date && o.startTime)
    .map((o) => {
      const d = new Date(o.date + "T00:00:00");
      const displayDate = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      return {
        id: crypto.randomUUID(),
        game_id: game.id,
        date: o.date,
        display_date: displayDate,
        start_time: o.startTime,
        end_time: o.endTime || o.startTime,
        location: o.location || "",
      };
    });

  if (optionInserts.length > 0) {
    await supabase!.from("game_options").insert(optionInserts);
  }

  // Invite players
  if (input.invitedPlayerIds.length > 0) {
    const playerInserts = input.invitedPlayerIds.map((pid) => ({
      game_id: game.id,
      user_id: pid,
      status: "invited" as const,
    }));
    await supabase!.from("game_players").insert(playerInserts);
  }

  return { id: game.id, error: null };
}

export async function castVote(
  optionId: string,
  userId: string,
  value: VoteValue,
  reason?: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!value) return { error: null };

  // Upsert vote
  const { error } = await supabase!.from("votes").upsert(
    {
      option_id: optionId,
      user_id: userId,
      value,
      reason: reason || null,
    },
    { onConflict: "option_id,user_id" }
  );

  if (error) return { error: error.message };

  // Update vote counts on the option
  const { data: votes } = await supabase!
    .from("votes")
    .select("value")
    .eq("option_id", optionId);

  if (votes) {
    const inVotes = votes.filter((v: any) => v.value === "in").length;
    const maybeVotes = votes.filter((v: any) => v.value === "maybe").length;
    const outVotes = votes.filter((v: any) => v.value === "out").length;

    await supabase!
      .from("game_options")
      .update({ in_votes: inVotes, maybe_votes: maybeVotes, out_votes: outVotes })
      .eq("id", optionId);
  }

  return { error: null };
}

export async function joinGame(gameId: string, userId: string): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };

  const { error } = await supabase!.from("game_players").upsert(
    { game_id: gameId, user_id: userId, status: "joined" },
    { onConflict: "game_id,user_id" }
  );

  if (!error) {
    // Update current_players count
    const { count } = await supabase!
      .from("game_players")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("status", "joined");

    if (count !== null) {
      await supabase!.from("games").update({ current_players: count }).eq("id", gameId);
    }
  }

  return { error: error?.message ?? null };
}

export async function leaveGame(gameId: string, userId: string): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };

  const { error } = await supabase!
    .from("game_players")
    .update({ status: "declined" })
    .eq("game_id", gameId)
    .eq("user_id", userId);

  if (!error) {
    const { count } = await supabase!
      .from("game_players")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("status", "joined");

    if (count !== null) {
      await supabase!.from("games").update({ current_players: count }).eq("id", gameId);
    }
  }

  return { error: error?.message ?? null };
}

export async function createGroup(input: {
  name: string;
  sport: string;
  createdBy: string;
}): Promise<{ id: string; error: string | null }> {
  if (isDemoMode()) return { id: `group-${Date.now()}`, error: null };

  const sportData = sports.find((s) => s.name === input.sport);
  const initials = input.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const groupId = crypto.randomUUID();

  const { error } = await supabase!.from("groups").insert({
    id: groupId,
    name: input.name,
    sport: input.sport,
    sport_emoji: sportData?.emoji || "",
    color: sportData?.color || "#007AFF",
    initials,
    created_by: input.createdBy,
  });

  if (error) return { id: "", error: error.message };

  // Add creator as admin member
  await supabase!.from("group_members").insert({
    group_id: groupId,
    user_id: input.createdBy,
    role: "admin",
  });

  return { id: groupId, error: null };
}

export async function joinGroup(
  groupId: string,
  userId: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };

  const { error } = await supabase!.from("group_members").insert({
    group_id: groupId,
    user_id: userId,
    role: "member",
  });

  if (!error) {
    // Update member count
    const { count } = await supabase!
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (count !== null) {
      await supabase!.from("groups").update({ member_count: count }).eq("id", groupId);
    }
  }

  return { error: error?.message ?? null };
}

export async function leaveGroup(
  groupId: string,
  userId: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };

  const { error } = await supabase!
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (!error) {
    const { count } = await supabase!
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (count !== null) {
      await supabase!.from("groups").update({ member_count: count }).eq("id", groupId);
    }
  }

  return { error: error?.message ?? null };
}

export { sports };
