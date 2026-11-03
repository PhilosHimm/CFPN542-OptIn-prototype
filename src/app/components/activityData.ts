// ─── Shared activity data — Neon-backed ───
import { db, isDemoMode } from "@/lib/db";
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
  status?: "pending" | "approved";
  proposedBy?: string | null;
  votes: {
    in: string[];
    maybe: string[];
    out: string[];
  };
}

export type ActivityStatus = "proposal" | "confirmed" | "completed" | "cancelled";

export interface Activity {
  id: string;
  title: string;
  type: string;
  typeEmoji: string;
  location: string;
  intensity: "casual" | "competitive";
  status: ActivityStatus;
  // Nullable in Postgres (max_players has no NOT NULL in the live schema), so
  // every consumer must guard. Declaring it non-null produced "5/null" in the UI.
  maxPlayers: number | null;
  totalCost: number;
  splitCost: boolean;
  /** Set when the host priced the activity per person rather than as a fixed total. */
  perPersonCost?: number;
  /**
   * How the host priced the activity (migration 019's activities.cost_type). Optional
   * because demo-mode activities predate the column; ActivityViewScreen falls back to
   * inferring it from totalCost/perPersonCost when absent, same as before.
   */
  costType?: "free" | "per_player" | "fixed";
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
  visibility?: string;
}

// ─── Helpers ──────────────────────────────────────────────

// ─── Type Minimums ─────────────────────────────────────────

export const TYPE_MINIMUMS: Record<string, number> = {
  Soccer: 10,
  Basketball: 5,
  Volleyball: 6,
  Tennis: 2,
  Pickleball: 4,
  "Flag Football": 8,
  Softball: 9,
  Hockey: 10,
  Baseball: 9,
  Rugby: 14,
  Badminton: 2,
  "Ultimate Frisbee": 14,
  Lacrosse: 10,
  Golf: 1,
  Cricket: 11,
};

export function getMinPlayers(type: string): number {
  return TYPE_MINIMUMS[type] ?? 2;
}

/**
 * The demo activities below are written as if today were this date. Every demo
 * date is shifted by the same number of days so the data always reads relative
 * to the real today: "tomorrow" stays tomorrow, last week stays last week.
 * (Demo mode used to freeze its own clock at this date instead, but countdowns
 * and the calendar read the real clock, so every proposal looked expired.)
 */
const DEMO_AUTHORED_TODAY = "2026-03-24";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DEMO_DAY_OFFSET = Math.round(
  (Date.parse(toDateStr(new Date()) + "T00:00:00Z") - Date.parse(DEMO_AUTHORED_TODAY + "T00:00:00Z")) / 86_400_000
);

/** Shifts an authored demo date (YYYY-MM-DD) to the same distance from today. */
function demoDate(authored: string): string {
  const d = new Date(authored + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + DEMO_DAY_OFFSET);
  return d.toISOString().slice(0, 10);
}

/** Display form ("Wed, Nov 4") of a shifted demo date. */
function demoDisplayDate(authored: string): string {
  return formatDisplayDate(demoDate(authored));
}

/**
 * Applies automatic status transitions for expired activities:
 *  - proposal  + all dates past → cancelled  (voting closed, never confirmed)
 *  - confirmed + confirmed date past → completed (activity already happened)
 */
function applyAutoTransitions(activities: Activity[]): { activities: Activity[]; transitions: { id: string; newStatus: "cancelled" | "completed" }[] } {
  const now = new Date();
  const todayStr = toDateStr(now);
  const transitions: { id: string; newStatus: "cancelled" | "completed" }[] = [];
  const updated = activities.map((g) => {
    if (g.status === "proposal") {
      const deadlinePassed = g.votingDeadline ? new Date(g.votingDeadline) < now : false;
      const allPast = g.timeOptions.length > 0 && g.timeOptions.every((o) => o.date < todayStr);
      if (deadlinePassed && allPast) {
        transitions.push({ id: g.id, newStatus: "cancelled" });
        return { ...g, status: "cancelled" as ActivityStatus };
      }
    }
    if (g.status === "confirmed") {
      const confirmedOpt = g.timeOptions.find((o) => o.id === g.confirmedOptionId);
      if (confirmedOpt && confirmedOpt.date < todayStr) {
        transitions.push({ id: g.id, newStatus: "completed" });
        return { ...g, status: "completed" as ActivityStatus };
      }
    }
    return g;
  });
  return { activities: updated, transitions };
}

/** Returns true if the activity has at least one option whose date is today or in the future. */
export function isActivityVotable(activity: Activity): boolean {
  if (activity.status !== "proposal") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return activity.timeOptions.some((opt) => {
    const optDate = new Date(opt.date + "T00:00:00");
    return optDate >= today;
  });
}

// ─── Demo activity data ───────────────────────────────────────

/**
 * Plain gray hero for activity types with no photo in TYPE_HERO_IMAGES
 * (custom activity types, non-sport plans). #2D2F2C is --surface-container-high in
 * the .dark ramp, the only palette users see. A data URI can't read CSS tokens.
 */
export const DEFAULT_HERO_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="16" height="9" fill="#2D2F2C"/></svg>');

