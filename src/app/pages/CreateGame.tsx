import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Users, 
  Search, 
  ChevronDown, 
  CheckCircle,
  Share2,
  Globe,
  Users2,
  Lock,
  DollarSign,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Smile
} from "lucide-react";
import { sports, players } from "../data/games";
import { SportIcon } from "../components/SportIcon";

type Step = 1 | 2 | 3 | 4 | 5;

interface TimeOption {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: any;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-primary transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/50 backdrop-blur-md border border-black/5 rounded-2xl px-4 py-3.5 text-[15px] font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/20 outline-none transition-all ${Icon ? 'pl-11' : ''}`}
        />
      </div>
    </div>
  );
}

export function CreateGame() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);

  const [selectedSport, setSelectedSport] = useState("");
  const [gameTitle, setGameTitle] = useState("");
  const [address, setAddress] = useState("");
  const [gameType, setGameType] = useState<"Casual" | "Competitive">("Casual");
  const [maxPlayers, setMaxPlayers] = useState("10");

  const [timeOptions, setTimeOptions] = useState<TimeOption[]>([
    { id: "t1", date: "", startTime: "", endTime: "", location: "" },
  ]);

  const [totalCost, setTotalCost] = useState("");
  const [splitCost, setSplitCost] = useState(true);

  const [linkCopied, setLinkCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [visibility, setVisibility] = useState("Public");
  const [created, setCreated] = useState(false);

  const perPerson =
    splitCost && totalCost && selectedPlayers.size > 0
      ? (parseFloat(totalCost) / selectedPlayers.size).toFixed(2)
      : splitCost && totalCost
      ? parseFloat(totalCost).toFixed(2)
      : "0.00";

  const handleBack = () => {
    if (step === 1) navigate(-1);
    else setStep((s) => (s - 1) as Step);
  };
  const handleNext = () => {
    if (step < 5) setStep((s) => (s + 1) as Step);
    else setCreated(true);
  };

  const addTimeOption = () => {
    if (timeOptions.length >= 5) return;
    setTimeOptions((prev) => [
      ...prev,
      { id: `t${Date.now()}`, date: "", startTime: "", endTime: "", location: "" },
    ]);
  };
  const removeTimeOption = (id: string) => {
    if (timeOptions.length <= 1) return;
    setTimeOptions((prev) => prev.filter((o) => o.id !== id));
  };
  const updateTimeOption = (id: string, field: keyof TimeOption, value: string) => {
    setTimeOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const togglePlayer = (pid: string) => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };
  const handleSelectAll = () => {
    if (selectAll) setSelectedPlayers(new Set());
    else setSelectedPlayers(new Set(players.map((p) => p.id)));
    setSelectAll(!selectAll);
  };
  const handleCopyLink = () => {
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stepTitles: Record<Step, string> = {
    1: "Game Details",
    2: "Schedule & Location",
    3: "Costs & Payments",
    4: "Invite Players",
    5: "Review & Post",
  };

  if (created) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="w-24 h-24 rounded-[32px] bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-200">
          <CheckCircle className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Game Created!</h2>
          <p className="text-black/40 font-medium">
            {selectedPlayers.size} players invited to vote on your {timeOptions.length} time options.
          </p>
        </div>
        <div className="w-full space-y-4 pt-4">
          <button
            onClick={() => navigate("/game/game1")}
            className="w-full ios-btn-primary py-4 text-lg"
          >
            View Game Page
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full ios-btn-secondary py-4 text-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-6 pt-4 space-y-4 bg-[#F2F2F7]/80 backdrop-blur-md sticky top-0 z-40 pb-4 border-b border-black/5">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 glass rounded-full flex items-center justify-center text-black/60 active:scale-90 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold tracking-tight">{stepTitles[step]}</h2>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">
              Step {step} of 5
            </span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              {Math.round((step / 5) * 100)}% Complete
            </span>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-6">
        {/* ── STEP 1: Game Details ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="ios-card space-y-4">
              <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest ml-1">
                Select Sport
              </label>
              <div className="grid grid-cols-4 gap-3">
                {sports.map((sport) => {
                  const isSelected = selectedSport === sport.name;
                  return (
                    <button
                      key={sport.name}
                      onClick={() => setSelectedSport(sport.name)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-90 ${
                        isSelected 
                          ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                          : "bg-black/5 text-black/40"
                      }`}
                    >
                      <SportIcon sport={sport.name} className="w-6 h-6" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{sport.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ios-card space-y-5">
              <TextField 
                label="Game Title" 
                value={gameTitle} 
                onChange={setGameTitle} 
                placeholder="e.g. Friday Night Hoops" 
                icon={Trophy}
              />
              <TextField 
                label="Default Address" 
                value={address} 
                onChange={setAddress} 
                placeholder="Where do you usually play?" 
                icon={MapPin}
              />

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest ml-1">
                  Game Intensity
                </label>
                <div className="flex gap-3">
                  {(["Casual", "Competitive"] as const).map((type) => {
                    const isSelected = gameType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setGameType(type)}
                        className={`flex-1 p-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all ${
                          isSelected 
                            ? "bg-primary text-white shadow-lg" 
                            : "bg-black/5 text-black/40"
                        }`}
                      >
                        {type === "Casual" ? <Smile className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                        <span>{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <TextField 
                label="Max Players" 
                value={maxPlayers} 
                onChange={setMaxPlayers} 
                type="number" 
                icon={Users}
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Time & Location ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-primary/5 rounded-2xl p-4 flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-primary">
                Pro tip: Add multiple time options for higher turnout.
              </p>
            </div>

            {timeOptions.map((opt, index) => (
              <div key={opt.id} className="ios-card relative space-y-4">
                <div className="flex justify-between items-center border-b border-black/5 pb-3">
                  <span className="text-sm font-bold text-black/70">Time Option {index + 1}</span>
                  {timeOptions.length > 1 && (
                    <button 
                      onClick={() => removeTimeOption(opt.id)}
                      className="text-rose-500 active:scale-90 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <TextField 
                  label="Date" 
                  value={opt.date} 
                  onChange={(v) => updateTimeOption(opt.id, "date", v)} 
                  type="date" 
                  icon={Calendar}
                />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <TextField 
                      label="Start" 
                      value={opt.startTime} 
                      onChange={(v) => updateTimeOption(opt.id, "startTime", v)} 
                      type="time" 
                      icon={Clock}
                    />
                  </div>
                  <div className="flex-1">
                    <TextField 
                      label="End" 
                      value={opt.endTime} 
                      onChange={(v) => updateTimeOption(opt.id, "endTime", v)} 
                      type="time" 
                      icon={Clock}
                    />
                  </div>
                </div>
                <TextField 
                  label="Specific Location" 
                  value={opt.location} 
                  onChange={(v) => updateTimeOption(opt.id, "location", v)} 
                  placeholder="Court # or exact field" 
                  icon={MapPin}
                />
              </div>
            ))}

            {timeOptions.length < 5 && (
              <button
                onClick={addTimeOption}
                className="w-full py-4 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 flex items-center justify-center gap-2 text-primary font-bold active:scale-[0.98] transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Add Time Option</span>
              </button>
            )}
          </div>
        )}

        {/* ── STEP 3: Costs ─────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="ios-card space-y-6 p-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest ml-1 text-center block">
                  Total Venue Cost
                </label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-black/20 font-bold text-3xl">$</div>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    className="w-full bg-black/5 rounded-[32px] px-12 py-8 text-5xl font-bold text-center outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                <div>
                  <p className="font-bold text-black/80">Split cost among players?</p>
                  <p className="text-[10px] font-medium text-black/40 mt-0.5 uppercase tracking-wider">Automated calculations</p>
                </div>
                <button
                  onClick={() => setSplitCost(!splitCost)}
                  className={`w-14 h-8 rounded-full p-1 transition-all ${splitCost ? 'bg-primary' : 'bg-black/10'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all ${splitCost ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {splitCost && totalCost && (
              <div className="ios-card !bg-primary text-white p-8 text-center space-y-2 shadow-xl shadow-primary/20">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Estimated Split</p>
                <div className="text-5xl font-black">${perPerson}</div>
                <p className="text-xs font-bold uppercase tracking-tighter">Per confirmed player</p>
              </div>
            )}

            {!totalCost && (
              <div className="ios-card bg-emerald-500 text-white p-6 flex items-center gap-4">
                <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center">
                  <Smile className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-none">Free Game!</p>
                  <p className="text-xs opacity-80 mt-1">No venue cost for this session.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Invite Players ─────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="ios-card space-y-4">
              <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest ml-1">
                Share Invitation
              </label>
              <div className="flex gap-3">
                <button
                  onClick={handleCopyLink}
                  className={`flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${
                    linkCopied ? "bg-emerald-500 text-white" : "bg-primary text-white"
                  }`}
                >
                  {linkCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  <span>{linkCopied ? "Copied" : "Copy Link"}</span>
                </button>
                <button className="flex-1 ios-btn-secondary !py-3.5 flex items-center justify-center gap-2">
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            <div className="ios-card !p-0 overflow-hidden">
              <div className="p-4 border-b border-black/5 bg-black/[0.02]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/50 border-none rounded-2xl pl-11 pr-4 py-3 text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="p-4 flex justify-between items-center bg-white/40">
                <span className="text-xs font-bold text-black/40 uppercase tracking-widest">
                  {filteredPlayers.length} Suggested
                </span>
                <button 
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-primary flex items-center gap-1.5"
                >
                  <div className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center ${
                    selectAll ? 'bg-primary border-primary' : 'border-black/20'
                  }`}>
                    {selectAll && <Check className="w-3 h-3 text-white" />}
                  </div>
                  Select All
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                {filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.has(player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                        isSelected ? "bg-primary/5" : "hover:bg-black/5"
                      }`}
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.initials}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-black/90">{player.name}</p>
                        <p className="text-[11px] font-medium text-black/30">
                          {player.gamesPlayed} games • {player.attendanceRate}% in
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                        isSelected ? "bg-primary border-primary" : "border-black/10"
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Review ─────────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="ios-card space-y-4">
              <div className="flex gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: sports.find(s => s.name === selectedSport)?.color || '#007AFF' }}
                >
                  <SportIcon sport={selectedSport} className="w-9 h-9" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold leading-tight">{gameTitle || "Untitled Game"}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-black/5 text-[10px] font-bold text-black/40 uppercase">
                      {selectedSport}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/5 text-[10px] font-bold text-black/40 uppercase">
                      {gameType}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/5 text-[10px] font-bold text-black/40 uppercase">
                      {maxPlayers} Max
                    </span>
                  </div>
                </div>
              </div>
              {address && (
                <div className="flex items-center gap-2 text-black/60 pt-2 border-t border-black/5">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">{address}</span>
                </div>
              )}
            </div>

            <div className="ios-card space-y-4">
              <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest block border-b border-black/5 pb-2">
                Time Proposals
              </label>
              <div className="space-y-3">
                {timeOptions.map((opt, i) => (
                  <div key={opt.id} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-black/80">{opt.date || "Date TBD"} @ {opt.startTime || "Time TBD"}</p>
                      <p className="text-xs font-medium text-black/40">{opt.location || address || "No location set"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ios-card flex justify-between items-center p-6 bg-gradient-to-br from-white/60 to-white/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold">Entry Fee</p>
                  <p className="text-xs text-black/40">Per confirmed player</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary">${totalCost ? perPerson : '0.00'}</p>
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">{totalCost ? 'Split Cost' : 'Free'}</p>
              </div>
            </div>

            <div className="ios-card space-y-4">
              <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest block border-b border-black/5 pb-2">
                Visibility
              </label>
              <div className="flex gap-2">
                {[
                  { id: "Public", icon: Globe },
                  { id: "Group Only", icon: Users2 },
                  { id: "Private", icon: Lock },
                ].map((v) => {
                  const isSelected = visibility === v.id;
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVisibility(v.id)}
                      className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl transition-all ${
                        isSelected 
                          ? "bg-primary text-white shadow-lg" 
                          : "bg-black/5 text-black/40"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{v.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full ios-btn-primary py-5 text-lg shadow-2xl shadow-primary/30 flex items-center justify-center gap-3"
            >
              <Trophy className="w-6 h-6" />
              <span>Create & Send Invites</span>
            </button>
          </div>
        )}

        {/* ── Next Button ──────────────────────────────────────────────────── */}
        {step < 5 && (
          <div className="pt-4">
            <button
              onClick={handleNext}
              className="w-full ios-btn-primary py-4 text-lg font-bold"
            >
              {step === 4 ? "Review Selection" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
