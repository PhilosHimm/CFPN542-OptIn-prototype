import { useNavigate } from "react-router";
import { 
  Bell, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users, 
  Trophy, 
  Plus, 
  Calendar as CalendarIcon,
  Circle,
  Basketball,
  Dribbble, // Using dribbble for ball-like or custom icons if needed, but let's stick to standard Lucide
  Gamepad2,
  Activity
} from "lucide-react";
import { SportIcon } from "../components/SportIcon";
import { games, groups } from "../data/games";
import type { GameStatus } from "../data/games";

function StatusBadge({ status }: { status: GameStatus }) {
  const config = {
    proposal: { label: "Voting Open", color: "text-amber-600 bg-amber-100" },
    confirmed: { label: "Confirmed", color: "text-emerald-600 bg-emerald-100" },
    completed: { label: "Played", color: "text-slate-500 bg-slate-100" },
    cancelled: { label: "Cancelled", color: "text-rose-600 bg-rose-100" },
  };
  const { label, color } = config[status] || config.proposal;
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${color}`}>
      {label}
    </span>
  );
}

export function Home() {
  const navigate = useNavigate();
  const upcomingGames = games.filter((g) => g.status !== "completed" && g.status !== "cancelled");
  const completedGames = games.filter((g) => g.status === "completed");

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-6 pt-4 flex justify-between items-end">
        <div>
          <p className="text-black/40 text-sm font-medium">Friday, Feb 20</p>
          <h1 className="text-3xl font-bold tracking-tight text-black/90">Hey, Marcus</h1>
        </div>
        <div className="flex gap-3">
          <button className="relative w-11 h-11 glass rounded-full flex items-center justify-center text-black/70 active:scale-95 transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" />
          </button>
          <button 
            onClick={() => navigate("/profile")}
            className="w-11 h-11 rounded-full border-2 border-white shadow-lg overflow-hidden active:scale-95 transition-all"
          >
            <img 
              src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=100&auto=format&fit=crop" 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* ── My Groups ────────────────────────────────────────────────────────── */}
      <section>
        <div className="px-6 flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-black/80">My Groups</h3>
          <button className="text-primary text-sm font-semibold flex items-center gap-0.5">
            Manage <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 no-scrollbar">
          {groups.map((group) => (
            <button
              key={group.id}
              className="flex-shrink-0 w-[120px] ios-card flex flex-col items-center gap-3 text-center transition-transform active:scale-95"
            >
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-inner shadow-black/5"
                style={{ backgroundColor: group.color }}
              >
                <SportIcon sport={group.sport} className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-black/90 leading-tight">{group.name}</p>
                <p className="text-[11px] font-medium text-black/40 mt-0.5">{group.memberCount} members</p>
              </div>
              {group.nextGame && (
                <div className="bg-black/5 px-2 py-0.5 rounded-md">
                  <p className="text-[9px] font-bold text-black/60 uppercase tracking-tighter">{group.nextGame}</p>
                </div>
              )}
            </button>
          ))}
          <button className="flex-shrink-0 w-[120px] rounded-[20px] border-2 border-dashed border-black/10 flex flex-col items-center justify-center gap-2 text-black/40 active:bg-black/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold">New Group</span>
          </button>
        </div>
      </section>

      {/* ── Upcoming Games ───────────────────────────────────────────────────── */}
      <section className="px-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-black/80">Upcoming Games</h3>
          <button 
            onClick={() => navigate("/calendar")}
            className="text-primary text-sm font-semibold flex items-center gap-0.5"
          >
            Calendar <CalendarIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {upcomingGames.map((game) => {
            const group = groups.find((g) => g.id === game.groupId);
            const topOption = [...game.options].sort((a, b) => b.inVotes - a.inVotes)[0];
            const confirmedOption = game.confirmedOptionId
              ? game.options.find((o) => o.id === game.confirmedOptionId)
              : null;
            const displayOption = confirmedOption || topOption;

            return (
              <button
                key={game.id}
                onClick={() => navigate(`/game/${game.id}`)}
                className="w-full ios-card text-left flex flex-col gap-4 relative overflow-hidden active:scale-[0.98] transition-all"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: game.sportColor }} />
                
                <div className="flex justify-between items-start pl-2">
                  <div className="flex gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: game.sportColor }}
                    >
                      <SportIcon sport={game.sport} className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-black/90">{game.title}</h4>
                      <p className="text-xs font-medium text-black/40 mt-0.5">
                        {group?.name} • {game.gameType}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={game.status} />
                </div>

                {displayOption && (
                  <div className={`p-3 rounded-xl ml-2 ${game.status === 'proposal' ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Clock className={`w-3.5 h-3.5 ${game.status === 'proposal' ? 'text-amber-600' : 'text-emerald-600'}`} />
                      <span className={`text-xs font-bold ${game.status === 'proposal' ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {displayOption.displayDate} @ {displayOption.startTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-black/40" />
                      <span className="text-xs font-medium text-black/60 truncate">
                        {displayOption.location}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pl-2 mt-1">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {topOption?.voterInitials.slice(0, 4).map((init, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: `hsl(${i * 45}, 70%, 45%)` }}
                        >
                          {init}
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-black/40 uppercase tracking-wider">
                      {game.currentPlayers}/{game.maxPlayers} JOINED
                    </span>
                  </div>
                  
                  <div className="bg-black/5 px-2.5 py-1 rounded-lg">
                    <span className="text-[11px] font-bold text-black/60">
                      {game.perPersonCost > 0 ? `$${game.perPersonCost.toFixed(2)}` : 'FREE'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Weekly CTA ────────────────────────────────────────────────────────── */}
      <section className="px-6">
        <button 
          onClick={() => navigate("/create")}
          className="w-full bg-primary rounded-3xl p-6 flex items-center gap-4 text-white shadow-xl shadow-primary/20 active:scale-[0.98] transition-all overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
          <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-white shrink-0">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg">Initiate Weekly Game</p>
            <p className="text-xs text-white/70 font-medium">Auto-fill group recurring schedules</p>
          </div>
          <div className="ml-auto w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
        </button>
      </section>

      {/* ── Recent Games ────────────────────────────────────────────────────────── */}
      {completedGames.length > 0 && (
        <section className="px-6 pb-4">
          <h3 className="text-xl font-bold text-black/80 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {completedGames.map((game) => (
              <button
                key={game.id}
                onClick={() => navigate(`/game/${game.id}`)}
                className="w-full ios-card p-3 flex items-center gap-4 active:scale-[0.98] transition-all opacity-80"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                  <SportIcon sport={game.sport} className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-black/90">{game.title}</p>
                  <p className="text-[11px] font-medium text-black/40">
                    {game.options[0].displayDate} • {game.currentPlayers} players
                  </p>
                </div>
                <StatusBadge status={game.status} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