const TYPE_HERO_IMAGES: Record<string, string> = {
  Soccer:           "https://images.unsplash.com/photo-1767406657699-9f3e01a48ea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBmaWVsZCUyMG91dGRvb3IlMjByZWNyZWF0aW9uJTIwZ3JlZW58ZW58MXx8fHwxNzcxNjMxNDI1fDA&ixlib=rb-4.1.0&q=80&w=1080",
  Basketball:       "https://images.unsplash.com/photo-1762025858816-bb383940763a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwY291cnQlMjBpbmRvb3IlMjByZWNyZWF0aW9uJTIwZ2FtZXxlbnwxfHx8fDE3NzE2MzE0MjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
  Volleyball:       "https://images.unsplash.com/photo-1771526087551-db6be2f51a28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2xsZXliYWxsJTIwc2FuZCUyMGJlYWNoJTIwc3BvcnQlMjBjb3VydHxlbnwxfHx8fDE3NzE2MzE0MjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  Tennis:           "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Pickleball:       "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Hockey:           "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Baseball:         "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Rugby:            "https://images.unsplash.com/photo-1580974852861-29a31dc3df43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Badminton:        "https://images.unsplash.com/photo-1613918431703-aa50889e3be8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "Flag Football":  "https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Softball:         "https://images.unsplash.com/photo-1529768167801-9173d94c2a42?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "Ultimate Frisbee": "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Lacrosse:         "https://images.unsplash.com/photo-1605152276897-4f618f831968?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Golf:             "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  Cricket:          "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
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

export const DEMO_ACTIVITIES: Activity[] = [
  // ── PROPOSALS ─────────────────────────────────────────────────────────────
  {
    id: "activity1",
    title: "Night Court Basketball",
    type: "Basketball", typeEmoji: "🏀",
    location: "Riverside Community Courts",
    intensity: "casual", status: "proposal",
    maxPlayers: 10, totalCost: 40, splitCost: true, visibility: "Public",
    group: "g1", heroImage: TYPE_HERO_IMAGES.Basketball,
    date: demoDisplayDate("2026-03-25"), time: "7:00 PM - 9:00 PM",
    votingDeadline: deadline(14), createdBy: "Sam Wilson",
    roster: p(["AR", "JK", "TS", "RP", "SW", "ML", "CT"]),
    timeOptions: [
      { id: "o1a", date: demoDate("2026-03-25"), startTime: "19:00", endTime: "21:00",
        location: "Riverside Community Courts",
        votes: votes(["AR","JK","TS","RP","SW"], ["ML","CT"], ["DC"]) },
      { id: "o1b", date: demoDate("2026-03-25"), startTime: "18:30", endTime: "20:30",
        location: "City Gym — Court B",
        votes: votes(["ML","CT","DC"], ["AR","JK","TS"], ["RP","SW"]) },
      { id: "o1c", date: demoDate("2026-03-26"), startTime: "20:00", endTime: "22:00",
        location: "Riverside Community Courts",
        votes: votes(["AR","TS","RP","SW"], ["JK"], []) },
    ],
  },
  {
    id: "activity3",
    title: "After-Work Volleyball Meetup",
    type: "Volleyball", typeEmoji: "🏐",
    location: "Beach Volleyball Courts — Court 1",
    intensity: "casual", status: "proposal",
    maxPlayers: 8, totalCost: 20, splitCost: true, visibility: "Public",
    group: "g3", heroImage: TYPE_HERO_IMAGES.Volleyball,
    date: demoDisplayDate("2026-03-28"), time: "5:30 PM - 7:30 PM",
    votingDeadline: deadline(6), createdBy: "Taylor Smith",
    roster: p(["TS","AR","JK","DC","RP"]),
    timeOptions: [
      { id: "o3a", date: demoDate("2026-03-28"), startTime: "17:30", endTime: "19:30",
        location: "Beach Volleyball Courts — Court 1",
        votes: votes(["TS","AR","JK","DC"], ["RP"], []) },
      { id: "o3b", date: demoDate("2026-03-29"), startTime: "09:00", endTime: "11:00",
        location: "Rec Center — Gym 2",
        votes: votes(["RP","ML"], ["CT","DC"], ["TS"]) },
    ],
  },
  {
    id: "activity5",
    title: "Pickleball Doubles",
    type: "Pickleball", typeEmoji: "🏓",
    location: "Westside Pickleball Club — Courts 3 & 4",
    intensity: "competitive", status: "proposal",
    maxPlayers: 8, totalCost: 32, splitCost: true, visibility: "Public",
    group: "g4", heroImage: TYPE_HERO_IMAGES.Pickleball,
    date: demoDisplayDate("2026-03-27"), time: "6:00 PM - 8:00 PM",
    votingDeadline: deadline(38), createdBy: "Alex Rivera",
    roster: p(["AR","TS","RP","JK"]),
    timeOptions: [
      { id: "o5a", date: demoDate("2026-03-27"), startTime: "18:00", endTime: "20:00",
        location: "Westside Pickleball Club — Courts 3 & 4",
        votes: votes(["AR","TS","RP"], ["JK"], []) },
      { id: "o5b", date: demoDate("2026-03-28"), startTime: "19:00", endTime: "21:00",
        location: "Westside Pickleball Club — Courts 3 & 4",
        votes: votes(["JK"], ["AR","TS"], ["RP"]) },
    ],
  },
  {
    id: "activity6",
    title: "Morning Tennis",
    type: "Tennis", typeEmoji: "🎾",
    location: "Lakeside Tennis Center — Court 2",
    intensity: "casual", status: "proposal",
    maxPlayers: 4, totalCost: 24, splitCost: true, visibility: "Public",
    group: "g4", heroImage: TYPE_HERO_IMAGES.Tennis,
    date: demoDisplayDate("2026-03-29"), time: "8:00 AM - 10:00 AM",
    votingDeadline: deadline(62), createdBy: "Riley Park",
    roster: p(["RP","SW"]),
    timeOptions: [
      { id: "o6a", date: demoDate("2026-03-29"), startTime: "08:00", endTime: "10:00",
        location: "Lakeside Tennis Center — Court 2",
        votes: votes(["RP","SW"], ["TS"], []) },
      { id: "o6b", date: demoDate("2026-03-29"), startTime: "10:30", endTime: "12:30",
        location: "Lakeside Tennis Center — Court 2",
        votes: votes([], ["RP","SW"], ["TS"]) },
    ],
  },

  // ── CONFIRMED ─────────────────────────────────────────────────────────────
  {
    id: "activity2",
    title: "Weekend Soccer Match",
    type: "Soccer", typeEmoji: "⚽",
    location: "Lakeside Park — Pitch 3",
    intensity: "casual", status: "confirmed",
    maxPlayers: 14, totalCost: 0, splitCost: false, visibility: "Public",
    group: "g2", heroImage: TYPE_HERO_IMAGES.Soccer,
    date: demoDisplayDate("2026-03-29"), time: "10:00 AM - 12:00 PM",
    votingDeadline: deadline(-2), createdBy: "Riley Park",
    confirmedOptionId: "o2a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o2a", date: demoDate("2026-03-29"), startTime: "10:00", endTime: "12:00",
        location: "Lakeside Park — Pitch 3",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], ["DC"], []) },
    ],
  },
  {
    id: "activity7",
    title: "Hoops Night",
    type: "Basketball", typeEmoji: "🏀",
    location: "City Gym — Main Court",
    intensity: "casual", status: "confirmed",
    maxPlayers: 12, totalCost: 50, splitCost: true, visibility: "Public",
    group: "g1", heroImage: TYPE_HERO_IMAGES.Basketball,
    date: demoDisplayDate("2026-03-26"), time: "7:30 PM - 9:30 PM",
    votingDeadline: deadline(-1), createdBy: "Jordan Kim",
    confirmedOptionId: "o7a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o7a", date: demoDate("2026-03-26"), startTime: "19:30", endTime: "21:30",
        location: "City Gym — Main Court",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], ["DC"], []) },
    ],
  },
  {
    id: "activity8",
    title: "Competitive Volleyball League Night",
    type: "Volleyball", typeEmoji: "🏐",
    location: "Rec Center — Gym 1",
    intensity: "competitive", status: "confirmed",
    maxPlayers: 12, totalCost: 60, splitCost: true, visibility: "Public",
    group: "g3", heroImage: TYPE_HERO_IMAGES.Volleyball,
    date: demoDisplayDate("2026-03-27"), time: "8:00 PM - 10:00 PM",
    votingDeadline: deadline(-3), createdBy: "Casey Torres",
    confirmedOptionId: "o8a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o8a", date: demoDate("2026-03-27"), startTime: "20:00", endTime: "22:00",
        location: "Rec Center — Gym 1",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], [], []) },
    ],
  },

  // ── COMPLETED ─────────────────────────────────────────────────────────────
  {
    id: "activity4",
    title: "Morning Pickup Basketball",
    type: "Basketball", typeEmoji: "🏀",
    location: "Riverside Community Courts",
    intensity: "casual", status: "completed",
    maxPlayers: 10, totalCost: 0, splitCost: false, visibility: "Public",
    group: "g1", heroImage: TYPE_HERO_IMAGES.Basketball,
    date: demoDisplayDate("2026-03-16"), time: "9:00 AM - 11:00 AM",
    votingDeadline: deadline(-192), createdBy: "Jordan Kim",
    confirmedOptionId: "o4a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o4a", date: demoDate("2026-03-16"), startTime: "09:00", endTime: "11:00",
        location: "Riverside Community Courts",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], [], ["DC"]) },
    ],
  },
  {
    id: "activity9",
    title: "Soccer Scrimmage",
    type: "Soccer", typeEmoji: "⚽",
    location: "Lakeside Park — Pitch 1",
    intensity: "casual", status: "completed",
    maxPlayers: 14, totalCost: 0, splitCost: false, visibility: "Public",
    group: "g2", heroImage: TYPE_HERO_IMAGES.Soccer,
    date: demoDisplayDate("2026-03-15"), time: "11:00 AM - 1:00 PM",
    votingDeadline: deadline(-216), createdBy: "Alex Rivera",
    confirmedOptionId: "o9a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o9a", date: demoDate("2026-03-15"), startTime: "11:00", endTime: "13:00",
        location: "Lakeside Park — Pitch 1",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], ["DC"], []) },
    ],
  },
  {
    id: "activity10",
    title: "Net Gang Volleyball",
    type: "Volleyball", typeEmoji: "🏐",
    location: "Rec Center — Gym 2",
    intensity: "casual", status: "completed",
    maxPlayers: 8, totalCost: 24, splitCost: true, visibility: "Public",
    group: "g3", heroImage: TYPE_HERO_IMAGES.Volleyball,
    date: demoDisplayDate("2026-03-14"), time: "6:00 PM - 8:00 PM",
    votingDeadline: deadline(-240), createdBy: "Taylor Smith",
    confirmedOptionId: "o10a",
    roster: p(["TS","AR","JK","ML","CT","RP","DC","SW"]),
    timeOptions: [
      { id: "o10a", date: demoDate("2026-03-14"), startTime: "18:00", endTime: "20:00",
        location: "Rec Center — Gym 2",
        votes: votes(["TS","AR","JK","ML","CT","RP","DC","SW"], [], []) },
    ],
  },
  {
    id: "activity11",
    title: "Competitive Hoops — 5v5",
    type: "Basketball", typeEmoji: "🏀",
    location: "Riverside Community Courts",
    intensity: "competitive", status: "completed",
    maxPlayers: 10, totalCost: 0, splitCost: false, visibility: "Public",
    group: "g1", heroImage: TYPE_HERO_IMAGES.Basketball,
    date: demoDisplayDate("2026-03-11"), time: "7:00 PM - 9:00 PM",
    votingDeadline: deadline(-312), createdBy: "Sam Wilson",
    confirmedOptionId: "o11a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o11a", date: demoDate("2026-03-11"), startTime: "19:00", endTime: "21:00",
        location: "Riverside Community Courts",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], [], []) },
    ],
  },
  {
    id: "activity12",
    title: "Soccer Fun Run",
    type: "Soccer", typeEmoji: "⚽",
    location: "Greenfield Soccer Park — Pitch 2",
    intensity: "casual", status: "completed",
    maxPlayers: 16, totalCost: 28, splitCost: true, visibility: "Public",
    group: "g2", heroImage: TYPE_HERO_IMAGES.Soccer,
    date: demoDisplayDate("2026-03-09"), time: "2:00 PM - 4:30 PM",
    votingDeadline: deadline(-360), createdBy: "Casey Torres",
    confirmedOptionId: "o12a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"]),
    timeOptions: [
      { id: "o12a", date: demoDate("2026-03-09"), startTime: "14:00", endTime: "16:30",
        location: "Greenfield Soccer Park — Pitch 2",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW","MJ"], ["DC"], []) },
    ],
  },
  {
    id: "activity13",
    title: "Hoops — Weekly Run",
    type: "Basketball", typeEmoji: "🏀",
    location: "Riverside Community Courts",
    intensity: "casual", status: "completed",
    maxPlayers: 10, totalCost: 0, splitCost: false, visibility: "Public",
    group: "g1", heroImage: TYPE_HERO_IMAGES.Basketball,
    date: demoDisplayDate("2026-03-04"), time: "7:00 PM - 9:00 PM",
    votingDeadline: deadline(-480), createdBy: "Marcus Johnson",
    confirmedOptionId: "o13a",
    roster: p(["AR","JK","TS","ML","CT","RP","DC","SW"]),
    timeOptions: [
      { id: "o13a", date: demoDate("2026-03-04"), startTime: "19:00", endTime: "21:00",
        location: "Riverside Community Courts",
        votes: votes(["AR","JK","TS","ML","CT","RP","DC","SW"], ["MJ"], ["CT"]) },
    ],
  },
  {
    id: "activity14",
    title: "Smash Club — Tennis Doubles",
    type: "Tennis", typeEmoji: "🎾",
    location: "Lakeside Tennis Center — Court 1",
    intensity: "competitive", status: "completed",
    maxPlayers: 4, totalCost: 48, splitCost: true, visibility: "Public",
    group: "g4", heroImage: TYPE_HERO_IMAGES.Tennis,
    date: demoDisplayDate("2026-03-01"), time: "10:00 AM - 12:00 PM",
    votingDeadline: deadline(-552), createdBy: "Riley Park",
    confirmedOptionId: "o14a",
    roster: p(["RP","AR","SW","TS"]),
    timeOptions: [
      { id: "o14a", date: demoDate("2026-03-01"), startTime: "10:00", endTime: "12:00",
        location: "Lakeside Tennis Center — Court 1",
        votes: votes(["RP","AR","SW","TS"], [], []) },
    ],
  },

  // ── CANCELLED ─────────────────────────────────────────────────────────────
  {
    id: "activity15",
    title: "Rainy Day Soccer",
    type: "Soccer", typeEmoji: "⚽",
    location: "Greenfield Soccer Park — Pitch 1",
    intensity: "casual", status: "cancelled",
    maxPlayers: 14, totalCost: 0, splitCost: false, visibility: "Public",
    group: "g2", heroImage: TYPE_HERO_IMAGES.Soccer,
    date: demoDisplayDate("2026-03-22"), time: "1:00 PM - 3:00 PM",
    votingDeadline: deadline(-48), createdBy: "Morgan Lee",
    roster: p(["ML","CT","DC","JK"]),
    timeOptions: [
      { id: "o15a", date: demoDate("2026-03-22"), startTime: "13:00", endTime: "15:00",
        location: "Greenfield Soccer Park — Pitch 1",
        votes: votes(["ML","CT","DC","JK"], ["AR"], ["TS","RP","SW"]) },
    ],
  },
  {
    id: "activity16",
    title: "Late Night Basketball",
    type: "Basketball", typeEmoji: "🏀",
    location: "City Gym — Court B",
    intensity: "casual", status: "cancelled",
    maxPlayers: 10, totalCost: 30, splitCost: true, visibility: "Public",
    group: "g1", heroImage: TYPE_HERO_IMAGES.Basketball,
    date: demoDisplayDate("2026-03-20"), time: "9:00 PM - 11:00 PM",
    votingDeadline: deadline(-96), createdBy: "Drew Chen",
    roster: p(["DC","JK","ML"]),
    timeOptions: [
      { id: "o16a", date: demoDate("2026-03-20"), startTime: "21:00", endTime: "23:00",
        location: "City Gym — Court B",
        votes: votes(["DC","JK","ML"], ["AR"], ["TS","RP","SW","CT","MJ"]) },
    ],
  },
];

