export type GameStatus = "proposal" | "confirmed" | "completed" | "cancelled";
export type VoteValue = "in" | "maybe" | "out" | null;

export interface TimeOption {
  id: string;
  date: string;
  displayDate: string;
  startTime: string;
  endTime: string;
  location: string;
  inVotes: number;
  maybeVotes: number;
  outVotes: number;
  voterInitials: string[];
}

export interface Game {
  id: string;
  title: string;
  sport: string;
  sportEmoji: string;
  sportColor: string;
  status: GameStatus;
  gameType: "Casual" | "Competitive";
  maxPlayers: number;
  currentPlayers: number;
  createdBy: string;
  groupId: string;
  countdownH: number;
  countdownM: number;
  countdownS: number;
  options: TimeOption[];
  totalCost: number;
  perPersonCost: number;
  confirmedOptionId?: string;
  description?: string;
}

export interface Group {
  id: string;
  name: string;
  sport: string;
  sportEmoji: string;
  color: string;
  memberCount: number;
  nextGame?: string;
  initials: string;
}

export interface Player {
  id: string;
  name: string;
  initials: string;
  color: string;
  gamesPlayed: number;
  weeksPlayed: number;
  attendanceRate: number;
}

export interface Message {
  id: string;
  type: "direct" | "group";
  name: string;
  initials: string;
  color: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isSystemMessage?: boolean;
}

// ─── Players ────────────────────────────────────────────────────────────────
export const players: Player[] = [
  { id: "p1", name: "Alex Rivera",   initials: "AR", color: "#22C55E", gamesPlayed: 34, weeksPlayed: 22, attendanceRate: 88 },
  { id: "p2", name: "Jordan Kim",    initials: "JK", color: "#3B82F6", gamesPlayed: 28, weeksPlayed: 19, attendanceRate: 79 },
  { id: "p3", name: "Taylor Smith",  initials: "TS", color: "#8B5CF6", gamesPlayed: 41, weeksPlayed: 30, attendanceRate: 94 },
  { id: "p4", name: "Morgan Lee",    initials: "ML", color: "#F97316", gamesPlayed: 17, weeksPlayed: 14, attendanceRate: 72 },
  { id: "p5", name: "Casey Torres",  initials: "CT", color: "#EF4444", gamesPlayed: 22, weeksPlayed: 16, attendanceRate: 85 },
  { id: "p6", name: "Riley Park",    initials: "RP", color: "#06B6D4", gamesPlayed: 38, weeksPlayed: 27, attendanceRate: 91 },
  { id: "p7", name: "Drew Chen",     initials: "DC", color: "#6366F1", gamesPlayed: 12, weeksPlayed: 9,  attendanceRate: 67 },
  { id: "p8", name: "Sam Wilson",    initials: "SW", color: "#EAB308", gamesPlayed: 51, weeksPlayed: 38, attendanceRate: 96 },
];

// ─── Groups ──────────────────────────────────────────────────────────────────
export const groups: Group[] = [
  { id: "g1", name: "Tuesday Hoops",    sport: "Basketball", sportEmoji: "🏀", color: "#F97316", memberCount: 8,  nextGame: "Tue, Feb 20", initials: "TH" },
  { id: "g2", name: "Weekend Warriors", sport: "Soccer",     sportEmoji: "⚽", color: "#22C55E", memberCount: 12, nextGame: "Sat, Feb 22", initials: "WW" },
  { id: "g3", name: "Net Gang",         sport: "Volleyball", sportEmoji: "🏐", color: "#3B82F6", memberCount: 6,  nextGame: "Fri, Feb 21", initials: "NG" },
];

