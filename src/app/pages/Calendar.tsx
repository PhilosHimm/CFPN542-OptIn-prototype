import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { getGames, getGroups, getCalendarMarkers } from "../services/games.service";
import type { Game, Group, GameStatus } from "../data/games";
import { SportIcon } from "../components/SportIcon";

function isGameExpired(game: Game): boolean {
  const today = new Date().toISOString().split("T")[0];
  return game.options.length > 0 && game.options.every((o) => o.date && o.date < today);
}

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function Calendar() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [calendarMarkers, setCalendarMarkers] = useState<Record<string, { status: GameStatus; gameId: string }[]>>({});

  useEffect(() => {
    getGames().then(setGames);
    getGroups().then(setGroups);
    getCalendarMarkers().then(setCalendarMarkers);
  }, []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  );

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const selectedMarkers = calendarMarkers[selectedDate] || [];
  const selectedGames = selectedMarkers
    .map((m) => ({ ...m, game: games.find((g) => g.id === m.gameId)! }))
    .filter((m) => m.game);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-6 pb-10 px-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="pt-4">
        <h1 className="text-3xl font-bold tracking-tight text-black/90">Calendar</h1>
        <p className="text-black/40 text-sm font-medium mt-0.5">Your game schedule at a glance</p>
      </header>

      {/* ── Calendar Card ───────────────────────────────────────────────────── */}
      <div className="ios-card overflow-hidden !p-0">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-black/5">
          <button 
            onClick={prevMonth}
            aria-label="Previous month"
            className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-primary active:scale-90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-black/80">
            {MONTHS[month]} {year}
          </span>
          <button 
            onClick={nextMonth}
            aria-label="Next month"
            className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-primary active:scale-90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-2 py-3 bg-black/[0.02]">
          {DAYS.map((d) => (
            <div key={d} className="text-center">
              <span className="text-[10px] font-bold text-black/30 tracking-widest">{d}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 p-2">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = toDateStr(year, month, day);
            const markers = calendarMarkers[dateStr] || [];
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                aria-label={`${MONTHS[month]} ${day}, ${year}${markers.length ? `, ${markers.length} game${markers.length > 1 ? 's' : ''}` : ''}`}
                aria-pressed={isSelected}
                className="relative aspect-square flex flex-col items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none rounded-lg"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                    isSelected 
                      ? "bg-primary text-white shadow-lg shadow-primary/30 font-bold scale-110" 
                      : isToday 
                        ? "bg-primary/10 text-primary font-bold" 
                        : "text-black/70 font-medium"
                  }`}
                >
                  {day}
                </div>
                {/* Status dots */}
                <div className="absolute bottom-1 flex gap-0.5">
                  {markers.slice(0, 3).map((m, mi) => (
                    <div
                      key={mi}
                      className={`w-1 h-1 rounded-full ${
                        m.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Games on selected date ───────────────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black/80">
            {selectedGames.length > 0
              ? `${MONTHS[month]} ${parseInt(selectedDate.split("-")[2])}`
              : "No games scheduled"}
          </h2>
          {selectedGames.length > 0 && (
            <button 
              onClick={() => navigate("/create")}
              aria-label="Create new game"
              className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {selectedGames.length === 0 ? (
          <div className="ios-card bg-white/30 border-dashed py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-black/5 flex items-center justify-center text-black/20">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-black/70">Nothing scheduled</p>
              <p className="text-xs font-medium text-black/40 mt-1">No games on this date.</p>
            </div>
            <button
              onClick={() => navigate("/create")}
              className="mt-2 px-6 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-md active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
            >
              Create Game
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedGames.map(({ game, status }) => {
              const topOpt = [...game.options].sort((a, b) => b.inVotes - a.inVotes)[0];
              const confirmedOpt = game.confirmedOptionId
                ? game.options.find((o) => o.id === game.confirmedOptionId)
                : null;
              const displayOpt = confirmedOpt || topOpt;
              const group = groups.find((g) => g.id === game.groupId);

              return (
                <button
                  key={game.id}
                  onClick={() => navigate(`/game/${game.id}`)}
                  className="w-full ios-card p-4 flex gap-4 text-left active:scale-[0.98] transition-all relative overflow-hidden"
                >
                  <div 
                    className="absolute top-0 left-0 w-1 h-full" 
                    style={{ backgroundColor: status === 'confirmed' ? '#34C759' : '#FF9500' }} 
                  />
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: game.sportColor }}
                  >
                    <SportIcon sport={game.sport} className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-black/90 truncate">{game.title}</h4>
                        <p className="text-xs font-medium text-black/40">{group?.name}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {status === 'proposal' ? 'Voting' : 'Confirmed'}
                      </span>
                    </div>
                    {displayOpt && (
                      <div className="mt-3 flex gap-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-black/30" />
                          <span className="text-xs font-bold text-black/60">{displayOpt.startTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-black/30" />
                          <span className="text-xs font-medium text-black/40 truncate">{displayOpt.location}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── All Upcoming ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-black/80 mb-4">All Upcoming</h2>
        {(() => {
          const upcomingGames = games.filter((g) => (g.status === "proposal" || g.status === "confirmed") && !isGameExpired(g));
          if (upcomingGames.length === 0) {
            return (
              <div className="ios-card bg-white/30 border-dashed py-10 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-black/5 flex items-center justify-center text-black/20">
                  <CalendarIcon className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-black/70">No upcoming games</p>
                  <p className="text-xs font-medium text-black/40 mt-1">Games you create or join will appear here.</p>
                </div>
                <button
                  onClick={() => navigate("/create")}
                  className="mt-2 px-6 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-md active:scale-95 transition-all"
                >
                  Create Game
                </button>
              </div>
            );
          }
          return (
            <div className="ios-card p-2 space-y-1">
              {upcomingGames.map((game) => {
                const opt = game.confirmedOptionId
                  ? game.options.find((o) => o.id === game.confirmedOptionId)
                  : game.options.length > 0 ? [...game.options].sort((a, b) => b.inVotes - a.inVotes)[0] : null;

                return (
                  <button
                    key={game.id}
                    onClick={() => navigate(`/game/${game.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-black/5 active:bg-black/10 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-black/30">
                      <SportIcon sport={game.sport} className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black/90 truncate">{game.title}</p>
                      <p className="text-[11px] font-medium text-black/40">
                        {opt?.displayDate ?? "No date"} • {opt?.startTime ?? ""}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${game.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </button>
                );
              })}
            </div>
          );
        })()}
      </section>
    </div>
  );
}