/** Visibility values the `activities.visibility` CHECK constraint accepts. */
const DB_VISIBILITIES = ["Public", "Group Only", "Private"];

/**
 * Voting closes `hours` before the earliest proposed start time.
 * Falls back to now()+hours when there are no usable options, and clamps into
 * (now, earliestStart) so the deadline can never land in the past or after the
 * activity itself.
 */
export function computeVotingDeadline(
  timeOptions: { date: string; startTime: string }[],
  hours: number | undefined,
): Date {
  const period = hours && hours > 0 ? hours : 24;
  const now = new Date();

  const starts = (timeOptions || [])
    .filter((o) => o.date && o.startTime)
    .map((o) => new Date(`${o.date}T${o.startTime}`))
    .filter((d) => !Number.isNaN(d.getTime()));

  if (starts.length === 0) {
    return new Date(now.getTime() + period * 3600_000);
  }

  const earliest = new Date(Math.min(...starts.map((d) => d.getTime())));
  const target = new Date(earliest.getTime() - period * 3600_000);

  // Deadline already passed (short-notice activity): give voters a slice of the
  // remaining time instead of a deadline in the past.
  if (target <= now) {
    const midpoint = new Date((now.getTime() + earliest.getTime()) / 2);
    return midpoint > now ? midpoint : earliest;
  }
  return target;
}