// ─── Games ───────────────────────────────────────────────────────────────────
export const games: Game[] = [
  {
    id: "game1",
    title: "Tuesday Night Basketball",
    sport: "Basketball",
    sportEmoji: "🏀",
    sportColor: "#F97316",
    status: "proposal",
    gameType: "Casual",
    maxPlayers: 10,
    currentPlayers: 7,
    createdBy: "Sam Wilson",
    groupId: "g1",
    countdownH: 14,
    countdownM: 32,
    countdownS: 0,
    options: [
      {
        id: "o1",
        date: "2026-02-20",
        displayDate: "Thu, Feb 20",
        startTime: "7:00 PM",
        endTime: "9:00 PM",
        location: "Riverside Community Courts",
        inVotes: 5,
        maybeVotes: 2,
        outVotes: 1,
        voterInitials: ["AR", "JK", "TS", "RP", "SW"],
      },
      {
        id: "o2",
        date: "2026-02-21",
        displayDate: "Fri, Feb 21",
        startTime: "6:30 PM",
        endTime: "8:30 PM",
        location: "City Gym — Court B",
        inVotes: 3,
        maybeVotes: 3,
        outVotes: 2,
        voterInitials: ["ML", "CT", "DC"],
      },
      {
        id: "o3",
        date: "2026-02-22",
        displayDate: "Sat, Feb 22",
        startTime: "8:00 PM",
        endTime: "10:00 PM",
        location: "Riverside Community Courts",
        inVotes: 4,
        maybeVotes: 1,
        outVotes: 0,
        voterInitials: ["AR", "TS", "RP", "SW"],
      },
    ],
    totalCost: 40,
    perPersonCost: 5.71,
  },
  {
    id: "game2",
    title: "Weekend Soccer Match",
    sport: "Soccer",
    sportEmoji: "⚽",
    sportColor: "#22C55E",
    status: "confirmed",
    gameType: "Casual",
    maxPlayers: 14,
    currentPlayers: 11,
    createdBy: "Riley Park",
    groupId: "g2",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    options: [
      {
        id: "o4",
        date: "2026-02-22",
        displayDate: "Sat, Feb 22",
        startTime: "10:00 AM",
        endTime: "12:00 PM",
        location: "Greenfield Soccer Park — Pitch 3",
        inVotes: 8,
        maybeVotes: 3,
        outVotes: 0,
        voterInitials: ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW"],
      },
    ],
    totalCost: 0,
    perPersonCost: 0,
    confirmedOptionId: "o4",
  },
  {
    id: "game3",
    title: "Friday Volleyball Meetup",
    sport: "Volleyball",
    sportEmoji: "🏐",
    sportColor: "#3B82F6",
    status: "proposal",
    gameType: "Casual",
    maxPlayers: 8,
    currentPlayers: 5,
    createdBy: "Taylor Smith",
    groupId: "g3",
    countdownH: 6,
    countdownM: 15,
    countdownS: 30,
    options: [
      {
        id: "o5",
        date: "2026-02-21",
        displayDate: "Fri, Feb 21",
        startTime: "5:30 PM",
        endTime: "7:30 PM",
        location: "Beach Volleyball Courts — Court 1",
        inVotes: 4,
        maybeVotes: 1,
        outVotes: 0,
        voterInitials: ["TS", "AR", "JK", "DC"],
      },
      {
        id: "o6",
        date: "2026-02-22",
        displayDate: "Sat, Feb 22",
        startTime: "9:00 AM",
        endTime: "11:00 AM",
        location: "Rec Center — Gym 2",
        inVotes: 2,
        maybeVotes: 2,
        outVotes: 1,
        voterInitials: ["RP", "ML"],
      },
    ],
    totalCost: 20,
    perPersonCost: 4.0,
  },
  {
    id: "game4",
    title: "Morning Pickup Basketball",
    sport: "Basketball",
    sportEmoji: "🏀",
    sportColor: "#F97316",
    status: "completed",
    gameType: "Casual",
    maxPlayers: 10,
    currentPlayers: 9,
    createdBy: "Jordan Kim",
    groupId: "g1",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    options: [
      {
        id: "o7",
        date: "2026-02-15",
        displayDate: "Sun, Feb 15",
        startTime: "9:00 AM",
        endTime: "11:00 AM",
        location: "Riverside Community Courts",
        inVotes: 9,
        maybeVotes: 0,
        outVotes: 1,
        voterInitials: ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW"],
      },
    ],
    totalCost: 0,
    perPersonCost: 0,
    confirmedOptionId: "o7",
  },
];

// ─── Messages ─────────────────────────────────────────────────────────────────
export const directMessages: Message[] = [
  { id: "dm1", type: "direct", name: "Alex Rivera",   initials: "AR", color: "#22C55E", lastMessage: "See you on the court! 🏀", timestamp: "2m ago",  unread: 1 },
  { id: "dm2", type: "direct", name: "Jordan Kim",    initials: "JK", color: "#3B82F6", lastMessage: "Can't make Tuesday, maybe next week?",  timestamp: "1h ago",  unread: 0 },
  { id: "dm3", type: "direct", name: "Taylor Smith",  initials: "TS", color: "#8B5CF6", lastMessage: "Are we still on for Saturday?", timestamp: "3h ago",  unread: 2 },
  { id: "dm4", type: "direct", name: "Sam Wilson",    initials: "SW", color: "#EAB308", lastMessage: "Great game last night 🔥", timestamp: "Yesterday", unread: 0 },
  { id: "dm5", type: "direct", name: "Riley Park",    initials: "RP", color: "#06B6D4", lastMessage: "I'll vote on the options shortly", timestamp: "Yesterday", unread: 0 },
];

export const groupMessages: Message[] = [
  { id: "gm1", type: "group", name: "Tuesday Hoops",    initials: "TH", color: "#F97316", lastMessage: "🏀 New game proposal: Tuesday Night Basketball", timestamp: "5m ago",   unread: 3, isSystemMessage: true },
  { id: "gm2", type: "group", name: "Weekend Warriors", initials: "WW", color: "#22C55E", lastMessage: "✅ Weekend Soccer Match confirmed for Sat 10am!", timestamp: "30m ago",  unread: 1, isSystemMessage: true },
  { id: "gm3", type: "group", name: "Net Gang",         initials: "NG", color: "#3B82F6", lastMessage: "Who's voting for the Friday option? Let's lock it in", timestamp: "2h ago",   unread: 0 },
];

// ─── Calendar event markers ───────────────────────────────────────────────────
export const calendarMarkers: Record<string, { status: GameStatus; gameId: string }[]> = {
  "2026-02-20": [{ status: "proposal",  gameId: "game1" }],
  "2026-02-21": [{ status: "proposal",  gameId: "game3" }],
  "2026-02-22": [{ status: "confirmed", gameId: "game2" }, { status: "proposal", gameId: "game1" }],
  "2026-02-15": [{ status: "completed", gameId: "game4" }],
};

export const sports = [
  { name: "Basketball", emoji: "🏀", color: "#F97316" },
  { name: "Soccer",     emoji: "⚽", color: "#22C55E" },
  { name: "Volleyball", emoji: "🏐", color: "#3B82F6" },
  { name: "Tennis",     emoji: "🎾", color: "#EAB308" },
  { name: "Pickleball", emoji: "🏓", color: "#8B5CF6" },
  { name: "Baseball",   emoji: "⚾", color: "#EF4444" },
  { name: "Hockey",     emoji: "🏒", color: "#0EA5E9" },
  { name: "Football",   emoji: "🏈", color: "#78716C" },
];
