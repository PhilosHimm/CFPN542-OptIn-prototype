// ─── Shared game data — Supabase-backed ───
import { supabase, isDemoMode } from "@/lib/supabase";
import { toast } from "sonner";

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
  cancellationReason?: string;
  createdBy: string;
  date: string;
  time: string;
}

// ─── Helpers ──────────────────────────────────────────────

// ─── Sport Minimums ───────────────────────────────────────

export const SPORT_MINIMUMS: Record<string, number> = {
  Soccer: 10,
  Basketball: 5,
  Volleyball: 6,
  Tennis: 2,
  Pickleball: 4,
  "Flag Football": 8,
  Softball: 9,
};

export function getMinPlayers(sport: string): number {
  return SPORT_MINIMUMS[sport] ?? 2;
}

/**
 * Applies automatic status transitions for expired games:
 *  - proposal  + all dates past → cancelled  (voting closed, never confirmed)
 *  - confirmed + confirmed date past → completed (game already happened)
 */
function applyAutoTransitions(games: Game[]): { games: Game[]; transitions: { id: string; newStatus: "cancelled" | "completed" }[] } {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const transitions: { id: string; newStatus: "cancelled" | "completed" }[] = [];
  const updated = games.map((g) => {
    if (g.status === "proposal") {
      const deadlinePassed = g.votingDeadline ? new Date(g.votingDeadline) < now : false;
      const allPast = g.timeOptions.length > 0 && g.timeOptions.every((o) => o.date < todayStr);
      if (deadlinePassed && allPast) {
        transitions.push({ id: g.id, newStatus: "cancelled" });
        return { ...g, status: "cancelled" as GameStatus };
      }
    }
    if (g.status === "confirmed") {
      const confirmedOpt = g.timeOptions.find((o) => o.id === g.confirmedOptionId);
      if (confirmedOpt && confirmedOpt.date < todayStr) {
        transitions.push({ id: g.id, newStatus: "completed" });
        return { ...g, status: "completed" as GameStatus };
      }
    }
    return g;
  });
  return { games: updated, transitions };
}

/** Returns true if the game has at least one option whose date is today or in the future. */
export function isGameVotable(game: Game): boolean {
  if (game.status !== "proposal") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return game.timeOptions.some((opt) => {
    const optDate = new Date(opt.date + "T00:00:00");
    return optDate >= today;
  });
}

// ─── Demo game data ───────────────────────────────────────

const SPORT_HERO_IMAGES: Record<string, string> = {
  Soccer:     "https://images.unsplash.com/photo-1767406657699-9f3e01a48ea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBmaWVsZCUyMG91dGRvb3IlMjByZWNyZWF0aW9uJTIwZ3JlZW58ZW58MXx8fHwxNzcxNjMxNDI1fDA&ixlib=rb-4.1.0&q=80&w=1080",
  Basketball: "https://images.unsplash.com/photo-1762025858816-bb383940763a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwY291cnQlMjBpbmRvb3IlMjByZWNyZWF0aW9uJTIwZ2FtZXxlbnwxfHx8fDE3NzE2MzE0MjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
  Volleyball: "https://images.unsplash.com/photo-1771526087551-db6be2f51a28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2xsZXliYWxsJTIwc2FuZCUyMGJlYWNoJTIwc3BvcnQlMjBjb3VydHxlbnwxfHx8fDE3NzE2MzE0MjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  Tennis:     "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Pickleball: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
};

function p(ids: string[]): Player[] {
  const names: Record<string, string> = {
    AR: "Alex Rivera", JK: "Jordan Kim", TS: "Taylor Smith",
    ML: "Morgan Lee",  CT: "Casey Torres", RP: "Riley Park",
    DC: "Drew Chen",   SW: "Sam Wilson",  MJ: "Marcus Johnson",
  };
  return ids.map((id) => ({ id, name: names[id] ?? id, avatar: "" }));
}

function votes(ins: string[], maybes: string[] = [], outs: string[] = []) {
  return { in: ins, maybe: maybes, out: outs };
}