function formatTime12h(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function mapDbActivityToActivity(g: any): Activity {
  const opts = (g.activity_options || []) as any[];
  const first = opts[0];
  const confirmedOpt = g.confirmed_option_id
    ? opts.find((o: any) => o.id === g.confirmed_option_id) || first
    : first;

  const displayOpt = confirmedOpt || first;
  const displayDate = displayOpt?.display_date || displayOpt?.date || "";
  const timeStr = displayOpt
    ? `${formatTime12h(displayOpt.start_time)} - ${formatTime12h(displayOpt.end_time)}`
    : "";

  // Build real roster from activity_players joined with profiles
  const activityPlayers = (g.activity_players || []) as any[];
  const roster: Player[] = activityPlayers
    .filter((p: any) => p.status === "joined")
    .map((p: any) => ({
      id: p.user_id,
      name: p.profiles?.name ?? "Player",
      avatar: p.profiles?.avatar_url ?? "",
    }));

  return {
    id: g.id,
    title: g.title,
    type: g.type,
    typeEmoji: g.type_emoji || "",
    location: displayOpt?.location || "",
    intensity: (g.intensity || "casual").toLowerCase() as "casual" | "competitive",
    status: g.status as ActivityStatus,
    maxPlayers: g.max_players,
    totalCost: g.total_cost || 0,
    splitCost: (g.total_cost || 0) > 0,
    // Per-player pricing writes total_cost=0 and per_person_cost=X. Without
    // this the cost UI derived everything from total_cost and rendered paid
    // activities as "Free".
    perPersonCost: g.per_person_cost || 0,
    costType: g.cost_type as "free" | "per_player" | "fixed" | undefined,
    group: g.group_id || "",
    heroImage: TYPE_HERO_IMAGES[g.type] || DEFAULT_HERO_IMAGE,
    date: displayDate,
    time: timeStr,
    votingDeadline: g.voting_deadline || "",
    confirmedOptionId: g.confirmed_option_id || undefined,
    cancellationReason: g.cancellation_reason || undefined,
    createdBy: g.created_by || "",
    visibility: g.visibility || "Public",
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
        status: (o.status ?? "approved") as "pending" | "approved",
        proposedBy: o.proposed_by ?? null,
        votes: {
          in: voteRows.filter((v) => v.value === "in").map((v) => v.user_id),
          maybe: voteRows.filter((v) => v.value === "maybe").map((v) => v.user_id),
          out: voteRows.filter((v) => v.value === "out").map((v) => v.user_id),
        },
      };
    }),
  };
}

