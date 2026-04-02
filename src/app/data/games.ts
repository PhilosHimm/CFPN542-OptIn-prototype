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
  maxPlayers: number | null;
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
  pendingProposalCount?: number;
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
  { id: "g1", name: "Tuesday Hoops",    sport: "Basketball", sportEmoji: "🏀", color: "#F97316", memberCount: 8,  nextGame: "Tue, Mar 25", initials: "TH" },
  { id: "g2", name: "Weekend Warriors", sport: "Soccer",     sportEmoji: "⚽", color: "#22C55E", memberCount: 12, nextGame: "Sat, Mar 29", initials: "WW" },
  { id: "g3", name: "Net Gang",         sport: "Volleyball", sportEmoji: "🏐", color: "#3B82F6", memberCount: 6,  nextGame: "Fri, Mar 28", initials: "NG" },
  { id: "g4", name: "Smash Club",       sport: "Tennis",     sportEmoji: "🎾", color: "#EAB308", memberCount: 9,  nextGame: "Thu, Mar 27", initials: "SC" },
];

// ─── Games ───────────────────────────────────────────────────────────────────
export const games: Game[] = [

  // ── PROPOSALS (voting open) ────────────────────────────────────────────────
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
    description: "Weekly Tuesday runs at Riverside. Bring your A-game 🏀",
    options: [
      {
        id: "o1a",
        date: "2026-03-25",
        displayDate: "Tue, Mar 25",
        startTime: "7:00 PM",
        endTime: "9:00 PM",
        location: "Riverside Community Courts",
        inVotes: 5,
        maybeVotes: 2,
        outVotes: 1,
        voterInitials: ["AR", "JK", "TS", "RP", "SW"],
      },
      {
        id: "o1b",
        date: "2026-03-25",
        displayDate: "Tue, Mar 25",
        startTime: "6:30 PM",
        endTime: "8:30 PM",
        location: "City Gym — Court B",
        inVotes: 3,
        maybeVotes: 3,
        outVotes: 2,
        voterInitials: ["ML", "CT", "DC"],
      },
      {
        id: "o1c",
        date: "2026-03-26",
        displayDate: "Wed, Mar 26",
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
    description: "Beach courts or indoor — vote for your preference!",
    options: [
      {
        id: "o3a",
        date: "2026-03-28",
        displayDate: "Fri, Mar 28",
        startTime: "5:30 PM",
        endTime: "7:30 PM",
        location: "Beach Volleyball Courts — Court 1",
        inVotes: 4,
        maybeVotes: 1,
        outVotes: 0,
        voterInitials: ["TS", "AR", "JK", "DC"],
      },
      {
        id: "o3b",
        date: "2026-03-29",
        displayDate: "Sat, Mar 29",
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
    id: "game5",
    title: "Thursday Pickleball Doubles",
    sport: "Pickleball",
    sportEmoji: "🏓",
    sportColor: "#8B5CF6",
    status: "proposal",
    gameType: "Competitive",
    maxPlayers: 8,
    currentPlayers: 4,
    createdBy: "Alex Rivera",
    groupId: "g4",
    countdownH: 38,
    countdownM: 10,
    countdownS: 0,
    description: "Doubles format, competitive but friendly. Bring a paddle if you have one!",
    options: [
      {
        id: "o5a",
        date: "2026-03-27",
        displayDate: "Thu, Mar 27",
        startTime: "6:00 PM",
        endTime: "8:00 PM",
        location: "Westside Pickleball Club — Courts 3 & 4",
        inVotes: 3,
        maybeVotes: 1,
        outVotes: 0,
        voterInitials: ["AR", "TS", "RP"],
      },
      {
        id: "o5b",
        date: "2026-03-28",
        displayDate: "Fri, Mar 28",
        startTime: "7:00 PM",
        endTime: "9:00 PM",
        location: "Westside Pickleball Club — Courts 3 & 4",
        inVotes: 1,
        maybeVotes: 2,
        outVotes: 1,
        voterInitials: ["JK"],
      },
    ],
    totalCost: 32,
    perPersonCost: 8.0,
  },
  {
    id: "game6",
    title: "Saturday Morning Tennis",
    sport: "Tennis",
    sportEmoji: "🎾",
    sportColor: "#EAB308",
    status: "proposal",
    gameType: "Casual",
    maxPlayers: 4,
    currentPlayers: 2,
    createdBy: "Riley Park",
    groupId: "g4",
    countdownH: 62,
    countdownM: 45,
    countdownS: 0,
    description: "Doubles or singles depending on who shows up. All levels welcome.",
    options: [
      {
        id: "o6a",
        date: "2026-03-29",
        displayDate: "Sat, Mar 29",
        startTime: "8:00 AM",
        endTime: "10:00 AM",
        location: "Lakeside Tennis Center — Court 2",
        inVotes: 2,
        maybeVotes: 1,
        outVotes: 0,
        voterInitials: ["RP", "SW"],
      },
      {
        id: "o6b",
        date: "2026-03-29",
        displayDate: "Sat, Mar 29",
        startTime: "10:30 AM",
        endTime: "12:30 PM",
        location: "Lakeside Tennis Center — Court 2",
        inVotes: 0,
        maybeVotes: 2,
        outVotes: 1,
        voterInitials: [],
      },
    ],
    totalCost: 24,
    perPersonCost: 6.0,
  },

  // ── CONFIRMED (locked in, upcoming) ──────────────────────────────────────
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
    countdownH: 22,
    countdownM: 0,
    countdownS: 0,
    description: "7-a-side at Lakeside Park. We'll split into balanced teams on arrival.",
    options: [
      {
        id: "o2a",
        date: "2026-03-29",
        displayDate: "Sat, Mar 29",
        startTime: "10:00 AM",
        endTime: "12:00 PM",
        location: "Lakeside Park — Pitch 3",
        inVotes: 8,
        maybeVotes: 3,
        outVotes: 0,
        voterInitials: ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW"],
      },
    ],
    totalCost: 0,
    perPersonCost: 0,
    confirmedOptionId: "o2a",
  },
  {
    id: "game7",
    title: "Wednesday Hoops Night",
    sport: "Basketball",
    sportEmoji: "🏀",
    sportColor: "#F97316",
    status: "confirmed",
    gameType: "Casual",
    maxPlayers: 12,
    currentPlayers: 10,
    createdBy: "Jordan Kim",
    groupId: "g1",
    countdownH: 3,
    countdownM: 20,
    countdownS: 0,
    description: "Quick mid-week session at City Gym. Run & gun style 🏃",
    options: [
      {
        id: "o7a",
        date: "2026-03-26",
        displayDate: "Wed, Mar 26",
        startTime: "7:30 PM",
        endTime: "9:30 PM",
        location: "City Gym — Main Court",
        inVotes: 10,
        maybeVotes: 1,
        outVotes: 0,
        voterInitials: ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW", "MJ", "KL"],
      },
    ],
    totalCost: 50,
    perPersonCost: 5.0,
    confirmedOptionId: "o7a",
  },
  {
    id: "game8",
    title: "Competitive Volleyball League Night",
    sport: "Volleyball",
    sportEmoji: "🏐",
    sportColor: "#3B82F6",
    status: "confirmed",
    gameType: "Competitive",
    maxPlayers: 12,
    currentPlayers: 12,
    createdBy: "Casey Torres",
    groupId: "g3",
    countdownH: 47,
    countdownM: 5,
    countdownS: 0,
    description: "Full squad locked in! Indoor courts, proper scorekeeping. Bring your best.",
    options: [
      {
        id: "o8a",
        date: "2026-03-27",
        displayDate: "Thu, Mar 27",
        startTime: "8:00 PM",
        endTime: "10:00 PM",
        location: "Rec Center — Gym 1",
        inVotes: 12,
        maybeVotes: 0,
        outVotes: 0,
        voterInitials: ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW", "MJ", "KL", "BN", "ZP"],
      },
    ],
    totalCost: 60,
    perPersonCost: 5.0,
    confirmedOptionId: "o8a",
  },

  // ── COMPLETED (past games) ────────────────────────────────────────────────
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
    description: "Sunday morning runs. Best way to start the weekend 🌅",
    options: [
      {
        id: "o4a",
        date: "2026-03-16",
        displayDate: "Sun, Mar 16",
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
    confirmedOptionId: "o4a",
  },
  {
    id: "game9",
    title: "Saturday Soccer Scrimmage",
    sport: "Soccer",
    sportEmoji: "⚽",
    sportColor: "#22C55E",
    status: "completed",
    gameType: "Casual",
    maxPlayers: 14,
    currentPlayers: 12,
    createdBy: "Alex Rivera",
    groupId: "g2",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    description: "Great game — both teams left it all on the pitch!",
    options: [
      {
        id: "o9a",
        date: "2026-03-15",
        displayDate: "Sat, Mar 15",
        startTime: "11:00 AM",
        endTime: "1:00 PM",
        location: "Lakeside Park — Pitch 1",
        inVotes: 12,
        maybeVotes: 2,
        outVotes: 0,
        voterInitials: ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW", "MJ", "KL", "BN", "ZP"],
      },
    ],
    totalCost: 0,
    perPersonCost: 0,
    confirmedOptionId: "o9a",
  },
  {
    id: "game10",
    title: "Net Gang Volleyball",
    sport: "Volleyball",
    sportEmoji: "🏐",
    sportColor: "#3B82F6",
    status: "completed",
    gameType: "Casual",
    maxPlayers: 8,
    currentPlayers: 8,
    createdBy: "Taylor Smith",
    groupId: "g3",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    description: "Full squad, great energy. One of our best sessions yet 🏐",
    options: [
      {
        id: "o10a",
        date: "2026-03-14",
        displayDate: "Fri, Mar 14",
        startTime: "6:00 PM",
        endTime: "8:00 PM",
        location: "Rec Center — Gym 2",
        inVotes: 8,
        maybeVotes: 0,
        outVotes: 0,
        voterInitials: ["TS", "AR", "JK", "ML", "CT", "RP", "DC", "SW"],
      },
    ],
    totalCost: 24,
    perPersonCost: 3.0,
    confirmedOptionId: "o10a",
  },
  {
    id: "game11",
    title: "Competitive Hoops — Tuesday Hoops",
    sport: "Basketball",
    sportEmoji: "🏀",
    sportColor: "#F97316",
    status: "completed",
    gameType: "Competitive",
    maxPlayers: 10,
    currentPlayers: 10,
    createdBy: "Sam Wilson",
    groupId: "g1",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    description: "5v5 full court. Team A took it 48–41. Rematch incoming 👀",
    options: [
      {
        id: "o11a",
        date: "2026-03-11",
        displayDate: "Tue, Mar 11",
        startTime: "7:00 PM",
        endTime: "9:00 PM",
        location: "Riverside Community Courts",
        inVotes: 10,
        maybeVotes: 0,
        outVotes: 0,
        voterInitials: ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW", "MJ", "KL"],
      },
    ],
    totalCost: 0,
    perPersonCost: 0,
    confirmedOptionId: "o11a",
  },
  {
    id: "game12",
    title: "Sunday Soccer Fun Run",
    sport: "Soccer",
    sportEmoji: "⚽",
    sportColor: "#22C55E",
    status: "completed",
    gameType: "Casual",
    maxPlayers: 16,
    currentPlayers: 14,
    createdBy: "Casey Torres",
    groupId: "g2",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    description: "Huge turnout! Rotational squads format — everyone got solid game time.",
    options: [
      {
        id: "o12a",
        date: "2026-03-09",
        displayDate: "Sun, Mar 9",
        startTime: "2:00 PM",
        endTime: "4:30 PM",
        location: "Greenfield Soccer Park — Pitch 2",
        inVotes: 14,
        maybeVotes: 2,
        outVotes: 0,
        voterInitials: ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW", "MJ", "KL", "BN", "ZP", "LM", "TW"],
      },
    ],
    totalCost: 28,
    perPersonCost: 2.0,
    confirmedOptionId: "o12a",
  },
  {
    id: "game13",
    title: "Tuesday Hoops — Weekly Run",
    sport: "Basketball",
    sportEmoji: "🏀",
    sportColor: "#F97316",
    status: "completed",
    gameType: "Casual",
    maxPlayers: 10,
    currentPlayers: 8,
    createdBy: "Marcus Johnson",
    groupId: "g1",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    options: [
      {
        id: "o13a",
        date: "2026-03-04",
        displayDate: "Tue, Mar 4",
        startTime: "7:00 PM",
        endTime: "9:00 PM",
        location: "Riverside Community Courts",
        inVotes: 8,
        maybeVotes: 1,
        outVotes: 1,
        voterInitials: ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW"],
      },
    ],
    totalCost: 0,
    perPersonCost: 0,
    confirmedOptionId: "o13a",
  },
  {
    id: "game14",
    title: "Smash Club — Tennis Doubles",
    sport: "Tennis",
    sportEmoji: "🎾",
    sportColor: "#EAB308",
    status: "completed",
    gameType: "Competitive",
    maxPlayers: 4,
    currentPlayers: 4,
    createdBy: "Riley Park",
    groupId: "g4",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    description: "Tight match — went to a final set tiebreak. Great play from everyone.",
    options: [
      {
        id: "o14a",
        date: "2026-03-01",
        displayDate: "Sun, Mar 1",
        startTime: "10:00 AM",
        endTime: "12:00 PM",
        location: "Lakeside Tennis Center — Court 1",
        inVotes: 4,
        maybeVotes: 0,
        outVotes: 0,
        voterInitials: ["RP", "AR", "SW", "TS"],
      },
    ],
    totalCost: 48,
    perPersonCost: 12.0,
    confirmedOptionId: "o14a",
  },

  // ── CANCELLED ─────────────────────────────────────────────────────────────
  {
    id: "game15",
    title: "Rainy Day Soccer — Cancelled",
    sport: "Soccer",
    sportEmoji: "⚽",
    sportColor: "#22C55E",
    status: "cancelled",
    gameType: "Casual",
    maxPlayers: 14,
    currentPlayers: 6,
    createdBy: "Morgan Lee",
    groupId: "g2",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    description: "Cancelled due to heavy rain and field closure. We'll reschedule soon!",
    options: [
      {
        id: "o15a",
        date: "2026-03-22",
        displayDate: "Sun, Mar 22",
        startTime: "1:00 PM",
        endTime: "3:00 PM",
        location: "Greenfield Soccer Park — Pitch 1",
        inVotes: 4,
        maybeVotes: 2,
        outVotes: 3,
        voterInitials: ["ML", "CT", "DC", "JK"],
      },
    ],
    totalCost: 0,
    perPersonCost: 0,
    confirmedOptionId: undefined,
  },
  {
    id: "game16",
    title: "Late Night Basketball — Low Turnout",
    sport: "Basketball",
    sportEmoji: "🏀",
    sportColor: "#F97316",
    status: "cancelled",
    gameType: "Casual",
    maxPlayers: 10,
    currentPlayers: 3,
    createdBy: "Drew Chen",
    groupId: "g1",
    countdownH: 0,
    countdownM: 0,
    countdownS: 0,
    description: "Not enough players to make it worthwhile. Cancelled 48h before tip-off.",
    options: [
      {
        id: "o16a",
        date: "2026-03-20",
        displayDate: "Thu, Mar 20",
        startTime: "9:00 PM",
        endTime: "11:00 PM",
        location: "City Gym — Court B",
        inVotes: 3,
        maybeVotes: 1,
        outVotes: 5,
        voterInitials: ["DC", "JK", "ML"],
      },
    ],
    totalCost: 30,
    perPersonCost: 10.0,
    confirmedOptionId: undefined,
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

// ─── Demo Conversations (full chat histories for demo mode) ───────────────────
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  isSystem?: boolean;
}

export interface DemoConversation {
  id: string;
  type: "direct" | "group";
  name: string;
  initials: string;
  color: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  messages: ChatMessage[];
}

export const demoConversations: DemoConversation[] = [
  {
    id: "dm1",
    type: "direct",
    name: "Alex Rivera",
    initials: "AR",
    color: "#22C55E",
    lastMessage: "See you on the court! 🏀",
    lastMessageTime: "2m ago",
    unread: 1,
    messages: [
      { id: "m1", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#22C55E", content: "Yo Marcus, you coming Tuesday?", timestamp: "Mon 6:10 PM", isMe: false },
      { id: "m2", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Definitely! Can't wait, it's been two weeks since I last played", timestamp: "Mon 6:12 PM", isMe: true },
      { id: "m3", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#22C55E", content: "Same, I've been going crazy 😂 We got a full squad this time too — 12 confirmed", timestamp: "Mon 6:13 PM", isMe: false },
      { id: "m4", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Nice! Riverside Courts or the usual spot?", timestamp: "Mon 6:15 PM", isMe: true },
      { id: "m5", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#22C55E", content: "Riverside. Outdoor courts are open until 10. Weather looks perfect 🌤️", timestamp: "Mon 6:16 PM", isMe: false },
      { id: "m6", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Perfect. I'll grab the ball pump and bring some water too", timestamp: "Mon 6:18 PM", isMe: true },
      { id: "m7", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#22C55E", content: "Legend 🙌 I'll bring the mesh pinnies so we can actually tell teams apart lol", timestamp: "Mon 6:19 PM", isMe: false },
      { id: "m8", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Haha yes please. Last time was chaos 😅", timestamp: "Mon 6:20 PM", isMe: true },
      { id: "m9", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#22C55E", content: "See you on the court! 🏀", timestamp: "2m ago", isMe: false },
    ],
  },
  {
    id: "dm2",
    type: "direct",
    name: "Jordan Kim",
    initials: "JK",
    color: "#3B82F6",
    lastMessage: "Can't make Tuesday, maybe next week?",
    lastMessageTime: "1h ago",
    unread: 0,
    messages: [
      { id: "m1", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Hey Jordan! Tuesday game is confirmed — 7pm Riverside. You in?", timestamp: "Mon 3:00 PM", isMe: true },
      { id: "m2", senderId: "p2", senderName: "Jordan Kim", senderInitials: "JK", senderColor: "#3B82F6", content: "Ugh I really want to but I have a work thing that might run late 😔", timestamp: "Mon 3:15 PM", isMe: false },
      { id: "m3", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "No worries, game starts at 7 so if you can make it by 7:30 we're good", timestamp: "Mon 3:16 PM", isMe: true },
      { id: "m4", senderId: "p2", senderName: "Jordan Kim", senderInitials: "JK", senderColor: "#3B82F6", content: "I'll try but no promises. My boss keeps scheduling these end-of-day syncs 🙄", timestamp: "Mon 3:20 PM", isMe: false },
      { id: "m5", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Lol that's rough. Either way let us know!", timestamp: "Mon 3:21 PM", isMe: true },
      { id: "m6", senderId: "p2", senderName: "Jordan Kim", senderInitials: "JK", senderColor: "#3B82F6", content: "Can't make Tuesday, maybe next week?", timestamp: "1h ago", isMe: false },
    ],
  },
  {
    id: "dm3",
    type: "direct",
    name: "Taylor Smith",
    initials: "TS",
    color: "#8B5CF6",
    lastMessage: "Are we still on for Saturday?",
    lastMessageTime: "3h ago",
    unread: 2,
    messages: [
      { id: "m1", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Hey! Saw the Saturday volleyball proposal on the app", timestamp: "Sun 9:00 AM", isMe: false },
      { id: "m2", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Yeah! Weekend Warriors is putting it together. Beach courts at Lakeside Park", timestamp: "Sun 9:05 AM", isMe: true },
      { id: "m3", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Oh nice, that place is great. What time?", timestamp: "Sun 9:06 AM", isMe: false },
      { id: "m4", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "10am-1pm. Already voted In, the 10am option is winning by a lot", timestamp: "Sun 9:07 AM", isMe: true },
      { id: "m5", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Perfect timing honestly. I'll vote now. Is it casual or are we doing actual teams?", timestamp: "Sun 9:10 AM", isMe: false },
      { id: "m6", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Should be casual but knowing Sam and Alex it'll get competitive fast 😂", timestamp: "Sun 9:11 AM", isMe: true },
      { id: "m7", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Haha true. They always bring the intensity", timestamp: "Sun 9:12 AM", isMe: false },
      { id: "m8", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Are we still on for Saturday?", timestamp: "3h ago", isMe: false },
    ],
  },
  {
    id: "dm4",
    type: "direct",
    name: "Sam Wilson",
    initials: "SW",
    color: "#EAB308",
    lastMessage: "Great game last night 🔥",
    lastMessageTime: "Yesterday",
    unread: 0,
    messages: [
      { id: "m1", senderId: "p4", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#EAB308", content: "Marcus!! That last minute bucket was INSANE 🏀🔥", timestamp: "Yesterday 9:45 PM", isMe: false },
      { id: "m2", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Haha I can't believe that went in honestly 😭 pure luck", timestamp: "Yesterday 9:47 PM", isMe: true },
      { id: "m3", senderId: "p4", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#EAB308", content: "No way, you read that screen perfectly. That was straight skill", timestamp: "Yesterday 9:48 PM", isMe: false },
      { id: "m4", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "We need to run that pick-and-roll more. It was working every single time", timestamp: "Yesterday 9:50 PM", isMe: true },
      { id: "m5", senderId: "p4", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#EAB308", content: "100%. Also Alex's defense in the second half was elite. Locked them down", timestamp: "Yesterday 9:51 PM", isMe: false },
      { id: "m6", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "He was locked in fr. Good game tonight, we needed that W 💪", timestamp: "Yesterday 9:53 PM", isMe: true },
      { id: "m7", senderId: "p4", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#EAB308", content: "Great game last night 🔥", timestamp: "Yesterday", isMe: false },
    ],
  },
  {
    id: "dm5",
    type: "direct",
    name: "Riley Park",
    initials: "RP",
    color: "#06B6D4",
    lastMessage: "I'll vote on the options shortly",
    lastMessageTime: "Yesterday",
    unread: 0,
    messages: [
      { id: "m1", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Hey Riley! Did you see the new game proposal for Friday volleyball?", timestamp: "Yesterday 2:00 PM", isMe: true },
      { id: "m2", senderId: "p5", senderName: "Riley Park", senderInitials: "RP", senderColor: "#06B6D4", content: "Yeah just saw it! Net Gang is organizing again?", timestamp: "Yesterday 2:10 PM", isMe: false },
      { id: "m3", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Yeah, Taylor set it up. There are two time options — 6pm or 8pm", timestamp: "Yesterday 2:11 PM", isMe: true },
      { id: "m4", senderId: "p5", senderName: "Riley Park", senderInitials: "RP", senderColor: "#06B6D4", content: "8pm is better for me but I know some people have early mornings", timestamp: "Yesterday 2:13 PM", isMe: false },
      { id: "m5", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Vote on the app so your preference gets counted! Currently 6pm is winning", timestamp: "Yesterday 2:14 PM", isMe: true },
      { id: "m6", senderId: "p5", senderName: "Riley Park", senderInitials: "RP", senderColor: "#06B6D4", content: "I'll vote on the options shortly", timestamp: "Yesterday", isMe: false },
    ],
  },
  {
    id: "gm1",
    type: "group",
    name: "Tuesday Hoops",
    initials: "TH",
    color: "#F97316",
    lastMessage: "🏀 New game proposal: Tuesday Night Basketball",
    lastMessageTime: "5m ago",
    unread: 3,
    messages: [
      { id: "m1", senderId: "system", senderName: "OptIn", senderInitials: "O", senderColor: "#F97316", content: "🏀 New game proposal: Tuesday Night Basketball — Riverside Courts, 7:00 PM. Vote now!", timestamp: "Mon 5:00 PM", isMe: false, isSystem: true },
      { id: "m2", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#22C55E", content: "Let's gooo! Voted In on Option 1 🙌", timestamp: "Mon 5:02 PM", isMe: false },
      { id: "m3", senderId: "p4", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#EAB308", content: "In for Option 1 too. Thursday doesn't work for me", timestamp: "Mon 5:05 PM", isMe: false },
      { id: "m4", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Tuesday works perfect 👍", timestamp: "Mon 5:07 PM", isMe: true },
      { id: "m5", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Can someone bring an extra ball? Mine has a slow leak 😅", timestamp: "Mon 5:10 PM", isMe: false },
      { id: "m6", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "I got you Taylor, bringing two", timestamp: "Mon 5:11 PM", isMe: true },
      { id: "m7", senderId: "p5", senderName: "Riley Park", senderInitials: "RP", senderColor: "#06B6D4", content: "I'll bring the pump + a cooler with drinks 🧃", timestamp: "Mon 5:15 PM", isMe: false },
      { id: "m8", senderId: "p2", senderName: "Jordan Kim", senderInitials: "JK", senderColor: "#3B82F6", content: "Might be 20min late from work but I'll be there 🏃", timestamp: "Mon 5:30 PM", isMe: false },
      { id: "m9", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#22C55E", content: "We'll save you a spot on team 2 Jordan 😂", timestamp: "Mon 5:31 PM", isMe: false },
      { id: "m10", senderId: "system", senderName: "OptIn", senderInitials: "O", senderColor: "#F97316", content: "✅ Tuesday Night Basketball is confirmed! 8 players in. See you Tuesday at 7pm, Riverside Courts.", timestamp: "Mon 6:00 PM", isMe: false, isSystem: true },
      { id: "m11", senderId: "p4", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#EAB308", content: "LESSGOOOO 🏀🔥", timestamp: "Mon 6:01 PM", isMe: false },
      { id: "m12", senderId: "system", senderName: "OptIn", senderInitials: "O", senderColor: "#F97316", content: "🏀 New game proposal: Tuesday Night Basketball — Riverside Courts, 7:00 PM. Vote now!", timestamp: "5m ago", isMe: false, isSystem: true },
    ],
  },
  {
    id: "gm2",
    type: "group",
    name: "Weekend Warriors",
    initials: "WW",
    color: "#22C55E",
    lastMessage: "✅ Weekend Soccer Match confirmed for Sat 10am!",
    lastMessageTime: "30m ago",
    unread: 1,
    messages: [
      { id: "m1", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Weekend crew! Who's down for soccer Saturday morning?", timestamp: "Fri 8:00 AM", isMe: false },
      { id: "m2", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "I'm down! What time were you thinking?", timestamp: "Fri 8:10 AM", isMe: true },
      { id: "m3", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Either 10am or noon. I'll put up a proposal on OptIn", timestamp: "Fri 8:12 AM", isMe: false },
      { id: "m4", senderId: "system", senderName: "OptIn", senderInitials: "O", senderColor: "#22C55E", content: "⚽ New game proposal: Weekend Soccer Match — Lakeside Park, Saturday. Two options: 10am or Noon. Vote now!", timestamp: "Fri 9:00 AM", isMe: false, isSystem: true },
      { id: "m5", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#22C55E", content: "10am for sure. Let's get it done before the heat kicks in", timestamp: "Fri 9:05 AM", isMe: false },
      { id: "m6", senderId: "p4", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#EAB308", content: "Noon is better for me tbh, I'm not a morning person 😴", timestamp: "Fri 9:15 AM", isMe: false },
      { id: "m7", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Voted 10am, we always end up dragging when we start late", timestamp: "Fri 9:20 AM", isMe: true },
      { id: "m8", senderId: "p5", senderName: "Riley Park", senderInitials: "RP", senderColor: "#06B6D4", content: "10am is the move. I have afternoon plans anyway", timestamp: "Fri 9:30 AM", isMe: false },
      { id: "m9", senderId: "p2", senderName: "Jordan Kim", senderInitials: "JK", senderColor: "#3B82F6", content: "10am works, voted ✅", timestamp: "Fri 10:00 AM", isMe: false },
      { id: "m10", senderId: "system", senderName: "OptIn", senderInitials: "O", senderColor: "#22C55E", content: "✅ Weekend Soccer Match confirmed for Sat 10am! 7 players in. Lakeside Park.", timestamp: "30m ago", isMe: false, isSystem: true },
    ],
  },
  {
    id: "gm3",
    type: "group",
    name: "Net Gang",
    initials: "NG",
    color: "#3B82F6",
    lastMessage: "Who's voting for the Friday option? Let's lock it in",
    lastMessageTime: "2h ago",
    unread: 0,
    messages: [
      { id: "m1", senderId: "p5", senderName: "Riley Park", senderInitials: "RP", senderColor: "#06B6D4", content: "Net Gang! It's been too long since our last volleyball session 🏐", timestamp: "Mon 11:00 AM", isMe: false },
      { id: "m2", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Fr, I miss it. What are we thinking?", timestamp: "Mon 11:05 AM", isMe: true },
      { id: "m3", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Friday evening? I can get the indoor courts at the rec center", timestamp: "Mon 11:10 AM", isMe: false },
      { id: "m4", senderId: "p5", senderName: "Riley Park", senderInitials: "RP", senderColor: "#06B6D4", content: "Indoor is way better, those courts are nice. Let's do it", timestamp: "Mon 11:12 AM", isMe: false },
      { id: "m5", senderId: "system", senderName: "OptIn", senderInitials: "O", senderColor: "#3B82F6", content: "🏐 New game proposal: Friday Volleyball — Rec Center Indoor Courts. Two options: 6pm or 8pm. Vote now!", timestamp: "Mon 12:00 PM", isMe: false, isSystem: true },
      { id: "m6", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#22C55E", content: "6pm is better for me, I fade after 9pm 😂", timestamp: "Mon 12:05 PM", isMe: false },
      { id: "m7", senderId: "me", senderName: "Marcus", senderInitials: "MJ", senderColor: "#007AFF", content: "Voted 6pm. 8pm is too late for a weeknight", timestamp: "Mon 12:08 PM", isMe: true },
      { id: "m8", senderId: "p4", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#EAB308", content: "Still deciding... 8pm works better with my commute", timestamp: "Mon 1:00 PM", isMe: false },
      { id: "m9", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#8B5CF6", content: "Who's voting for the Friday option? Let's lock it in", timestamp: "2h ago", isMe: false },
    ],
  },
];

// ─── Calendar event markers ───────────────────────────────────────────────────
export const calendarMarkers: Record<string, { status: GameStatus; gameId: string }[]> = {
  // Proposals
  "2026-03-25": [{ status: "proposal",  gameId: "game1" }],
  "2026-03-26": [{ status: "proposal",  gameId: "game1" }],
  "2026-03-27": [{ status: "proposal",  gameId: "game5" }],
  "2026-03-28": [{ status: "proposal",  gameId: "game3" }, { status: "proposal", gameId: "game5" }],
  "2026-03-29": [{ status: "proposal",  gameId: "game3" }, { status: "proposal", gameId: "game6" }],
  // Confirmed
  "2026-03-26-confirmed": [{ status: "confirmed", gameId: "game7" }],
  "2026-03-27-confirmed": [{ status: "confirmed", gameId: "game8" }],
  "2026-03-29-confirmed": [{ status: "confirmed", gameId: "game2" }],
  // Completed
  "2026-03-16": [{ status: "completed", gameId: "game4" }],
  "2026-03-15": [{ status: "completed", gameId: "game9" }],
  "2026-03-14": [{ status: "completed", gameId: "game10" }],
  "2026-03-11": [{ status: "completed", gameId: "game11" }],
  "2026-03-09": [{ status: "completed", gameId: "game12" }],
  "2026-03-04": [{ status: "completed", gameId: "game13" }],
  "2026-03-01": [{ status: "completed", gameId: "game14" }],
  // Cancelled
  "2026-03-22": [{ status: "cancelled", gameId: "game15" }],
  "2026-03-20": [{ status: "cancelled", gameId: "game16" }],
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