function deadline(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

export const DEMO_GAMES: Game[] = [
  // ── PROPOSALS ─────────────────────────────────────────────────────────────
  {
    id: "game1",
    title: "Tuesday Night Basketball",
    sport: "Basketball", sportEmoji: "🏀",
    location: "Riverside Community Courts",
    gameType: "casual", status: "proposal",
    maxPlayers: 10, totalCost: 40, splitCost: true,
    group: "g1", heroImage: SPORT_HERO_IMAGES.Basketball,
    date: "Tue, Mar 25", time: "7:00 PM - 9:00 PM",
    votingDeadline: deadline(14), createdBy: "Sam Wilson",
    roster: p(["AR", "JK", "TS", "RP", "SW", "ML", "CT"]),
    timeOptions: [
      { id: "o1a", date: "2026-03-25", startTime: "7:00 PM", endTime: "9:00 PM",
        location: "Riverside Community Courts",
        votes: votes(["AR","JK","TS","RP","SW"], ["ML","CT"], ["DC"]) },
      { id: "o1b", date: "2026-03-25", startTime: "6:30 PM", endTime: "8:30 PM",
        location: "City Gym — Court B",
        votes: votes(["ML","CT","DC"], ["AR","JK","TS"], ["RP","SW"]) },
      { id: "o1c", date: "2026-03-26", startTime: "8:00 PM", endTime: "10:00 PM",
        location: "Riverside Community Courts",
        votes: votes(["AR","TS","RP","SW"], ["JK"], []) },
    ],
  },
  {
    id: "game3",
    title: "Friday Volleyball Meetup",
    sport: "Volleyball", sportEmoji: "🏐",
    location: "Beach Volleyball Courts — Court 1",
    gameType: "casual", status: "proposal",
    maxPlayers: 8, totalCost: 20, splitCost: true,
    group: "g3", heroImage: SPORT_HERO_IMAGES.Volleyball,
    date: "Fri, Mar 28", time: "5:30 PM - 7:30 PM",
    votingDeadline: deadline(6), createdBy: "Taylor Smith",
    roster: p(["TS","AR","JK","DC","RP"]),
    timeOptions: [
      { id: "o3a", date: "2026-03-28", startTime: "5:30 PM", endTime: "7:30 PM",
        location: "Beach Volleyball Courts — Court 1",
        votes: votes(["TS","AR","JK","DC"], ["RP"], []) },
      { id: "o3b", date: "2026-03-29", startTime: "9:00 AM", endTime: "11:00 AM",
        location: "Rec Center — Gym 2",
        votes: votes(["RP","ML"], ["CT","DC"], ["TS"]) },
    ],
  },
  {
    id: "game5",
    title: "Thursday Pickleball Doubles",
    sport: "Pickleball", sportEmoji: "🏓",
    location: "Westside Pickleball Club — Courts 3 & 4",
    gameType: "competitive", status: "proposal",
    maxPlayers: 8, totalCost: 32, splitCost: true,
    group: "g4", heroImage: SPORT_HERO_IMAGES.Pickleball,
    date: "Thu, Mar 27", time: "6:00 PM - 8:00 PM",
    votingDeadline: deadline(38), createdBy: "Alex Rivera",
    roster: p(["AR","TS","RP","JK"]),
    timeOptions: [
      { id: "o5a", date: "2026-03-27", startTime: "6:00 PM", endTime: "8:00 PM",
        location: "Westside Pickleball Club — Courts 3 & 4",
        votes: votes(["AR","TS","RP"], ["JK"], []) },
      { id: "o5b", date: "2026-03-28", startTime: "7:00 PM", endTime: "9:00 PM",
        location: "Westside Pickleball Club — Courts 3 & 4",
        votes: votes(["JK"], ["AR","TS"], ["RP"]) },
    ],
  },
  {
    id: "game6",
    title: "Saturday Morning Tennis",
    sport: "Tennis", sportEmoji: "🎾",
    location: "Lakeside Tennis Center — Court 2",
    gameType: "casual", status: "proposal",
    maxPlayers: 4, totalCost: 24, splitCost: true,
    group: "g4", heroImage: SPORT_HERO_IMAGES.Tennis,
    date: "Sat, Mar 29", time: "8:00 AM - 10:00 AM",
    votingDeadline: deadline(62), createdBy: "Riley Park",
    roster: p(["RP","SW"]),
    timeOptions: [
      { id: "o6a", date: "2026-03-29", startTime: "8:00 AM", endTime: "10:00 AM",
        location: "Lakeside Tennis Center — Court 2",
        votes: votes(["RP","SW"], ["TS"], []) },
      { id: "o6b", date: "2026-03-29", startTime: "10:30 AM", endTime: "12:30 PM",
        location: "Lakeside Tennis Center — Court 2",
        votes: votes([], ["RP","SW"], ["TS"]) },
    ],
  },

  // ── CONFIRMED ─────────────────────────────────────────────────────────────
  {
    id: "game2",
    title: "Weekend Soccer Match",
    sport: "Soccer", sportEmoji: "⚽",
    location: "Lakeside Park — Pitch 3",
    gameType: "casual", status: "confirmed",
    maxPlayers: 14, totalCost: 0, splitCost: false,
    group: "g2", heroImage: SPORT_HERO_IMAGES.Soccer,
    date: "Sat, Mar 29", time: "10:00 AM - 12:00 PM",
    votingDeadline: deadline(-2), createdBy: "Riley Park",
    confirmedOptionId: "o2a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o2a", date: "2026-03-29", startTime: "10:00 AM", endTime: "12:00 PM",
        location: "Lakeside Park — Pitch 3",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], ["DC"], []) },
    ],
  },
  {
    id: "game7",
    title: "Wednesday Hoops Night",
    sport: "Basketball", sportEmoji: "🏀",
    location: "City Gym — Main Court",
    gameType: "casual", status: "confirmed",
    maxPlayers: 12, totalCost: 50, splitCost: true,
    group: "g1", heroImage: SPORT_HERO_IMAGES.Basketball,
    date: "Wed, Mar 26", time: "7:30 PM - 9:30 PM",
    votingDeadline: deadline(-1), createdBy: "Jordan Kim",
    confirmedOptionId: "o7a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o7a", date: "2026-03-26", startTime: "7:30 PM", endTime: "9:30 PM",
        location: "City Gym — Main Court",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], ["DC"], []) },
    ],
  },
  {
    id: "game8",
    title: "Competitive Volleyball League Night",
    sport: "Volleyball", sportEmoji: "🏐",
    location: "Rec Center — Gym 1",
    gameType: "competitive", status: "confirmed",
    maxPlayers: 12, totalCost: 60, splitCost: true,
    group: "g3", heroImage: SPORT_HERO_IMAGES.Volleyball,
    date: "Thu, Mar 27", time: "8:00 PM - 10:00 PM",
    votingDeadline: deadline(-3), createdBy: "Casey Torres",
    confirmedOptionId: "o8a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o8a", date: "2026-03-27", startTime: "8:00 PM", endTime: "10:00 PM",
        location: "Rec Center — Gym 1",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], [], []) },
    ],
  },

  // ── COMPLETED ─────────────────────────────────────────────────────────────
  {
    id: "game4",
    title: "Morning Pickup Basketball",
    sport: "Basketball", sportEmoji: "🏀",
    location: "Riverside Community Courts",
    gameType: "casual", status: "completed",
    maxPlayers: 10, totalCost: 0, splitCost: false,
    group: "g1", heroImage: SPORT_HERO_IMAGES.Basketball,
    date: "Sun, Mar 16", time: "9:00 AM - 11:00 AM",
    votingDeadline: deadline(-192), createdBy: "Jordan Kim",
    confirmedOptionId: "o4a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o4a", date: "2026-03-16", startTime: "9:00 AM", endTime: "11:00 AM",
        location: "Riverside Community Courts",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], [], ["DC"]) },
    ],
  },
  {
    id: "game9",
    title: "Saturday Soccer Scrimmage",
    sport: "Soccer", sportEmoji: "⚽",
    location: "Lakeside Park — Pitch 1",
    gameType: "casual", status: "completed",
    maxPlayers: 14, totalCost: 0, splitCost: false,
    group: "g2", heroImage: SPORT_HERO_IMAGES.Soccer,
    date: "Sat, Mar 15", time: "11:00 AM - 1:00 PM",
    votingDeadline: deadline(-216), createdBy: "Alex Rivera",
    confirmedOptionId: "o9a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o9a", date: "2026-03-15", startTime: "11:00 AM", endTime: "1:00 PM",
        location: "Lakeside Park — Pitch 1",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], ["DC"], []) },
    ],
  },
  {
    id: "game10",
    title: "Net Gang Volleyball",
    sport: "Volleyball", sportEmoji: "🏐",
    location: "Rec Center — Gym 2",
    gameType: "casual", status: "completed",
    maxPlayers: 8, totalCost: 24, splitCost: true,
    group: "g3", heroImage: SPORT_HERO_IMAGES.Volleyball,
    date: "Fri, Mar 14", time: "6:00 PM - 8:00 PM",
    votingDeadline: deadline(-240), createdBy: "Taylor Smith",
    confirmedOptionId: "o10a",
    roster: p(["TS","AR","JK","ML","CT","RP","DC","SW"]),
    timeOptions: [
      { id: "o10a", date: "2026-03-14", startTime: "6:00 PM", endTime: "8:00 PM",
        location: "Rec Center — Gym 2",
        votes: votes(["TS","AR","JK","ML","CT","RP","DC","SW"], [], []) },
    ],
  },
  {
    id: "game11",
    title: "Competitive Hoops — 5v5",
    sport: "Basketball", sportEmoji: "🏀",
    location: "Riverside Community Courts",
    gameType: "competitive", status: "completed",
    maxPlayers: 10, totalCost: 0, splitCost: false,
    group: "g1", heroImage: SPORT_HERO_IMAGES.Basketball,
    date: "Tue, Mar 11", time: "7:00 PM - 9:00 PM",
    votingDeadline: deadline(-312), createdBy: "Sam Wilson",
    confirmedOptionId: "o11a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o11a", date: "2026-03-11", startTime: "7:00 PM", endTime: "9:00 PM",
        location: "Riverside Community Courts",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], [], []) },
    ],
  },
  {
    id: "game12",
    title: "Sunday Soccer Fun Run",
    sport: "Soccer", sportEmoji: "⚽",
    location: "Greenfield Soccer Park — Pitch 2",
    gameType: "casual", status: "completed",
    maxPlayers: 16, totalCost: 28, splitCost: true,
    group: "g2", heroImage: SPORT_HERO_IMAGES.Soccer,
    date: "Sun, Mar 9", time: "2:00 PM - 4:30 PM",
    votingDeadline: deadline(-360), createdBy: "Casey Torres",
    confirmedOptionId: "o12a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o12a", date: "2026-03-09", startTime: "2:00 PM", endTime: "4:30 PM",
        location: "Greenfield Soccer Park — Pitch 2",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], ["DC"], []) },
    ],
  },
  {
    id: "game13",
    title: "Tuesday Hoops — Weekly Run",
    sport: "Basketball", sportEmoji: "🏀",
    location: "Riverside Community Courts",
    gameType: "casual", status: "completed",
    maxPlayers: 10, totalCost: 0, splitCost: false,
    group: "g1", heroImage: SPORT_HERO_IMAGES.Basketball,
    date: "Tue, Mar 4", time: "7:00 PM - 9:00 PM",
    votingDeadline: deadline(-480), createdBy: "Marcus Johnson",
    confirmedOptionId: "o13a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW"]),
    timeOptions: [
      { id: "o13a", date: "2026-03-04", startTime: "7:00 PM", endTime: "9:00 PM",
        location: "Riverside Community Courts",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW"], ["MJ"], ["CT"]) },
    ],
  },
  {
    id: "game14",
    title: "Smash Club — Tennis Doubles",
    sport: "Tennis", sportEmoji: "🎾",
    location: "Lakeside Tennis Center — Court 1",
    gameType: "competitive", status: "completed",
    maxPlayers: 4, totalCost: 48, splitCost: true,
    group: "g4", heroImage: SPORT_HERO_IMAGES.Tennis,
    date: "Sun, Mar 1", time: "10:00 AM - 12:00 PM",
    votingDeadline: deadline(-552), createdBy: "Riley Park",
    confirmedOptionId: "o14a",
    roster: p(["RP","AR","SW","TS"]),
    timeOptions: [
      { id: "o14a", date: "2026-03-01", startTime: "10:00 AM", endTime: "12:00 PM",
        location: "Lakeside Tennis Center — Court 1",
        votes: votes(["RP","AR","SW","TS"], [], []) },
    ],
  },

  // ── CANCELLED ─────────────────────────────────────────────────────────────
  {
    id: "game15",
    title: "Rainy Day Soccer",
    sport: "Soccer", sportEmoji: "⚽",
    location: "Greenfield Soccer Park — Pitch 1",
    gameType: "casual", status: "cancelled",
    maxPlayers: 14, totalCost: 0, splitCost: false,
    group: "g2", heroImage: SPORT_HERO_IMAGES.Soccer,
    date: "Sun, Mar 22", time: "1:00 PM - 3:00 PM",
    votingDeadline: deadline(-48), createdBy: "Morgan Lee",
    roster: p(["ML","CT","DC","JK"]),
    timeOptions: [
      { id: "o15a", date: "2026-03-22", startTime: "1:00 PM", endTime: "3:00 PM",
        location: "Greenfield Soccer Park — Pitch 1",
        votes: votes(["ML","CT","DC","JK"], ["AR"], ["TS","RP","SW"]) },
    ],
  },
  {
    id: "game16",
    title: "Late Night Basketball",
    sport: "Basketball", sportEmoji: "🏀",
    location: "City Gym — Court B",
    gameType: "casual", status: "cancelled",
    maxPlayers: 10, totalCost: 30, splitCost: true,
    group: "g1", heroImage: SPORT_HERO_IMAGES.Basketball,
    date: "Thu, Mar 20", time: "9:00 PM - 11:00 PM",
    votingDeadline: deadline(-96), createdBy: "Drew Chen",
    roster: p(["DC","JK","ML"]),
    timeOptions: [
      { id: "o16a", date: "2026-03-20", startTime: "9:00 PM", endTime: "11:00 PM",
        location: "City Gym — Court B",
        votes: votes(["DC","JK","ML"], ["AR"], ["TS","RP","SW","CT","MJ"]) },
    ],
  },
];

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

  // Build real roster from game_players joined with profiles
  const gamePlayers = (g.game_players || []) as any[];
  const roster: Player[] = gamePlayers
    .filter((p: any) => p.status !== "declined")
    .map((p: any) => ({
      id: p.user_id,
      name: p.profiles?.name ?? "Player",
      avatar: p.profiles?.avatar_url ?? "",
    }));

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
    cancellationReason: g.cancellation_reason || undefined,
    createdBy: g.created_by || "",
    roster,
    // Build votes from individual vote rows — real user_ids, not synthetic counters
    timeOptions: opts.map((o: any) => {
      const voteRows = (o.votes || []) as Array<{ value: string; user_id: string }>;
      return {
        id: o.id,
        date: o.date,
        startTime: o.start_time,
        endTime: o.end_time,
        location: o.location,
        votes: {
          in: voteRows.filter((v) => v.value === "in").map((v) => v.user_id),
          maybe: voteRows.filter((v) => v.value === "maybe").map((v) => v.user_id),
          out: voteRows.filter((v) => v.value === "out").map((v) => v.user_id),
        },
      };
    }),
  };
}