// Data API select string — fetches individual vote rows and real player profiles
// so mapDbActivityToActivity can build genuine voter ID arrays and a real roster.
// activity_options!activity_options_activity_id_fkey disambiguates the embed: activities and
// activity_options have two FKs between them (activity_options.activity_id -> activities.id,
// and activities.confirmed_option_id -> activity_options.id), so an unqualified
// `activity_options(...)` embed is ambiguous to PostgREST and 300s.
const ACTIVITY_SELECT =
  "*, activity_options!activity_options_activity_id_fkey(*, votes(value, user_id)), activity_players(status, user_id, profiles:user_id(id, name, avatar_url))";

/**
 * The signed-in user's activities: ones they created or have joined. RLS also
 * lets them read every Public activity and ones they're only invited to, so
 * without this filter Home and Calendar listed strangers' Public activities,
 * and invites that belong in the notifications panel. Returns demo data in
 * demo mode.
 */
export async function fetchAllActivities(): Promise<Activity[]> {
  if (isDemoMode()) return applyAutoTransitions(DEMO_ACTIVITIES).activities;
  if (!db) return [];

  const { data: { session } } = await db.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];

  // Advance any activity past its voting deadline (or end time) before reading,
  // so the list never shows a decided activity as still voting. There is no
  // pg_cron, so opening the app is what runs this sweep.
  const sweep = await db.rpc("auto_transition_all_activities");
  if (sweep.error) console.error("[OptIn] auto_transition_all_activities failed:", sweep.error.message);

  const { data, error } = await db
    .from("activities")
    .select(ACTIVITY_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((a: any) =>
      a.created_by === uid ||
      (a.activity_players || []).some((p: any) => p.user_id === uid && p.status === "joined"))
    .map(mapDbActivityToActivity);
}

