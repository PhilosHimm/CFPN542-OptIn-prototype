import { supabase, isDemoMode } from "@/lib/supabase";
import { toast } from "sonner";
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

function showNetworkError(context: string) {
  toast.error(`Failed to load ${context}. Check your connection and try again.`);
}

export async function getGames(userId?: string): Promise<Game[]> {
  if (isDemoMode()) return mockGames;
  if (!supabase) return [];

  try {
    // Fire and forget auto-transition to keep game statuses up to date
    supabase.rpc("auto_transition_all_games").then((res) => {
      if (res.error) console.error("Failed to transition games:", res.error);
    });

    let query = supabase
      .from("games")
      .select("*, game_options(*, votes(value, profiles:user_id(initials)))")
      .order("created_at", { ascending: false });

    if (userId) {
      const { data: joinedRows } = await supabase
        .from("game_players")
        .select("game_id")
        .eq("user_id", userId)
        .eq("status", "joined");

      const joinedGameIds = (joinedRows || []).map((r: any) => r.game_id);

      if (joinedGameIds.length > 0) {
        query = query.or(`created_by.eq.${userId},id.in.(${joinedGameIds.join(",")})`);
      } else {
        query = query.eq("created_by", userId);
      }
    }

    const { data: gamesData, error } = await query;

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
      pendingProposalCount: (g.game_options || []).filter((o: any) => o.status === "pending").length,
    }));
  } catch {
    showNetworkError("games");
    return [];
  }
}

export async function getGameById(id: string): Promise<Game | null> {
  if (isDemoMode()) {
    return mockGames.find((g) => g.id === id) || null;
  }
  if (!supabase) return null;

  try {
    // Fire and forget auto-transition for this specific game
    supabase.rpc("auto_transition_game", { p_game_id: id }).then((res) => {
      if (res.error) console.error("Failed to transition game:", res.error);
    });

    const { data, error } = await supabase
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
  } catch {
    showNetworkError("game details");
    return null;
  }
}

export async function getGroups(): Promise<Group[]> {
  if (isDemoMode()) return mockGroups;
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
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
  } catch {
    showNetworkError("groups");
    return [];
  }
}

export async function getCalendarMarkers(userId?: string): Promise<Record<string, { status: GameStatus; gameId: string }[]>> {
  if (isDemoMode()) return mockCalendarMarkers;
  if (!supabase) return {};

  try {
    let query = supabase
      .from("game_options")
      .select("date, game_id, games!inner(id, status)")
      .order("date");

    if (userId) {
      const [{ data: joinedRows }, { data: createdRows }] = await Promise.all([
        supabase
          .from("game_players")
          .select("game_id")
          .eq("user_id", userId)
          .eq("status", "joined"),
        supabase
          .from("games")
          .select("id")
          .eq("created_by", userId),
      ]);

      const accessibleIds = [
        ...new Set([
          ...(joinedRows || []).map((r: any) => r.game_id),
          ...(createdRows || []).map((r: any) => r.id),
        ]),
      ];

      if (accessibleIds.length === 0) return {};
      query = query.in("game_id", accessibleIds);
    }

    const { data, error } = await query;

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
  } catch {
    showNetworkError("calendar");
    return {};
  }
}

interface CreateGameInput {
  title: string;
  sport: string;
  gameType: "Casual" | "Competitive";
  maxPlayers: number | null;
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
  if (!supabase) return { id: "", error: "Unable to connect to the database. Please try again later." };
  if (!input.timeOptions || input.timeOptions.length === 0) {
    return { id: "", error: "You must provide at least one time option." };
  }

  try {
    const sportData = sports.find((s) => s.name === input.sport);
    // Include creator in the split (length + 1)
    const totalPlayersAtCreation = input.invitedPlayerIds.length + 1;
    const perPersonCost = input.totalCost > 0 
      ? input.totalCost / totalPlayersAtCreation
      : 0;

    const votingDeadline = new Date();
    votingDeadline.setHours(votingDeadline.getHours() + 24);

    const { data: game, error } = await supabase
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
      await supabase.from("game_options").insert(optionInserts);
    }

    // Invite players
    if (input.invitedPlayerIds.length > 0) {
      const playerInserts = input.invitedPlayerIds.map((pid) => ({
        game_id: game.id,
        user_id: pid,
        status: "invited" as const,
      }));
      await supabase.from("game_players").insert(playerInserts);
    }

