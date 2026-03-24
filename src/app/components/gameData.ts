// ─── Shared game data — Supabase-backed ───
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface Player {
  id: string;
  name: string;
  avatar: string;
}

export interface VoteOption {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  votes: {
    in: string[];
    maybe: string[];
    out: string[];
  };
}

export type GameStatus = "proposal" | "confirmed" | "completed" | "cancelled";

export interface Game {
  id: string;
  title: string;
  sport: string;
  sportEmoji: string;
  location: string;
  gameType: "casual" | "competitive";
  status: GameStatus;
  maxPlayers: number;
  totalCost: number;
  splitCost: boolean;
  group: string;
  heroImage: string;
  timeOptions: VoteOption[];
  roster: Player[];
  votingDeadline: string;
  confirmedOptionId?: string;
  createdBy: string;
  date: string;
  time: string;
}

// ─── Supabase-backed functions ───────────────────────────

const SPORT_HERO_IMAGES: Record<string, string> = {
  Soccer: "https://images.unsplash.com/photo-1767406657699-9f3e01a48ea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBmaWVsZCUyMG91dGRvb3IlMjByZWNyZWF0aW9uJTIwZ3JlZW58ZW58MXx8fHwxNzcxNjMxNDI1fDA&ixlib=rb-4.1.0&q=80&w=1080",
  Basketball: "https://images.unsplash.com/photo-1762025858816-bb383940763a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwY291cnQlMjBpbmRvb3IlMjByZWNyZWF0aW9uJTIwZ2FtZXxlbnwxfHx8fDE3NzE2MzE0MjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
  Volleyball: "https://images.unsplash.com/photo-1771526087551-db6be2f51a28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2xsZXliYWxsJTIwc2FuZCUyMGJlYWNoJTIwc3BvcnQlMjBjb3VydHxlbnwxfHx8fDE3NzE2MzE0MjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
};

function formatTime12h(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function mapDbGameToGame(g: any): Game {
  const opts = (g.game_options || []) as any[];
  const first = opts[0];
  const confirmedOpt = g.confirmed_option_id
    ? opts.find((o: any) => o.id === g.confirmed_option_id) || first
    : first;

  const displayOpt = confirmedOpt || first;
  const displayDate = displayOpt?.display_date || displayOpt?.date || "";
  const timeStr = displayOpt
    ? `${formatTime12h(displayOpt.start_time)} - ${formatTime12h(displayOpt.end_time)}`
    : "";

  return {
    id: g.id,
    title: g.title,
    sport: g.sport,
    sportEmoji: g.sport_emoji || "",
    location: displayOpt?.location || "",
    gameType: (g.game_type || "casual").toLowerCase() as "casual" | "competitive",
    status: g.status as GameStatus,
    maxPlayers: g.max_players,
    totalCost: g.total_cost || 0,
    splitCost: (g.total_cost || 0) > 0,
    group: g.group_id || "",
    heroImage: SPORT_HERO_IMAGES[g.sport] || SPORT_HERO_IMAGES.Soccer,
    date: displayDate,
    time: timeStr,
    votingDeadline: g.voting_deadline || "",
    confirmedOptionId: g.confirmed_option_id || undefined,
    createdBy: g.created_by || "",
    roster: Array.from({ length: g.current_players || 0 }, (_, i) => ({
      id: `player-${i}`,
      name: `Player ${i + 1}`,
      avatar: "",
    })),
    timeOptions: opts.map((o: any) => ({
      id: o.id,
      date: o.date,
      startTime: o.start_time,
      endTime: o.end_time,
      location: o.location,
      votes: {
        in: Array.from({ length: o.in_votes || 0 }, (_, i) => `voter-${i}`),
        maybe: Array.from({ length: o.maybe_votes || 0 }, (_, i) => `maybe-${i}`),
        out: Array.from({ length: o.out_votes || 0 }, (_, i) => `out-${i}`),
      },
    })),
  };
}

/** Fetch all games from Supabase */
export async function fetchAllGames(): Promise<Game[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from("games")
    .select("*, game_options(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchAllGames error:", error.message);
    return [];
  }

  return (data || []).map(mapDbGameToGame);
}

/** Fetch a single game by ID from Supabase */
export async function fetchGameById(id: string): Promise<Game | undefined> {
  if (!isSupabaseConfigured()) return undefined;

  const { data, error } = await supabase!
    .from("games")
    .select("*, game_options(*)")
    .eq("id", id)
    .single();

  if (error || !data) return undefined;

  return mapDbGameToGame(data);
}