/** Fetch a single activity by ID — returns demo activity in demo mode */
export async function fetchActivityById(id: string): Promise<Activity | undefined> {
  if (isDemoMode()) {
    const activity = DEMO_ACTIVITIES.find((g) => g.id === id);
    return activity ? applyAutoTransitions([activity]).activities[0] : undefined;
  }
  if (!db) return undefined;

  // Run server-side auto-transition before reading — SECURITY DEFINER so any
  // authenticated user can trigger confirmed→completed and proposal→cancelled.
  await db.rpc("auto_transition_activity", { p_activity_id: id });

  const { data, error } = await db
    .from("activities")
    .select(ACTIVITY_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return undefined;

  return mapDbActivityToActivity(data);
}

/**
 * Call the server-side auto_transition_activity RPC for an activity.
 * Works for any authenticated user (SECURITY DEFINER bypasses RLS).
 */
export async function autoTransitionActivity(activityId: string): Promise<void> {
  if (isDemoMode() || !db) return;
  await db.rpc("auto_transition_activity", { p_activity_id: activityId });
}

// Check if a string looks like a valid UUID
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/** Save a new activity to the database */
export async function saveActivity(input: {
  title: string;
  type: string;
  intensity: "casual" | "competitive";
  costType: "free" | "per_player" | "fixed";
  maxPlayers: number | null;
  totalCost: number;
  perPersonCost: number;
  location: string;
  groupId: string;
  visibility: string;
  createdBy: string;
  timeOptions: { date: string; startTime: string; endTime: string; location: string }[];
  invitedPlayerIds: string[];
  votingPeriodHours?: number;
}): Promise<{ id: string; error: string | null }> {
  if (!input.title.trim()) {
    return { id: "", error: "Give the activity a title." };
  }

  const usableOptions = input.timeOptions.filter((o) => o.date && o.startTime);
  if (usableOptions.length === 0) {
    return { id: "", error: "Add at least one time option with a date and start time." };
  }
  const badRange = usableOptions.find((o) => o.endTime && o.endTime <= o.startTime);
  if (badRange) {
    return { id: "", error: "End time must be after the start time." };
  }
  // Compared as strings ("YYYY-MM-DD"), which sorts correctly and avoids the
  // timezone ambiguity of parsing into a Date. See docs/BACKLOG.md item #42.
  const today = new Date().toISOString().split("T")[0];
  const pastDate = usableOptions.find((o) => o.date < today);
  if (pastDate) {
    return { id: "", error: "Proposed times can't be in the past." };
  }

  // Demo mode has no backend to persist to, so it mirrors every other demo
  // mutation (joinActivity, leaveActivity, castVote, …) by validating like the real
  // path and then reporting success, rather than either hard-failing (as this
  // used to unconditionally do, breaking Create Activity in demo mode entirely)
  // or faking success with no validation. See docs/BACKLOG.md item #30.
  if (isDemoMode()) {
    return { id: `demo-activity-${Date.now()}`, error: null };
  }

  // Validate createdBy is a real UUID (auth user id)
  if (!input.createdBy || !isValidUUID(input.createdBy)) {
    return { id: "", error: "No authenticated user. Please log in." };
  }

  const typeEmojis: Record<string, string> = {
    Soccer: "\u26BD",
    Basketball: "\uD83C\uDFC0",
    Volleyball: "\uD83C\uDFD0",
    Tennis: "\uD83C\uDFBE",
    Pickleball: "\uD83C\uDFD3",
    "Flag Football": "\uD83C\uDFC8",
    Softball: "\u26BE",
    Hockey: "\uD83C\uDFD2",
    Baseball: "\u26BE",
    Rugby: "\uD83C\uDFC9",
    Badminton: "\uD83C\uDFF8",
    "Ultimate Frisbee": "\uD83E\uDD4F",
    Lacrosse: "\uD83E\uDD4D",
    Golf: "\u26F3",
    Cricket: "\uD83C\uDFCF",
  };

  // Only use group_id if it's a valid UUID (mock IDs like "g1" are not valid)
  const groupId = input.groupId && isValidUUID(input.groupId) ? input.groupId : null;

  // Voting closes N hours BEFORE the earliest proposed start time, which is what
  // the UI promises ("How long before the first proposed time should voting
  // close?"). The previous now()+N calculation ignored the proposed times
  // entirely, so the default 24h period put the deadline *after* the activity.
  const votingDeadline = computeVotingDeadline(input.timeOptions, input.votingPeriodHours);

  // Single transactional RPC (migration 016, applied 2026-07-27). The previous
  // three-insert sequence could commit an activity and then fail on its options or
  // invites, orphaning a row the caller could not clean up because it discarded
  // the generated id. `created_by` is taken from auth.uid() inside the function,
  // so input.createdBy is validated above but not sent.
  const rpc = await db!.rpc("create_activity_with_options", {
    p_title: input.title,
    p_type: input.type,
    p_type_emoji: typeEmojis[input.type] || "",
    p_type_color: "#2D7A3A",
    p_intensity: input.intensity === "casual" ? "Casual" : "Competitive",
    p_max_players: input.maxPlayers ?? undefined,
    p_group_id: groupId ?? undefined,
    p_voting_deadline: votingDeadline.toISOString(),
    p_total_cost: input.totalCost,
    p_per_person_cost: input.perPersonCost,
    p_cost_type: input.costType,
    p_visibility: DB_VISIBILITIES.includes(input.visibility) ? input.visibility : "Private",
    p_options: usableOptions.map((o) => ({
      date: o.date,
      start_time: o.startTime,
      end_time: o.endTime || "",
      location: o.location || input.location || "",
    })),
    p_invited_ids: input.invitedPlayerIds?.filter(isValidUUID) || [],
  });

  if (rpc.error) {
    return { id: "", error: rpc.error.message };
  }
  return { id: rpc.data as string, error: null };
}

// Matches the server's `to_char(date, 'Dy, Mon FMDD')` format used by the
// create_activity_with_options RPC, so display_date reads the same everywhere
// regardless of which code path wrote it. See docs/BACKLOG.md item #50 — this
// used to be the raw ISO date string here and a differently-formatted string
// in activities.service.ts's now-deleted legacy createActivity().
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export async function addActivityOption(
  activityId: string,
  option: { date: string; start_time: string; end_time: string; location?: string },
  status: "pending" | "approved" = "approved",
  proposedBy?: string,
): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await db!.from("activity_options").insert({
    activity_id: activityId,
    date: option.date,
    display_date: formatDisplayDate(option.date),
    start_time: option.start_time,
    end_time: option.end_time,
    location: option.location || "",
    status,
    proposed_by: proposedBy ?? null,
  });
  return !error;
}

