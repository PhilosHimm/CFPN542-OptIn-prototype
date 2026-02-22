import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GameCard } from "./GameCard";
import { games } from "./gameData";

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

export function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(1); // February (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState(20);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const today = 20; // Feb 20, 2026

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Map game dates to calendar days
  const eventDatesMap = useMemo(() => {
    const map: Record<number, { status: string }> = {};
    games.forEach((game) => {
      game.timeOptions.forEach((opt) => {
        const d = new Date(opt.date + "T00:00:00");
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate();
          map[day] = { status: game.status };
        }
      });
    });
    return map;
  }, [currentMonth, currentYear]);

  // Find games for selected date
  const gamesForDate = useMemo(() => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    return games.filter((g) =>
      g.timeOptions.some((opt) => opt.date === dateStr)
    );
  }, [selectedDate, currentMonth, currentYear]);

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

  return (
    <div className="flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-[#FFFBFE] px-4 pt-[48px] pb-3">
        <h1 className="text-[22px] font-medium text-[#1C1B1F]">Games</h1>
      </div>

      {/* Calendar */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F5] min-w-[48px] min-h-[48px]"
            >
              <ChevronLeft className="w-5 h-5 text-[#49454F]" />
            </button>
            <span className="text-[16px] font-medium text-[#1C1B1F]">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={goToNextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F5] min-w-[48px] min-h-[48px]"
            >
              <ChevronRight className="w-5 h-5 text-[#49454F]" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center"
              >
                <span className="text-[12px] font-medium text-[#49454F]">
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
              const isToday =
                day === today &&
                currentMonth === 1 &&
                currentYear === 2026;
              const isSelected = day === selectedDate;
              const eventInfo = eventDatesMap[day];

              const dotColor = eventInfo
                ? eventInfo.status === "proposal"
                  ? "bg-[#E65100]"
                  : eventInfo.status === "confirmed"
                  ? "bg-[#2D7A3A]"
                  : "bg-[#757575]"
                : "";

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className="h-[44px] flex flex-col items-center justify-center relative min-w-[44px]"
                >
                  <div
                    className={`w-[36px] h-[36px] rounded-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-[#2D7A3A] text-white"
                        : isToday
                        ? "border-2 border-[#2D7A3A] text-[#2D7A3A]"
                        : "text-[#1C1B1F] hover:bg-[#F5F5F5]"
                    }`}
                  >
                    <span className="text-[13px]">{day}</span>
                  </div>
                  {eventInfo && !isSelected && (
                    <div
                      className={`absolute bottom-0 w-[5px] h-[5px] rounded-full ${dotColor}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Games for selected date */}
      <div className="px-4">
        {gamesForDate.length > 0 ? (
          <>
            <h2 className="text-[16px] font-medium text-[#1C1B1F] mb-3">
              {MONTH_NAMES[currentMonth]} {selectedDate} Games
            </h2>
            <div className="flex flex-col gap-3">
              {gamesForDate.map((game) => (
                <GameCard
                  key={game.id}
                  id={game.id}
                  title={game.title}
                  date={game.date}
                  time={game.time}
                  location={game.location}
                  players={`${game.roster.length}/${game.maxPlayers}`}
                  isFull={game.roster.length >= game.maxPlayers}
                  variant={
                    game.status === "proposal"
                      ? "vote"
                      : game.status === "confirmed"
                      ? "confirmed"
                      : "completed"
                  }
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[16px] font-medium text-[#1C1B1F] mb-3">
              Scheduled Games
            </h2>
            <div className="flex flex-col items-center py-8">
              <p className="text-[14px] text-[#49454F] text-center">
                No games on {MONTH_NAMES[currentMonth]} {selectedDate}.
              </p>
              <p className="text-[12px] text-[#9E9E9E] mt-1 text-center">
                Tap a date with a dot to see games.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