    return { id: game.id, error: null };
  } catch {
    toast.error("Failed to create game. Check your connection and try again.");
    return { id: "", error: "Something went wrong while creating the game. Please try again." };
  }
}

export async function castVote(
  optionId: string,
  userId: string,
  value: VoteValue,
  reason?: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!value) return { error: null };
  if (!supabase) return { error: "Unable to connect to the database. Please try again later." };

  try {
    // Upsert vote
    const { error } = await supabase.from("votes").upsert(
      {
        option_id: optionId,
        user_id: userId,
        value,
        reason: reason || null,
      },
      { onConflict: "option_id,user_id" }
    );

    if (error) return { error: error.message };

    // The fn_sync_vote_counts database trigger automatically updates game_options
    // counts, making vote casting atomic and free of race conditions.

    return { error: null };
  } catch (err) {

    return { error: "Something went wrong while casting your vote. Please try again." };
  }
}

export async function joinGame(gameId: string, userId: string): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!supabase) return { error: "Unable to connect to the database. Please try again later." };

  try {
    const { error } = await supabase.from("game_players").upsert(
      { game_id: gameId, user_id: userId, status: "joined" },
      { onConflict: "game_id,user_id" }
    );

    if (!error) {
      // Update current_players count
      const { count } = await supabase
        .from("game_players")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("status", "joined");

      if (count !== null) {
        await supabase.from("games").update({ current_players: count }).eq("id", gameId);
      }
    }

    return { error: error?.message ?? null };
  } catch (err) {

    return { error: "Something went wrong while joining the game. Please try again." };
  }
}

export async function leaveGame(gameId: string, userId: string): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!supabase) return { error: "Unable to connect to the database. Please try again later." };

  try {
    const { error } = await supabase
      .from("game_players")
      .update({ status: "declined" })
      .eq("game_id", gameId)
      .eq("user_id", userId);

    if (!error) {
      const { count } = await supabase
        .from("game_players")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("status", "joined");

      if (count !== null) {
        await supabase.from("games").update({ current_players: count }).eq("id", gameId);
      }
    }

    return { error: error?.message ?? null };
  } catch (err) {

    return { error: "Something went wrong while leaving the game. Please try again." };
  }
}