export async function approveActivityOption(optionId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await db!
    .from("activity_options")
    .update({ status: "approved" })
    .eq("id", optionId);
  return !error;
}

export async function updateActivityOption(optionId: string, option: { date: string, start_time: string, end_time: string, location?: string }): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await db!.from("activity_options").update({
    date: option.date,
    display_date: formatDisplayDate(option.date),
    start_time: option.start_time,
    end_time: option.end_time,
    location: option.location || "",
  }).eq("id", optionId);
  return !error;
}

export async function deleteActivityOption(optionId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await db!.from("activity_options").delete().eq("id", optionId);
  return !error;
}

export async function updateActivityVotingDeadline(activityId: string, deadline: string): Promise<boolean> {
  if (isDemoMode()) return false;
  const { error } = await db!.from("activities").update({ voting_deadline: deadline }).eq("id", activityId);
  return !error;
}

export async function updateActivityVisibility(activityId: string, visibility: "Public" | "Group Only" | "Private"): Promise<boolean> {
  if (isDemoMode()) {
    const idx = DEMO_ACTIVITIES.findIndex((g) => g.id === activityId);
    if (idx !== -1) DEMO_ACTIVITIES[idx].visibility = visibility;
    return true;
  }
  const { error } = await db!.from("activities").update({ visibility }).eq("id", activityId);
  return !error;
}

export async function deleteActivity(activityId: string): Promise<boolean> {
  if (isDemoMode()) {
    const idx = DEMO_ACTIVITIES.findIndex((g) => g.id === activityId);
    if (idx !== -1) DEMO_ACTIVITIES.splice(idx, 1);
    return true;
  }
  const { data, error } = await db!.from("activities").delete().eq("id", activityId).select("id");
  return !error && (data?.length ?? 0) > 0;
}