// Supabase select string — fetches individual vote rows and real player profiles
// so mapDbGameToGame can build genuine voter ID arrays and a real roster.
const GAME_SELECT =
  "*, game_options(*, votes(value, user_id)), game_players(status, user_id, profiles:user_id(id, name, avatar_url))";

/** Persists auto-transition status updates to Supabase */
async function persistTransitions(transitions: { id: string; newStatus: "cancelled" | "completed" }[]): Promise<void> {
  if (transitions.length === 0) return;
  const results = await Promise.all(
    transitions.map(({ id, newStatus }) =>
      supabase!.from("games").update({ status: newStatus }).eq("id", id)
    )
  );
  for (const result of results) {
    if (result.error) {
      console.error("Failed to update game status in Supabase", result.error);
    }
  }
}

/** Fetch all games — returns demo data in demo mode */
export async function fetchAllGames(): Promise<Game[]> {
  if (isDemoMode()) return applyAutoTransitions(DEMO_GAMES).games;
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("games")
    .select(GAME_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const { games, transitions } = applyAutoTransitions(data.map(mapDbGameToGame));
  await persistTransitions(transitions);
  return games;
}

/** Fetch a single game by ID — returns demo game in demo mode */
export async function fetchGameById(id: string): Promise<Game | undefined> {
  if (isDemoMode()) {
    const game = DEMO_GAMES.find((g) => g.id === id);
    return game ? applyAutoTransitions([game]).games[0] : undefined;
  }
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("games")
    .select(GAME_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return undefined;

  const { games, transitions } = applyAutoTransitions([mapDbGameToGame(data)]);
  await persistTransitions(transitions);
  return games[0];
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
  if (isDemoMode()) {
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

    return { id: "", error: error.message };
  }

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
    if (optError) return { id: "", error: optError.message };
  }

  // Invite players (only real UUIDs)
  if (realPlayerIds.length > 0) {
    const playerInserts = realPlayerIds.map((pid) => ({
      game_id: gameId,
      user_id: pid,
      status: "invited" as const,
    }));
    const { error: playerError } = await supabase!.from("game_players").insert(playerInserts);
    if (playerError) return { id: "", error: playerError.message };
  }

  return { id: gameId, error: null };
}

export async function addGameOption(gameId: string, option: { date: string, start_time: string, end_time: string, location?: string }): Promise<boolean> {
  if (isDemoMode()) return false;
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
  if (isDemoMode()) return false;
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
  if (isDemoMode()) return false;
  const { error } = await supabase!.from("game_options").delete().eq("id", optionId);
  return !error;
}

export async function updateGameVotingDeadline(gameId: string, deadline: string): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await supabase!.from("games").update({ voting_deadline: deadline }).eq("id", gameId);
  return !error;
}