export async function createGroup(input: {
  name: string;
  sport: string;
  createdBy: string;
}): Promise<{ id: string; error: string | null }> {
  if (isDemoMode()) return { id: `group-${Date.now()}`, error: null };
  if (!supabase) return { id: "", error: "Unable to connect to the database. Please try again later." };

  try {
    const sportData = sports.find((s) => s.name === input.sport);
    const initials = input.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const groupId = crypto.randomUUID();

    const { error } = await supabase.from("groups").insert({
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
    await supabase.from("group_members").insert({
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
  if (!supabase) return { error: "Unable to connect to the database. Please try again later." };

  try {
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
      role: "member",
    });

    if (!error) {
      // Update member count
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);

      if (count !== null) {
        await supabase.from("groups").update({ member_count: count }).eq("id", groupId);
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
  if (!supabase) return { error: "Unable to connect to the database. Please try again later." };

  try {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (!error) {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);

      if (count !== null) {
        await supabase.from("groups").update({ member_count: count }).eq("id", groupId);
      }
    }

    return { error: error?.message ?? null };
  } catch (err) {

    return { error: "Something went wrong while leaving the group. Please try again." };
  }
}

export async function getUserVotes(
  gameId: string,
  userId: string
): Promise<Record<string, VoteValue>> {
  if (isDemoMode()) return {};
  if (!supabase) return {};

  try {
    // First get all option IDs belonging to this game
    const { data: options, error: optionsError } = await supabase
      .from("game_options")
      .select("id")
      .eq("game_id", gameId);

    if (optionsError || !options || options.length === 0) return {};

    const optionIds = options.map((o: any) => o.id);

    // Then fetch votes by this user for those options
    const { data: votes, error: votesError } = await supabase
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

export async function confirmGame(gameId: string, optionId: string): Promise<{ error: string | null }> {
  if (isDemoMode() || !supabase) return { error: null };
  try {
    const { error } = await supabase
      .from("games")
      .update({
        status: "confirmed",
        confirmed_option_id: optionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteGame(gameId: string): Promise<{ error: string | null }> {
  if (isDemoMode() || !supabase) {
    const idx = mockGames.findIndex((g) => g.id === gameId);
    if (idx !== -1) mockGames.splice(idx, 1);
    return { error: null };
  }
  try {
    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", gameId);

    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function cancelGame(gameId: string, reason?: string): Promise<{ error: string | null }> {
  if (isDemoMode() || !supabase) return { error: null };
  try {
    const { error } = await supabase
      .from("games")
      .update({
        status: "cancelled",
        cancellation_reason: reason || "Cancelled by host",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export interface GameInvite {
  gamePlayerId: string;
  gameId: string;
  title: string;
  sport: string;
  sportColor: string;
  sportEmoji: string;
  bestOptionDisplayDate: string | null;
  bestOptionStartTime: string | null;
}

export async function getInvites(userId: string): Promise<GameInvite[]> {
  if (isDemoMode()) return [];
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("game_players")
      .select(`
        id,
        game_id,
        games (
          id,
          title,
          sport,
          sport_color,
          sport_emoji,
          confirmed_option_id,
          game_options ( id, display_date, start_time, in_votes )
        )
      `)
      .eq("user_id", userId)
      .eq("status", "invited");
    if (error || !data) return [];
    return (data as any[]).map((row) => {
      const game = row.games;
      if (!game) return null;
      const options: any[] = game.game_options || [];
      let bestOption: any = null;
      if (game.confirmed_option_id) {
        bestOption = options.find((o: any) => o.id === game.confirmed_option_id) || null;
      }
      if (!bestOption && options.length > 0) {
        bestOption = [...options].sort((a: any, b: any) => b.in_votes - a.in_votes)[0];
      }
      return {
        gamePlayerId: row.id,
        gameId: game.id,
        title: game.title,
        sport: game.sport,
        sportColor: game.sport_color,
        sportEmoji: game.sport_emoji,
        bestOptionDisplayDate: bestOption?.display_date ?? null,
        bestOptionStartTime: bestOption?.start_time ?? null,
      } as GameInvite;
    }).filter(Boolean) as GameInvite[];
  } catch {
    return [];
  }
}

export async function respondToInvite(
  gameId: string,
  userId: string,
  accept: boolean
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!supabase) return { error: "Unable to connect to the database. Please try again later." };
  return accept ? joinGame(gameId, userId) : leaveGame(gameId, userId);
}

export function subscribeToGamePlayers(
  gameId: string,
  onPlayerChange: () => void
): { unsubscribe: () => void } {
  if (isDemoMode()) return { unsubscribe: () => {} };
  if (!supabase) return { unsubscribe: () => {} };
  try {
    const channel = supabase
      .channel(`game_players:game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${gameId}`,
        },
        () => { onPlayerChange(); }
      )
      .subscribe();
    return { unsubscribe: () => { supabase?.removeChannel(channel); } };
  } catch {
    return { unsubscribe: () => {} };
  }
}

export function subscribeToVotes(
  optionIds: string[],
  onVoteChange: () => void
): { unsubscribe: () => void } {
  if (isDemoMode()) return { unsubscribe: () => {} };
  if (!supabase) return { unsubscribe: () => {} };
  try {
    const optionIdSet = new Set(optionIds);
    const channel = supabase
      .channel(`votes:game-${optionIds[0]}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        (payload) => {
          const optionId = (payload.new as any)?.option_id ?? (payload.old as any)?.option_id;
          if (optionId && optionIdSet.has(optionId)) {
            onVoteChange();
          }
        }
      )
      .subscribe();
    return { unsubscribe: () => { supabase?.removeChannel(channel); } };
  } catch {
    return { unsubscribe: () => {} };
  }
}

export async function getPlayerStatusForGame(
  gameId: string,
  userId: string
): Promise<"invited" | "joined" | "declined" | null> {
  if (isDemoMode() || !supabase) return null;
  try {
    const { data } = await supabase
      .from("game_players")
      .select("status")
      .eq("game_id", gameId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.status as "invited" | "joined" | "declined") ?? null;
  } catch {
    return null;
  }
}

export { sports };