export async function cancelActivity(activityId: string, reason?: string): Promise<boolean> {
  if (isDemoMode()) return false;
  const { data, error } = await db!
    .from("activities")
    .update({ status: "cancelled", cancellation_reason: reason ?? null })
    .eq("id", activityId)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

export async function confirmActivity(activityId: string, optionId: string): Promise<boolean> {
  if (isDemoMode()) {
    // Demo voting deadlines run on the real clock, so they can expire while the
    // activity is open; confirm locally rather than report a permissions error.
    const activity = DEMO_ACTIVITIES.find((g) => g.id === activityId);
    if (!activity) return false;
    activity.status = "confirmed";
    activity.confirmedOptionId = optionId;
    return true;
  }
  const { data, error } = await db!
    .from("activities")
    .update({ status: "confirmed", confirmed_option_id: optionId })
    .eq("id", activityId)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

export async function unconfirmActivity(activityId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  // Reverting to `proposal` with an already-past deadline would let the next
  // auto-transition immediately re-decide the activity, so push the deadline out.
  const extended = new Date(Date.now() + 24 * 3600_000).toISOString();
  const { data, error } = await db!
    .from("activities")
    .update({ status: "proposal", confirmed_option_id: null, voting_deadline: extended })
    .eq("id", activityId)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

export async function completeActivity(activityId: string, attendeeUserIds: string[] = []): Promise<boolean> {
  if (isDemoMode()) return false;
  const { data, error } = await db!
    .from("activities")
    .update({ status: "completed" })
    .eq("id", activityId)
    .select("id");
  if (error || (data?.length ?? 0) === 0) return false;

  // NOTE: attendance stats are deliberately NOT incremented here any more.
  // `profiles` UPDATE is restricted to `auth.uid() = id`, so the previous
  // read-then-write loop silently failed for every attendee except the caller
  // (and its errors were never checked). It also lost updates under
  // concurrency. This belongs in a SECURITY DEFINER function driven by the
  // status transition — see the "attendance stats" task.
  void attendeeUserIds;
  return true;
}

export async function clearVotesForOption(optionId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  if (!db) return false;
  // Host-only (RLS "Host can clear votes on own options"); fn_sync_vote_counts
  // resets the option's counters as each vote row is deleted.
  const { error } = await db.from("votes").delete().eq("option_id", optionId);
  return !error;
}

// ─── Vote helpers ─────────────────────────────────────────────────────────────

/**
 * Upsert a vote for the current user on an activity option.
 * Returns true on success, false in demo mode or on error.
 */
export async function castVote(
  optionId: string,
  userId: string,
  value: "in" | "maybe" | "out"
): Promise<boolean> {
  if (isDemoMode()) return false;
  if (!db) return false;

  const { error } = await db.from("votes").upsert(
    { option_id: optionId, user_id: userId, value },
    { onConflict: "option_id,user_id" }
  );
  // fn_sync_vote_counts keeps the option's counters in step. The client used to
  // rewrite them too, which RLS silently rejected for everyone but the host.
  return !error;
}

/**
 * Remove the current user's vote from an activity option (un-vote).
 * Returns true on success, false in demo mode or on error.
 */
export async function deleteVote(optionId: string, userId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  if (!db) return false;

  const { error } = await db
    .from("votes")
    .delete()
    .eq("option_id", optionId)
    .eq("user_id", userId);
  return !error;
}

/**
 * Host action to remove a player from the confirmed activity roster.
 * This deletes the player's presence in activity_players.
 */
export async function removePlayerFromActivity(activityId: string, playerId: string): Promise<boolean> {
  if (isDemoMode()) {
    const activity = DEMO_ACTIVITIES.find((g) => g.id === activityId);
    if (activity) {
      activity.roster = activity.roster.filter((p) => p.id !== playerId);
    }
    return true;
  }
  if (!db) return false;

  // RLS ("Leave own activity or host removes player") allows the host. A delete
  // RLS filters out reports no error, so check that a row actually went.
  const { data, error } = await db
    .from("activity_players")
    .delete()
    .eq("activity_id", activityId)
    .eq("user_id", playerId)
    .select("id");

  return !error && (data?.length ?? 0) > 0;
}

/**
 * Load the current user's votes for all options of an activity.
 * Returns a map of optionId → vote value, or {} in demo mode.
 */
export async function getUserVotes(
  activityId: string,
  userId: string
): Promise<Record<string, "in" | "maybe" | "out">> {
  if (isDemoMode()) return {};
  if (!db) return {};

  // Get all option IDs for this activity
  const { data: opts } = await db
    .from("activity_options")
    .select("id")
    .eq("activity_id", activityId);
  if (!opts || opts.length === 0) return {};

  const optionIds = opts.map((o: { id: string }) => o.id);

  const { data: voteRows } = await db
    .from("votes")
    .select("option_id, value")
    .eq("user_id", userId)
    .in("option_id", optionIds);
  if (!voteRows) return {};

  const result: Record<string, "in" | "maybe" | "out"> = {};
  for (const row of voteRows) {
    if (!row.option_id) continue;
    result[row.option_id] = row.value as "in" | "maybe" | "out";
  }
  return result;
}
