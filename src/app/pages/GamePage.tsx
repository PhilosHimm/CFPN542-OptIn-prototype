import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { 
  ArrowLeft, 
  Share2, 
  Clock, 
  MapPin, 
  Users, 
  CircleDollarSign, 
  Plus, 
  Check, 
  ChevronDown, 
  Info,
  Trophy,
  AlertCircle,
  TrendingUp,
  X,
  HelpCircle
} from "lucide-react";
import { games, groups } from "../data/games";
import type { VoteValue } from "../data/games";
import { SportIcon } from "../components/SportIcon";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function GamePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const game = games.find((g) => g.id === id) || games[0];
  const group = groups.find((g) => g.id === game.groupId);

  const [hours, setHours] = useState(game.countdownH);
  const [minutes, setMinutes] = useState(game.countdownM);
  const [seconds, setSeconds] = useState(game.countdownS);
  const [votes, setVotes] = useState<Record<string, VoteValue>>({});
  const [showMaybeSheet, setShowMaybeSheet] = useState<string | null>(null);
  const [maybeReason, setMaybeReason] = useState("");

  const maybeReasons = ["Work schedule", "Family plans", "Transport issues", "Might be late", "Other"];

  useEffect(() => {
    if (game.status !== "proposal") return;
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s > 0) return s - 1;
        setMinutes((m) => {
          if (m > 0) return m - 1;
          setHours((h) => (h > 0 ? h - 1 : 0));
          return m > 0 ? 59 : 0;
        });
        return s > 0 ? 58 : 59;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [game.status]);

  const sortedOptions = [...game.options].sort((a, b) => b.inVotes - a.inVotes);

  const handleVote = (optionId: string, vote: VoteValue) => {
    if (vote === "maybe") {
      setShowMaybeSheet(optionId);
      return;
    }
    setVotes((prev) => ({ ...prev, [optionId]: vote }));
  };

  const handleMaybeConfirm = () => {
    if (showMaybeSheet) {
      setVotes((prev) => ({ ...prev, [showMaybeSheet]: "maybe" }));
    }
    setShowMaybeSheet(null);
    setMaybeReason("");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="px-6 pt-4 flex items-center justify-between sticky top-0 z-50 bg-[#F2F2F7]/80 backdrop-blur-md pb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-10 h-10 glass rounded-full flex items-center justify-center text-black/60 active:scale-90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-black/90 uppercase tracking-widest">Game Session</h2>
          <p className="text-[10px] font-medium text-black/40">#{game.id.toUpperCase()}</p>
        </div>
        <button aria-label="Share game" className="w-10 h-10 glass rounded-full flex items-center justify-center text-primary active:scale-90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none">
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      {/* Game Header Info */}
      <section className="px-6 relative">
        <div className="absolute inset-0 px-6 -top-4 opacity-50">
          <div className="w-full h-32 rounded-[32px] overflow-hidden">
            <img 
              src={game.sport.toLowerCase().includes('basketball') ? "https://images.unsplash.com/photo-1646250661461-d561ae2ec8ee?q=80&w=400&auto=format&fit=crop" : 
                   game.sport.toLowerCase().includes('soccer') ? "https://images.unsplash.com/photo-1761833654777-cb9f4cc34b5a?q=80&w=400&auto=format&fit=crop" :
                   "https://images.unsplash.com/photo-1622455373881-62836f4708d2?q=80&w=400&auto=format&fit=crop"} 
              alt="Background" 
              className="w-full h-full object-cover blur-sm"
            />
          </div>
        </div>
        <div className="ios-card flex gap-4 p-5 relative z-10 mt-12 shadow-2xl">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
            style={{ backgroundColor: game.sportColor }}
          >
            <SportIcon sport={game.sport} className="w-9 h-9" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold tracking-tight text-black/90 truncate pr-2">{game.title}</h3>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                game.status === 'proposal' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {game.status}
              </span>
            </div>
            <p className="text-xs font-medium text-black/40 mt-1">{group?.name} • {game.gameType}</p>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-black/20" />
                <span className="text-xs font-bold text-black/60">{game.currentPlayers}/{game.maxPlayers} Spots</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CircleDollarSign className="w-3.5 h-3.5 text-black/20" />
                <span className="text-xs font-bold text-black/60">${game.perPersonCost.toFixed(2)} Fee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Countdown Timer */}
      {game.status === "proposal" && (
        <section className="px-6">
          <div className="ios-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 p-6 text-center space-y-4">
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Voting Closes In</p>
            <div className="flex justify-center items-center gap-3">
              {[
                { val: hours, label: "Hrs" },
                { val: minutes, label: "Min" },
                { val: seconds, label: "Sec" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="space-y-1">
                    <div className="text-4xl font-black text-primary tracking-tighter tabular-nums">
                      {pad(item.val)}
                    </div>
                    <p className="text-[8px] font-bold text-primary/40 uppercase tracking-widest">{item.label}</p>
                  </div>
                  {i < 2 && <span className="text-2xl font-black text-primary/20 -mt-4">:</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Time Options */}
      <section className="px-6">
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-xl font-bold text-black/80">Proposed Options</h2>
          <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Vote to Select</span>
        </div>

        <div className="space-y-4">
          {sortedOptions.map((option, index) => {
            const myVote = votes[option.id] ?? null;
            const isConfirmed = game.confirmedOptionId === option.id;
            const isLeading = index === 0 && game.status === "proposal";

            return (
              <div
                key={option.id}
                className={`ios-card !p-0 overflow-hidden transition-all relative ${
                  isConfirmed ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-100' : 
                  isLeading ? 'ring-2 ring-primary shadow-xl shadow-primary/10' : ''
                }`}
              >
                {/* Accent Header */}
                <div className={`px-4 py-2 flex items-center justify-between ${
                  isConfirmed ? 'bg-emerald-500 text-white' : 
                  isLeading ? 'bg-primary text-white' : 'bg-black/5 text-black/40'
                }`}>
                  <div className="flex items-center gap-2">
                    {isConfirmed ? <Check className="w-3.5 h-3.5" /> : isLeading ? <TrendingUp className="w-3.5 h-3.5" /> : null}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {isConfirmed ? 'Confirmed' : isLeading ? 'Leading' : `Option ${index + 1}`}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                    {option.inVotes} In • {option.maybeVotes} Maybe
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Option Content */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="text-[15px] font-bold text-black/80">
                        {option.displayDate} <span className="text-black/40 ml-1 font-medium">{option.startTime} – {option.endTime}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-black/30" />
                      <p className="text-sm font-medium text-black/60 truncate">{option.location}</p>
                    </div>
                  </div>

                  {/* Voters */}
                  <div className="flex items-center gap-3 pt-2 border-t border-black/5">
                    <div className="flex -space-x-2">
                      {option.voterInitials.map((init, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: `hsl(${i * 60}, 60%, 50%)` }}
                        >
                          {init}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">
                      {option.voterInitials.length} Voted
                    </p>
                  </div>

                  {/* Vote Buttons */}
                  {game.status === "proposal" && (
                    <div className="flex gap-2 pt-2">
                      {[
                        { id: 'in', label: "I'm In", icon: Check, color: 'bg-emerald-500' },
                        { id: 'maybe', label: "Maybe", icon: HelpCircle, color: 'bg-amber-500' },
                        { id: 'out', label: "Can't", icon: X, color: 'bg-rose-500' },
                      ].map((v) => {
                        const isSelected = myVote === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => handleVote(option.id, v.id as VoteValue)}
                            className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-95 ${
                              isSelected 
                                ? `${v.color} text-white shadow-lg` 
                                : 'bg-black/5 text-black/40 hover:bg-black/10'
                            }`}
                          >
                            <v.icon className="w-3.5 h-3.5" />
                            <span>{v.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {game.status === "proposal" && (
          <button
            onClick={() => navigate("/create")}
            className="w-full mt-6 py-4 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 flex items-center justify-center gap-2 text-primary font-bold active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Propose New Time</span>
          </button>
        )}
      </section>

      {/* Roster & Availability */}
      <section className="px-6">
        <div className="ios-card space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-black/90">Joined Players</h3>
            <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">{game.currentPlayers}/{game.maxPlayers} Spots</span>
          </div>

          <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${(game.currentPlayers / game.maxPlayers) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: game.maxPlayers }).map((_, i) => {
              const isFilled = i < game.currentPlayers;
              const initials = ["AR", "JK", "TS", "ML", "CT", "RP", "DC", "SW", "SW", "M"];
              return (
                <div key={i} className="aspect-square relative">
                  {isFilled ? (
                    <div 
                      className="w-full h-full rounded-2xl flex items-center justify-center text-[10px] font-bold text-white shadow-sm bg-indigo-500"
                      style={{ backgroundColor: `hsl(${i * 40}, 50%, 45%)` }}
                    >
                      {initials[i] || 'P'}
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-2xl border-2 border-dashed border-black/5 bg-black/[0.02]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cost Detail Section */}
      {game.totalCost > 0 && (
        <section className="px-6">
          <div className="ios-card bg-black/5 border-none p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                <CircleDollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-black/80">Venue Booking</p>
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Cost Breakdown</p>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-black/5 font-medium">
              <div className="flex justify-between text-sm">
                <span className="text-black/40">Court Rental Total</span>
                <span className="text-black/80">${game.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base pt-1 font-bold">
                <span className="text-black/80">Your Split</span>
                <span className="text-primary">${game.perPersonCost.toFixed(2)}</span>
              </div>
            </div>
            <div className="bg-white/50 rounded-xl p-3 flex gap-2 items-center">
              <Info className="w-4 h-4 text-black/20" />
              <p className="text-[10px] font-medium text-black/40">Fees are collected automatically once the game is confirmed.</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Maybe Bottom Sheet ───────────────────────────────────────────────── */}
      {showMaybeSheet && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMaybeSheet(null)}
          />
          <div className="relative w-full max-w-[430px] glass rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mb-8" />
            
            <h3 className="text-2xl font-bold tracking-tight mb-2">What's the status?</h3>
            <p className="text-black/40 font-medium mb-8">Help your group understand your availability.</p>
            
            <div className="space-y-3 mb-8">
              {maybeReasons.map((reason) => {
                const isSelected = maybeReason === reason;
                return (
                  <button
                    key={reason}
                    onClick={() => setMaybeReason(reason)}
                    className={`w-full p-5 rounded-2xl flex items-center justify-between transition-all ${
                      isSelected ? 'bg-primary text-white shadow-lg' : 'bg-black/5 text-black/60'
                    }`}
                  >
                    <span className="font-bold">{reason}</span>
                    {isSelected && <Check className="w-5 h-5" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleMaybeConfirm}
              className="w-full ios-btn-primary py-5 text-lg font-bold"
            >
              Confirm Maybe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