export async function cancelGame(gameId: string, reason?: string): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await supabase!
    .from("games")
    .update({ status: "cancelled", cancellation_reason: reason ?? null })
    .eq("id", gameId);
  return !error;
}

export async function confirmGame(gameId: string, optionId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await supabase!
    .from("games")
    .update({ status: "confirmed", confirmed_option_id: optionId })
    .eq("id", gameId);
  return !error;
}

export async function unconfirmGame(gameId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await supabase!
    .from("games")
    .update({ status: "proposal", confirmed_option_id: null })
    .eq("id", gameId);
  return !error;
}

export async function completeGame(gameId: string, attendeeUserIds: string[] = []): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await supabase!.from("games").update({ status: "completed" }).eq("id", gameId);
  if (error) return false;
  for (const uid of attendeeUserIds) {
    const { data: p } = await supabase!
      .from("profiles")
      .select("games_played")
      .eq("id", uid)
      .single();
    if (p) {
      await supabase!
        .from("profiles")
        .update({ games_played: (p.games_played || 0) + 1 })
        .eq("id", uid);
    }
  }
  return true;
}

export async function clearVotesForOption(optionId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  if (!supabase) return false;
  const { error } = await supabase.from("votes").delete().eq("option_id", optionId);
  if (!error) {
    await supabase
      .from("game_options")
      .update({ in_votes: 0, maybe_votes: 0, out_votes: 0 })
      .eq("id", optionId);
  }
  return !error;
}

