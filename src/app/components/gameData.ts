// ─── Shared game mock data used across Home, Calendar, and Game View ───

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

// ─── Player Pool ──────────────────────────────────────────
export const players: Player[] = [
  {
    id: "p1",
    name: "Marcus Johnson",
    avatar:
      "https://images.unsplash.com/photo-1751730739769-00b6e0807d65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbGUlMjBhdGhsZXRlJTIwcG9ydHJhaXQlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NzE2MzA5OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "p2",
    name: "Sarah Chen",
    avatar:
      "https://images.unsplash.com/photo-1650066579657-ae92847b1482?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGZlbWFsZSUyMGF0aGxldGUlMjBwb3J0cmFpdCUyMHNtaWxlfGVufDF8fHx8MTc3MTYzMDk5Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "p3",
    name: "DeAndre Williams",
    avatar:
      "https://images.unsplash.com/photo-1590156552211-69280532a54a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwYmFza2V0YmFsbCUyMHBsYXllciUyMHBvcnRyYWl0JTIwY2FzdWFsfGVufDF8fHx8MTc3MTYzMDk5M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "p4",
    name: "Priya Patel",
    avatar:
      "https://images.unsplash.com/photo-1762170318123-616b97727044?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBzb2NjZXIlMjBwbGF5ZXIlMjBwb3J0cmFpdCUyMG91dGRvb3J8ZW58MXx8fHwxNzcxNjMwOTk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "p5",
    name: "Jake Torres",
    avatar:
      "https://images.unsplash.com/photo-1649440100794-0776df1177b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMHNwb3J0eSUyMHBvcnRyYWl0JTIwZml0bmVzc3xlbnwxfHx8fDE3NzE2MzA5OTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "p6",
    name: "Aisha Robinson",
    avatar:
      "https://images.unsplash.com/photo-1695774361378-a8a8695c408e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHdvbWFuJTIwYXRobGV0aWMlMjBwb3J0cmFpdCUyMGd5bXxlbnwxfHx8fDE3NzE2MzA5OTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "p7",
    name: "Ryan Kim",
    avatar:
      "https://images.unsplash.com/photo-1758915214590-fa0cc9ea70ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMGF0aGxldGljJTIwcG9ydHJhaXQlMjBjb25maWRlbnR8ZW58MXx8fHwxNzcxNTM4NDc1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "p8",
    name: "Mia Lopez",
    avatar:
      "https://images.unsplash.com/photo-1759476530203-b11cc8c87d43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHdvbWFuJTIwZml0bmVzcyUyMHBvcnRyYWl0JTIwZW5lcmdldGljfGVufDF8fHx8MTc3MTYzMTQyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
];

// ─── Games ────────────────────────────────────────────────
export const games: Game[] = [
  {
    id: "game-1",
    title: "Sunday Soccer Showdown",
    sport: "Soccer",
    sportEmoji: "\u26BD",
    location: "Riverside Park, Field 3",
    gameType: "casual",
    status: "proposal",
    maxPlayers: 12,
    totalCost: 30,
    splitCost: true,
    group: "Sunday Soccer",
    heroImage:
      "https://images.unsplash.com/photo-1767406657699-9f3e01a48ea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBmaWVsZCUyMG91dGRvb3IlMjByZWNyZWF0aW9uJTIwZ3JlZW58ZW58MXx8fHwxNzcxNjMxNDI1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    date: "Sun, Feb 22",
    time: "10:00 AM - 12:00 PM",
    votingDeadline: "2026-02-21T23:59:59",
    createdBy: "p1",
    roster: [
      players[0],
      players[1],
      players[2],
      players[3],
      players[4],
      players[5],
      players[6],
      players[7],
    ],
    timeOptions: [
      {
        id: "opt-1a",
        date: "2026-02-22",
        startTime: "10:00",
        endTime: "12:00",
        location: "Riverside Park, Field 3",
        votes: {
          in: ["p1", "p2", "p3", "p5", "p7"],
          maybe: ["p4"],
          out: ["p6"],
        },
      },
      {
        id: "opt-1b",
        date: "2026-02-22",
        startTime: "14:00",
        endTime: "16:00",
        location: "Riverside Park, Field 3",
        votes: {
          in: ["p1", "p4", "p6"],
          maybe: ["p2", "p7"],
          out: ["p3"],
        },
      },
      {
        id: "opt-1c",
        date: "2026-02-23",
        startTime: "09:00",
        endTime: "11:00",
        location: "Central Fields, Pitch 1",
        votes: {
          in: ["p2", "p8"],
          maybe: ["p5"],
          out: ["p1"],
        },
      },
    ],
  },
  {
    id: "game-2",
    title: "Friday Night Basketball",
    sport: "Basketball",
    sportEmoji: "\uD83C\uDFC0",
    location: "Downtown Rec Center",
    gameType: "competitive",
    status: "confirmed",
    maxPlayers: 12,
    totalCost: 60,
    splitCost: true,
    group: "Pickup Hoops",
    heroImage:
      "https://images.unsplash.com/photo-1762025858816-bb383940763a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwY291cnQlMjBpbmRvb3IlMjByZWNyZWF0aW9uJTIwZ2FtZXxlbnwxfHx8fDE3NzE2MzE0MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    date: "Fri, Feb 27",
    time: "7:00 PM - 9:00 PM",
    votingDeadline: "2026-02-26T18:00:00",
    confirmedOptionId: "opt-2a",
    createdBy: "p3",
    roster: players.slice(0, 8),
    timeOptions: [
      {
        id: "opt-2a",
        date: "2026-02-27",
        startTime: "19:00",
        endTime: "21:00",
        location: "Downtown Rec Center",
        votes: {
          in: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"],
          maybe: [],
          out: [],
        },
      },
      {
        id: "opt-2b",
        date: "2026-02-28",
        startTime: "18:00",
        endTime: "20:00",
        location: "Downtown Rec Center",
        votes: {
          in: ["p1", "p3", "p5"],
          maybe: ["p2", "p4"],
          out: ["p6", "p7", "p8"],
        },
      },
    ],
  },
  {
    id: "game-3",
    title: "Beach Volleyball Classic",
    sport: "Volleyball",
    sportEmoji: "\uD83C\uDFD0",
    location: "Sunset Beach Courts",
    gameType: "casual",
    status: "completed",
    maxPlayers: 8,
    totalCost: 0,
    splitCost: false,
    group: "Beach Volley",
    heroImage:
      "https://images.unsplash.com/photo-1771526087551-db6be2f51a28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2xsZXliYWxsJTIwc2FuZCUyMGJlYWNoJTIwc3BvcnQlMjBjb3VydHxlbnwxfHx8fDE3NzE2MzE0MjZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    date: "Sun, Feb 16",
    time: "3:00 PM - 5:00 PM",
    votingDeadline: "2026-02-15T12:00:00",
    confirmedOptionId: "opt-3a",
    createdBy: "p4",
    roster: [players[1], players[3], players[5], players[7], players[0], players[6]],
    timeOptions: [
      {
        id: "opt-3a",
        date: "2026-02-16",
        startTime: "15:00",
        endTime: "17:00",
        location: "Sunset Beach Courts",
        votes: {
          in: ["p2", "p4", "p6", "p8", "p1", "p7"],
          maybe: [],
          out: [],
        },
      },
    ],
  },
  {
    id: "game-4",
    title: "Wednesday Pickup Soccer",
    sport: "Soccer",
    sportEmoji: "\u26BD",
    location: "Memorial Park, North Field",
    gameType: "casual",
    status: "completed",
    maxPlayers: 14,
    totalCost: 20,
    splitCost: true,
    group: "Sunday Soccer",
    heroImage:
      "https://images.unsplash.com/photo-1767406657699-9f3e01a48ea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBmaWVsZCUyMG91dGRvb3IlMjByZWNyZWF0aW9uJTIwZ3JlZW58ZW58MXx8fHwxNzcxNjMxNDI1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    date: "Wed, Feb 12",
    time: "6:00 PM - 8:00 PM",
    votingDeadline: "2026-02-11T23:59:59",
    confirmedOptionId: "opt-4a",
    createdBy: "p2",
    roster: [players[0], players[1], players[2], players[4], players[6], players[7]],
    timeOptions: [
      {
        id: "opt-4a",
        date: "2026-02-12",
        startTime: "18:00",
        endTime: "20:00",
        location: "Memorial Park, North Field",
        votes: {
          in: ["p1", "p2", "p3", "p5", "p7", "p8"],
          maybe: [],
          out: [],
        },
      },
    ],
  },
];

export function getGameById(id: string): Game | undefined {
  return games.find((g) => g.id === id);
}

export function getUpcomingGames(): Game[] {
  return games.filter((g) => g.status === "proposal" || g.status === "confirmed");
}

export function getCompletedGames(): Game[] {
  return games.filter((g) => g.status === "completed");
}

export function getPlayerById(id: string): Player | undefined {
  return players.find((p) => p.id === id);
}
