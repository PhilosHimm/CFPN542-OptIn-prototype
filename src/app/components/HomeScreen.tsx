import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bell, ChevronRight, Plus, CalendarDays, X } from "lucide-react";
import { GameCard } from "./GameCard";
import { fetchAllGames, type Game, DEMO_REFERENCE_DATE } from "./gameData";
import { useAuth } from "../contexts/AuthContext";
import { getInvites, respondToInvite, type GameInvite } from "../services/games.service";
import { db, isDemoMode, poll } from "@/lib/db";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isGameExpired(game: Game, todayStr: string): boolean {
  if (game.timeOptions.length === 0) return false;
  if (game.status === "confirmed") {
    const confirmed = game.timeOptions.find((o) => o.id === game.confirmedOptionId);
    return !confirmed || confirmed.date < todayStr;
  }
  return game.timeOptions.every((o) => o.date < todayStr);
}

function buildSchedule(allGames: Game[], todayStr: string, today: Date = new Date()) {
  const upcoming = allGames.filter((g) => g.status === "proposal" || g.status === "confirmed" || g.status === "completed");
  const dateStatusMap: Record<string, "proposal" | "confirmed" | "completed"> = {};
  for (const game of upcoming) {
    if (game.status === "confirmed" || game.status === "completed") {
      const confirmedOpt = game.timeOptions.find((o) => o.id === game.confirmedOptionId);
      if (!confirmedOpt) continue;
      if (game.status === "confirmed") {
        dateStatusMap[confirmedOpt.date] = "confirmed";
      } else {
        if (dateStatusMap[confirmedOpt.date] !== "confirmed") {
          dateStatusMap[confirmedOpt.date] = "completed";
        }
      }
    } else {
      for (const opt of game.timeOptions) {
        if (opt.date < todayStr) continue;
        if (!dateStatusMap[opt.date]) {
          dateStatusMap[opt.date] = "proposal";
        }
      }
    }
  }
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const todayObj = isDemoMode()
    ? new Date(DEMO_REFERENCE_DATE + "T12:00:00.000Z")
    : new Date();
  const todayStr = isDemoMode()
    ? DEMO_REFERENCE_DATE
    : `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;
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

  // Fetch pending invites when profile resolves
  useEffect(() => {
    if (profile) getInvites(profile.id).then(setInvites);
  }, [profile?.id]);

  // Poll for new invites while Home is open (Neon has no realtime push).
  useEffect(() => {
    if (!profile || isDemoMode() || !db) return;
    return poll(() => getInvites(profile.id).then(setInvites), 15_000);
  }, [profile?.id]);

  const getGamesForDate = (dateStr: string) => {
    return allGames.filter((g) => {
      if (g.status === "cancelled") return false;
      return g.timeOptions.some((opt) => {
        if (g.status === "confirmed" || g.status === "completed") {
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
    if (isGameExpired(g, todayStr)) return false;
    if (isDefaultView) {
      return !gamesToday.some((tg) => tg.id === g.id);
    }
    return true;
  });

  const completedGames = allGames.filter((g) => g.status === "completed");
  const scheduleItems = buildSchedule(allGames, todayStr, todayObj);
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
          <button
            aria-label="Notifications"
            onClick={() => setShowNotifications(true)}
            className="relative w-10 h-10 rounded-md3-full flex items-center justify-center bg-surface-container-low hover:bg-on-surface/8 transition-colors min-w-[48px] min-h-[48px]"
          >
            <Bell className="w-5 h-5 text-on-surface-variant" />
            {invites.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error border-2 border-surface rounded-full" aria-hidden="true" />
            )}
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
                    ? "bg-primary-container text-on-primary-container"
                    : item.status === "proposal"
                    ? "bg-tertiary-container text-on-tertiary-container"
                    : item.status === "completed"
                    ? "bg-surface-container text-on-surface-variant"
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
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    item.status === "confirmed" ? "bg-primary" : 
                    item.status === "proposal" ? "bg-tertiary" : 
                    "bg-on-surface-variant"
                  }`} />
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
                    players={game.maxPlayers ? `${game.roster.length}/${game.maxPlayers}` : `${game.roster.length}`} 
                    isFull={game.maxPlayers ? game.roster.length >= game.maxPlayers : false}
                    variant={game.status === "proposal" ? "vote" : game.status === "completed" ? "completed" : "confirmed"}
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
                    players={game.maxPlayers ? `${game.roster.length}/${game.maxPlayers}` : `${game.roster.length}`} 
                    isFull={game.maxPlayers ? game.roster.length >= game.maxPlayers : false}
                    variant={game.status === "proposal" ? "vote" : game.status === "completed" ? "completed" : "confirmed"}
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
                  players={game.maxPlayers ? `${game.roster.length}/${game.maxPlayers}` : `${game.roster.length}`} 
                  isFull={game.maxPlayers ? game.roster.length >= game.maxPlayers : false}
                  variant={game.status === "proposal" ? "vote" : game.status === "completed" ? "completed" : "confirmed"}
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
                players={game.maxPlayers ? `${game.roster.length}/${game.maxPlayers}` : `${game.roster.length}`} 
                isFull={game.maxPlayers ? game.roster.length >= game.maxPlayers : false}
                variant="completed"
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Notifications Panel ───────────────────────────────── */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            onKeyDown={(e) => e.key === "Escape" && setShowNotifications(false)}
            tabIndex={-1}
            ref={(el) => el?.focus()}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface rounded-t-3xl z-50 p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-title-lg font-medium text-on-surface">Notifications</h2>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            {invites.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <Bell className="w-12 h-12 text-on-surface/10" />
                <p className="text-body-lg font-medium text-on-surface-variant">No new notifications</p>
                <p className="text-body-md text-on-surface-variant/70">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-96">
                {invites.map((invite) => (
                  <div key={invite.gameId} className="bg-surface-container rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: invite.sportColor }}
                      >
                        <span className="text-lg">{invite.sportEmoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-label-sm font-medium text-primary uppercase tracking-wider mb-0.5">Game Invite</p>
                        <p className="text-body-lg font-medium text-on-surface truncate">{invite.title}</p>
                        {invite.bestOptionDisplayDate && (
                          <p className="text-body-sm text-on-surface-variant">
                            {invite.bestOptionDisplayDate}
                            {invite.bestOptionStartTime ? ` @ ${invite.bestOptionStartTime}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={respondingTo === invite.gameId}
                        onClick={async () => {
                          if (!profile) return;
                          setRespondingTo(invite.gameId);
                          await respondToInvite(invite.gameId, profile.id, true);
                          const [updatedInvites, updatedGames] = await Promise.all([
                            getInvites(profile.id),
                            fetchAllGames(),
                          ]);
                          setInvites(updatedInvites);
                          setAllGames(updatedGames);
                          setRespondingTo(null);
                        }}
                        className="flex-1 h-10 rounded-full bg-primary text-on-primary font-medium text-label-lg disabled:opacity-50 active:opacity-80 transition-opacity"
                      >
                        {respondingTo === invite.gameId ? "..." : "Accept"}
                      </button>
                      <button
                        disabled={respondingTo === invite.gameId}
                        onClick={async () => {
                          if (!profile) return;
                          setRespondingTo(invite.gameId);
                          await respondToInvite(invite.gameId, profile.id, false);
                          getInvites(profile.id).then(setInvites);
                          setRespondingTo(null);
                        }}
                        className="flex-1 h-10 rounded-full bg-surface-container-high text-on-surface-variant font-medium text-label-lg disabled:opacity-50 active:opacity-80 transition-opacity"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