// ─── Vote helpers ─────────────────────────────────────────────────────────────

/** Re-count votes for an option and sync the aggregate columns on game_options. */
async function syncVoteCounts(optionId: string): Promise<void> {
  if (!supabase) return;
  const { data: rows } = await supabase
    .from("votes")
    .select("value")
    .eq("option_id", optionId);
  if (!rows) return;
  const counts = { in_votes: 0, maybe_votes: 0, out_votes: 0 };
  for (const r of rows) {
    if (r.value === "in") counts.in_votes++;
    else if (r.value === "maybe") counts.maybe_votes++;
    else if (r.value === "out") counts.out_votes++;
  }
  await supabase.from("game_options").update(counts).eq("id", optionId);
}

/**
 * Upsert a vote for the current user on a game option.
 * Returns true on success, false in demo mode or on error.
 */
export async function castVote(
  optionId: string,
  userId: string,
  value: "in" | "maybe" | "out"
): Promise<boolean> {
  if (isDemoMode()) return false;
  if (!supabase) return false;

  const { error } = await supabase.from("votes").upsert(
    { option_id: optionId, user_id: userId, value },
    { onConflict: "option_id,user_id" }
  );
  if (error) return false;

  await syncVoteCounts(optionId);
  return true;
}

/**
 * Remove the current user's vote from a game option (un-vote).
 * Returns true on success, false in demo mode or on error.
 */
export async function deleteVote(optionId: string, userId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  if (!supabase) return false;

  const { error } = await supabase
    .from("votes")
    .delete()
    .eq("option_id", optionId)
    .eq("user_id", userId);
  if (error) return false;

  await syncVoteCounts(optionId);
  return true;
}

/**
 * Load the current user's votes for all options of a game.
 * Returns a map of optionId → vote value, or {} in demo mode.
 */
export async function getUserVotes(
  gameId: string,
  userId: string
): Promise<Record<string, "in" | "maybe" | "out">> {
  if (isDemoMode()) return {};
  if (!supabase) return {};

  // Get all option IDs for this game
  const { data: opts } = await supabase
    .from("game_options")
    .select("id")
    .eq("game_id", gameId);
  if (!opts || opts.length === 0) return {};

  const optionIds = opts.map((o: { id: string }) => o.id);

  const { data: voteRows } = await supabase
    .from("votes")
    .select("option_id, value")
    .eq("user_id", userId)
    .in("option_id", optionIds);
  if (!voteRows) return {};

  const result: Record<string, "in" | "maybe" | "out"> = {};
  for (const row of voteRows) {
    result[row.option_id] = row.value as "in" | "maybe" | "out";
  }
  return result;
}