// Check if a string looks like a valid UUID
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/** Save a new game to Supabase */
export async function saveGame(input: {
  title: string;
  sport: string;
  gameType: "casual" | "competitive";
  maxPlayers: number;
  totalCost: number;
  location: string;
  groupId: string;
  visibility: string;
  createdBy: string;
  timeOptions: { date: string; startTime: string; endTime: string; location: string }[];
  invitedPlayerIds: string[];
  votingPeriodHours?: number;
}): Promise<{ id: string; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { id: "", error: "Supabase is not configured." };
  }

  // Validate createdBy is a real UUID (auth user id)
  if (!input.createdBy || !isValidUUID(input.createdBy)) {
    return { id: "", error: "No authenticated user. Please log in." };
  }

  const sportEmojis: Record<string, string> = {
    Soccer: "\u26BD", Basketball: "\uD83C\uDFC0", Volleyball: "\uD83C\uDFD0",
    Tennis: "\uD83C\uDFBE", "Flag Football": "\uD83C\uDFC8", Softball: "\u26BE",
  };

  // Only use group_id if it's a valid UUID (mock IDs like "g1" are not valid)
  const groupId = input.groupId && isValidUUID(input.groupId) ? input.groupId : null;

  // Only count real (UUID) player IDs for cost splitting
  const realPlayerIds = input.invitedPlayerIds.filter(isValidUUID);

  const perPersonCost = input.totalCost > 0 && realPlayerIds.length > 0
    ? input.totalCost / realPlayerIds.length
    : 0;

  const votingDeadline = new Date();
  const hoursToAdd = input.votingPeriodHours || 24;
  votingDeadline.setHours(votingDeadline.getHours() + hoursToAdd);

  const gameId = crypto.randomUUID();

  console.log("saveGame: inserting game", gameId, "by user", input.createdBy);

  const { error } = await supabase!
    .from("games")
    .insert({
      id: gameId,
      title: input.title,
      sport: input.sport,
      sport_emoji: sportEmojis[input.sport] || "",
      sport_color: "#2D7A3A",
      status: "proposal",
      game_type: input.gameType === "casual" ? "Casual" : "Competitive",
      max_players: input.maxPlayers,
      created_by: input.createdBy,
      group_id: groupId,
      voting_deadline: votingDeadline.toISOString(),
      total_cost: input.totalCost,
      per_person_cost: perPersonCost,
      confirmed_option_id: null,
      description: null,
      visibility: input.visibility === "public" ? "Public" : input.visibility === "private" ? "Private" : "Group Only",
    });

  if (error) {
    console.error("saveGame: insert error:", error.message);
    return { id: "", error: error.message };
  }

  console.log("saveGame: game inserted, adding time options");

  // Insert time options
  const optionInserts = input.timeOptions
    .filter((o) => o.date && o.startTime)
    .map((o) => {
      const d = new Date(o.date + "T00:00:00");
      const displayDate = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      return {
        id: crypto.randomUUID(),
        game_id: gameId,
        date: o.date,
        display_date: displayDate,
        start_time: o.startTime,
        end_time: o.endTime || o.startTime,
        location: o.location || input.location || "",
      };
    });

  if (optionInserts.length > 0) {
    const { error: optError } = await supabase!.from("game_options").insert(optionInserts);
    if (optError) console.error("saveGame: game_options insert error:", optError.message);
  }

  // Invite players (only real UUIDs)
  if (realPlayerIds.length > 0) {
    const playerInserts = realPlayerIds.map((pid) => ({
      game_id: gameId,
      user_id: pid,
      status: "invited" as const,
    }));
    const { error: playerError } = await supabase!.from("game_players").insert(playerInserts);
    if (playerError) console.error("saveGame: game_players insert error:", playerError.message);
  }

  console.log("saveGame: complete, game id:", gameId);
  return { id: gameId, error: null };
}

export async function addGameOption(gameId: string, option: { date: string, start_time: string, end_time: string, location?: string }): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from("game_options").insert({
    game_id: gameId,
    date: option.date,
    display_date: option.date, // simple fallback
    start_time: option.start_time,
    end_time: option.end_time,
    location: option.location || "",
  });
  return !error;
}

export async function updateGameOption(optionId: string, option: { date: string, start_time: string, end_time: string, location?: string }): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from("game_options").update({
    date: option.date,
    display_date: option.date,
    start_time: option.start_time,
    end_time: option.end_time,
    location: option.location || "",
  }).eq("id", optionId);
  return !error;
}

export async function deleteGameOption(optionId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from("game_options").delete().eq("id", optionId);
  return !error;
}

export async function updateGameVotingDeadline(gameId: string, deadline: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from("games").update({ voting_deadline: deadline }).eq("id", gameId);
  return !error;
}

export async function cancelGame(gameId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase!.from("games").update({ status: "cancelled" }).eq("id", gameId);
  return !error;
}
