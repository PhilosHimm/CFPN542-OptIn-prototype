import { useNavigate } from "react-router";
import { Bell, ChevronRight } from "lucide-react";
import { GameCard } from "./GameCard";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { games, getUpcomingGames, getCompletedGames } from "./gameData";

const groups = [
  {
    name: "Sunday Soccer",
    image:
      "https://images.unsplash.com/photo-1546957221-37816b007052?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNyZWF0aW9uYWwlMjBzb2NjZXIlMjB0ZWFtJTIwZ3JvdXAlMjBwaG90b3xlbnwxfHx8fDE3NzE2MjgxMjh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    members: 24,
  },
  {
    name: "Pickup Hoops",
    image:
      "https://images.unsplash.com/photo-1765605898805-86923208c52b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwY291cnQlMjBvdXRkb29yJTIwcmVjcmVhdGlvbnxlbnwxfHx8fDE3NzE2MjgxMjh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    members: 18,
  },
  {
    name: "Beach Volley",
    image:
      "https://images.unsplash.com/photo-1754737375935-36bc0c8652db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2xsZXliYWxsJTIwYmVhY2glMjBzcG9ydHMlMjBncm91cHxlbnwxfHx8fDE3NzE2MjgxMjh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    members: 12,
  },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildSchedule() {
  const upcoming = games.filter((g) => g.status === "proposal" || g.status === "confirmed");
  // date → highest-priority status (confirmed beats proposal)
  const dateStatusMap: Record<string, "proposal" | "confirmed"> = {};
  for (const game of upcoming) {
    for (const opt of game.timeOptions) {
      const isConfirmedOpt = game.status === "confirmed" && game.confirmedOptionId === opt.id;
      if (isConfirmedOpt) {
        dateStatusMap[opt.date] = "confirmed";
      } else if (!dateStatusMap[opt.date]) {
        dateStatusMap[opt.date] = "proposal";
      }
    }
  }
  const today = new Date();
  const start = new Date(2026, 1, 20); // Feb 20, 2026
  return Array.from({ length: 9 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      day: DAY_NAMES[d.getDay()],
      date: String(d.getDate()),
      isToday: d.toDateString() === today.toDateString(),
      status: dateStatusMap[dateStr] ?? null,
    };
  });
}

export function HomeScreen() {
  const navigate = useNavigate();
  const upcomingGames = getUpcomingGames();
  const completedGames = getCompletedGames();
  const scheduleItems = buildSchedule();

  return (
    <div className="flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-surface px-4 pt-[48px] pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-md text-on-surface-variant">Good morning</p>
            <h1 className="text-title-lg font-medium text-on-surface leading-tight">
              Hello User, Ready to play?
            </h1>
          </div>
          <button className="w-10 h-10 rounded-md3-full flex items-center justify-center bg-surface-container-low hover:bg-on-surface/8 transition-colors min-w-[48px] min-h-[48px]">
            <Bell className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>
      </div>

      {/* My Groups - Horizontal scroll */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-title-md font-medium text-on-surface">My Groups</h2>
          <button
            onClick={() => navigate("/chats", { state: { tab: "groups" } })}
            className="flex items-center gap-0.5 text-label-lg text-primary font-medium min-h-[48px]"
          >
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {groups.map((group) => (
            <div
              key={group.name}
              className="flex-shrink-0 w-[140px] rounded-md3-large overflow-hidden bg-surface-container-lowest shadow-md3-1"
            >
              <div className="h-[80px] overflow-hidden">
                <ImageWithFallback
                  src={group.image}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5">
                <p className="text-label-lg font-medium text-on-surface truncate">
                  {group.name}
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  {group.members} members
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule - Horizontal scroll */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-title-md font-medium text-on-surface">Schedule</h2>
          <button
            onClick={() => navigate("/calendar")}
            className="flex items-center gap-0.5 text-label-lg text-primary font-medium min-h-[48px]"
          >
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {scheduleItems.map((item) => (
            <div
              key={`${item.day}-${item.date}`}
              className={`flex-shrink-0 w-[56px] h-[72px] rounded-md3-large flex flex-col items-center justify-center gap-0.5 transition-colors ${
                item.status === "confirmed"
                  ? "bg-emerald-500 text-white"
                  : item.status === "proposal"
                  ? "bg-tertiary-container text-on-tertiary-container"
                  : item.isToday
                  ? "bg-surface-container text-on-surface ring-2 ring-inset ring-primary/20"
                  : "bg-surface-container-low text-on-surface-variant"
              }`}
            >
              <span className="text-label-sm font-medium opacity-70">
                {item.day}
              </span>
              <span className="text-title-lg font-medium">{item.date}</span>
              {item.status && (
                <span className="w-1 h-1 rounded-full bg-white/60 mt-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Games */}
      <div className="px-4 mb-6">
        <h2 className="text-title-md font-medium text-on-surface mb-3">
          Upcoming Games
        </h2>
        <div className="flex flex-col gap-3">
          {upcomingGames.map((game) => (
            <GameCard
              key={game.id}
              id={game.id}
              title={game.title}
              date={game.date}
              time={game.time}
              location={game.location}
              players={`${game.roster.length}/${game.maxPlayers}`}
              isFull={game.roster.length >= game.maxPlayers}
              variant={game.status === "proposal" ? "vote" : "confirmed"}
            />
          ))}
        </div>
      </div>

      {/* Completed Games */}
      {completedGames.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-title-md font-medium text-on-surface">
              Recent Games
            </h2>
            <button className="flex items-center gap-0.5 text-label-lg text-primary font-medium min-h-[48px]">
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {completedGames.map((game) => (
              <GameCard
                key={game.id}
                id={game.id}
                title={game.title}
                date={game.date}
                time={game.time}
                location={game.location}
                players={`${game.roster.length}/${game.maxPlayers}`}
                isFull={game.roster.length >= game.maxPlayers}
                variant="completed"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
