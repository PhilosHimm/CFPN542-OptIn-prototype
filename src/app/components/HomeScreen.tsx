import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bell, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { GameCard } from "./GameCard";
import { fetchAllGames, type Game } from "./gameData";
import { useAuth } from "../contexts/AuthContext";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildSchedule(allGames: Game[]) {
  const upcoming = allGames.filter((g) => g.status === "proposal" || g.status === "confirmed");
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
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay()); // start of current week
  return Array.from({ length: 9 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      day: DAY_NAMES[d.getDay()],
      date: String(d.getDate()),
      fullDate: dateStr,
      isToday: d.toDateString() === today.toDateString(),
      status: dateStatusMap[dateStr] ?? null,
    };
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  useEffect(() => {
    fetchAllGames().then((g) => {
      setAllGames(g);
      setLoading(false);
    });
  }, []);

  // Re-fetch when the user returns to this tab so data stays fresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAllGames().then((g) => setAllGames(g));
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const getGamesForDate = (dateStr: string) => {
    return allGames.filter((g) => {
      if (g.status === "completed" || g.status === "cancelled") return false;
      return g.timeOptions.some((opt) => {
        if (g.status === "confirmed") {
          return g.confirmedOptionId === opt.id && opt.date === dateStr;
        }
        return opt.date === dateStr;
      });
    });
  };

  const isDefaultView = selectedDateStr === todayStr;
  const gamesToday = getGamesForDate(todayStr);
  const gamesForSelectedDate = getGamesForDate(selectedDateStr);

  const upcomingGames = allGames.filter((g) => {
    if (g.status === "completed" || g.status === "cancelled") return false;
    if (isDefaultView) {
      return !gamesToday.some((tg) => tg.id === g.id);
    }
    return true;
  });

  const completedGames = allGames.filter((g) => g.status === "completed");
  const scheduleItems = buildSchedule(allGames);
  const firstName = profile?.name?.split(" ")[0] || "there";

  const renderEmptyState = () => (
    <div className="flex flex-col items-center py-10 px-4">
      <div className="w-14 h-14 rounded-md3-full bg-surface-container flex items-center justify-center mb-3">
        <CalendarDays className="w-7 h-7 text-on-surface-variant" />
      </div>
      <p className="text-body-lg font-medium text-on-surface mb-1">No upcoming games</p>
      <p className="text-body-md text-on-surface-variant text-center mb-4">
        Create a game to get started
      </p>
      <button
        onClick={() => navigate("/create")}
        className="flex items-center gap-2 px-5 h-[40px] bg-primary text-on-primary rounded-md3-full text-label-lg font-medium shadow-md3-1"
      >
        <Plus className="w-4 h-4" />
        Create Game
      </button>
    </div>
  );

  return (
    <div className="flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-surface px-4 pt-[48px] pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-md text-on-surface-variant">{getGreeting()}</p>
            <h1 className="text-title-lg font-medium text-on-surface leading-tight">
              Hello {firstName}, Ready to play?
            </h1>
          </div>
          <button className="w-10 h-10 rounded-md3-full flex items-center justify-center bg-surface-container-low hover:bg-on-surface/8 transition-colors min-w-[48px] min-h-[48px]">
            <Bell className="w-5 h-5 text-on-surface-variant" />
          </button>
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
          {scheduleItems.map((item) => {
            const isSelected = selectedDateStr === item.fullDate;
            return (
              <div
                key={`${item.day}-${item.date}`}
                onClick={() => setSelectedDateStr(item.fullDate)}
                className={`flex-shrink-0 w-[56px] h-[72px] cursor-pointer rounded-md3-large flex flex-col items-center justify-center gap-0.5 transition-all ${
                  isSelected ? "ring-2 ring-primary ring-inset" : ""
                } ${
                  item.status === "confirmed"
                    ? "bg-emerald-500 text-white"
                    : item.status === "proposal"
                    ? "bg-tertiary-container text-on-tertiary-container"
                    : item.isToday
                    ? "bg-surface-container text-on-surface"
                    : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                <span className="text-label-sm font-medium opacity-70">
                  {item.day}
                </span>
                <span className="text-title-lg font-medium">{item.date}</span>
                {item.status && (
                  <span className="w-1 h-1 rounded-full bg-current opacity-60 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Games List Sections */}
      <div className="px-4 mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-md3-full bg-primary-container flex items-center justify-center animate-pulse">
              <span className="text-label-lg font-medium text-on-primary-container">O</span>
            </div>
          </div>
        ) : isDefaultView ? (
          <div className="flex flex-col gap-6">
            {gamesToday.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-title-md font-medium text-on-surface">
                  Games Today
                </h2>
                {gamesToday.map((game) => (
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
            )}
            
            <div className="flex flex-col gap-3">
              <h2 className="text-title-md font-medium text-on-surface">
                Upcoming Games
              </h2>
              {upcomingGames.length > 0 ? (
                upcomingGames.map((game) => (
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
                ))
              ) : (
                renderEmptyState()
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-title-md font-medium text-on-surface">
              Games for {new Date(selectedDateStr) && !isNaN(new Date(selectedDateStr).getTime()) ? new Date(selectedDateStr.replace(/-/g, '\/')).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }) : selectedDateStr}
            </h2>
            {gamesForSelectedDate.length > 0 ? (
              gamesForSelectedDate.map((game) => (
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
              ))
            ) : (
              <div className="flex flex-col items-center py-10 px-4">
                <p className="text-body-md text-on-surface-variant text-center">
                  No games scheduled for this date
                </p>
              </div>
            )}
          </div>
        )}
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
