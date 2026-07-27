import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { GameCard } from "./GameCard";
import { fetchAllGames, type Game } from "./gameData";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
}

function formatOptionDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function CalendarScreen() {
  const navigate = useNavigate();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(now.getDate());
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllGames().then((g) => {
      setGames(g);
      setLoading(false);
    });
  }, []);

  // Re-fetch when the user returns to this tab so data stays fresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAllGames().then((g) => setGames(g));
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Map game dates to calendar days
  const eventDatesMap = useMemo(() => {
    const map: Record<number, { hasConfirmed: boolean; hasProposal: boolean; hasCompleted: boolean; hasCancelled: boolean }> = {};
    games.forEach((game) => {
      const isConfirmed = game.status === "confirmed";
      const isCompleted = game.status === "completed";
      const isCancelled = game.status === "cancelled";
      const relevantOptions = (isConfirmed || isCompleted || isCancelled)
        ? game.timeOptions.filter((opt) => opt.id === game.confirmedOptionId)
        : game.timeOptions;
      relevantOptions.forEach((opt) => {
        const d = new Date(opt.date + "T00:00:00");
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate();
          if (!map[day]) map[day] = { hasConfirmed: false, hasProposal: false, hasCompleted: false, hasCancelled: false };
          if (isCancelled) map[day].hasCancelled = true;
          else if (isCompleted) map[day].hasCompleted = true;
          else if (isConfirmed) map[day].hasConfirmed = true;
          else map[day].hasProposal = true;
        }
      });
    });
    return map;
  }, [currentMonth, currentYear, games]);

  // Find games for selected date
  const gamesForDate = useMemo(() => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    return games.filter((g) => {
      if (g.confirmedOptionId) {
        const confirmedOption = g.timeOptions.find(
          (opt) => opt.id === g.confirmedOptionId
        );
        return confirmedOption?.date === dateStr;
      }
      return g.timeOptions.some((opt) => opt.date === dateStr);
    });
  }, [selectedDate, currentMonth, currentYear, games]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(1);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(1);
  };

  const isToday = (day: number) =>
    day === now.getDate() &&
    currentMonth === now.getMonth() &&
    currentYear === now.getFullYear();

  return (
    <div className="flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-surface px-4 pt-[48px] pb-3">
        <h1 className="text-title-lg font-medium text-on-surface">Games</h1>
      </div>

      {/* Calendar */}
      <div className="px-4 mb-4">
        <div className="bg-surface-container-lowest rounded-md3-large p-4 shadow-md3-1">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className="w-8 h-8 rounded-md3-full flex items-center justify-center hover:bg-on-surface/8 active:bg-on-surface/12 transition-colors min-w-[48px] min-h-[48px]"
            >
              <ChevronLeft className="w-5 h-5 text-on-surface-variant" />
            </button>
            <span className="text-title-md font-medium text-on-surface">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={goToNextMonth}
              className="w-8 h-8 rounded-md3-full flex items-center justify-center hover:bg-on-surface/8 active:bg-on-surface/12 transition-colors min-w-[48px] min-h-[48px]"
            >
              <ChevronRight className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center"
              >
                <span className="text-label-md font-medium text-on-surface-variant">
                  {day}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0">
            {blanks.map((blank) => (
              <div key={`blank-${blank}`} className="h-[44px]" />
            ))}
            {days.map((day) => {
              const todayFlag = isToday(day);
              const isSelected = day === selectedDate;
              const eventInfo = eventDatesMap[day];

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className="h-[44px] flex flex-col items-center justify-center relative min-w-[44px]"
                >
                  <div
                    className={`w-[36px] h-[36px] rounded-md3-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary text-on-primary"
                        : todayFlag
                        ? "border-2 border-primary text-primary"
                        : "text-on-surface hover:bg-on-surface/8"
                    }`}
                  >
                    <span className="text-label-lg">{day}</span>
                  </div>
                  {eventInfo && !isSelected && (
                    <div className="absolute bottom-1 flex gap-[3px] items-center">
                      {eventInfo.hasProposal && !eventInfo.hasCancelled && (
                        <div className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                      )}
                      {eventInfo.hasConfirmed && !eventInfo.hasCancelled && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      {eventInfo.hasCompleted && !eventInfo.hasCancelled && (
                        <div className="w-1.5 h-1.5 rounded-full bg-on-surface-variant" />
                      )}
                      {eventInfo.hasCancelled && (
                        <div className="w-1.5 h-1.5 rounded-full bg-error" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Games for selected date */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 rounded-md3-full bg-primary-container flex items-center justify-center animate-pulse">
              <span className="text-label-lg font-medium text-on-primary-container">O</span>
            </div>
          </div>
        ) : gamesForDate.length > 0 ? (
          <>
            <h2 className="text-title-md font-medium text-on-surface mb-3">
              {MONTH_NAMES[currentMonth]} {selectedDate} Games
            </h2>
            <div className="flex flex-col gap-3">
              {gamesForDate.map((game) => {
                let displayDate = game.date;
                let displayTime = game.time;
                let displayLocation = game.location;

                if (!game.confirmedOptionId) {
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
                  const matchingOpts = game.timeOptions.filter((opt) => opt.date === dateStr);
                  if (matchingOpts.length === 1) {
                    const opt = matchingOpts[0];
                    displayDate = formatOptionDate(opt.date);
                    displayTime = `${formatTime(opt.startTime)} – ${formatTime(opt.endTime)}`;
                    displayLocation = opt.location;
                  } else if (matchingOpts.length > 1) {
                    displayDate = formatOptionDate(matchingOpts[0].date);
                    displayTime = `${matchingOpts.length} time options`;
                    displayLocation = matchingOpts[0].location;
                  }
                }

                return (
                  <GameCard
                    key={game.id}
                    id={game.id}
                    title={game.title}
                    date={displayDate}
                    time={displayTime}
                    location={displayLocation}
                    players={game.maxPlayers != null ? `${game.roster.length}/${game.maxPlayers}` : `${game.roster.length}`}
                    isFull={game.maxPlayers != null && game.roster.length >= game.maxPlayers}
                    variant={
                      game.status === "proposal"
                        ? "vote"
                        : game.status === "confirmed"
                        ? "confirmed"
                        : game.status === "cancelled"
                        ? "cancelled"
                        : "completed"
                    }
                  />
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-title-md font-medium text-on-surface mb-3">
              Scheduled Games
            </h2>
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 rounded-md3-full bg-surface-container flex items-center justify-center mb-3">
                <CalendarDays className="w-6 h-6 text-on-surface-variant" />
              </div>
              <p className="text-body-md text-on-surface-variant text-center">
                No games on {MONTH_NAMES[currentMonth]} {selectedDate}.
              </p>
              <button
                onClick={() => navigate("/create")}
                className="mt-3 flex items-center gap-2 px-4 h-[36px] bg-primary text-on-primary rounded-md3-full text-label-lg font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Game
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
