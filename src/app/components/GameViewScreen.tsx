import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CalendarDays,
  Users,
  DollarSign,
  Share2,
  Timer,
  CheckCircle2,
  CircleAlert,
  CircleX,
  Trophy,
  ChevronDown,
  ChevronUp,
  Settings,
  Edit3,
  Ban,
  X,
  Calendar
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  fetchGameById,
  addGameOption,
  updateGameOption,
  deleteGameOption,
  updateGameVotingDeadline,
  cancelGame,
  confirmGame,
  isGameVotable,
  type Game,
  type VoteOption,
  type Player,
} from "./gameData";

// ─── Helpers ──────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getStatusConfig(status: Game["status"]) {
  switch (status) {
    case "proposal":
      return {
        label: "Voting Phase",
        bg: "bg-tertiary-container",
        text: "text-on-tertiary-container",
        dot: "bg-tertiary",
      };
    case "confirmed":
      return {
        label: "Confirmed",
        bg: "bg-primary-container",
        text: "text-on-primary-container",
        dot: "bg-primary",
      };
    case "completed":
      return {
        label: "Completed",
        bg: "bg-surface-container",
        text: "text-on-surface-variant",
        dot: "bg-on-surface-variant",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        bg: "bg-error-container",
        text: "text-on-error-container",
        dot: "bg-error",
      };
  }
}

// ─── Countdown Timer Component ────────────────────────────
function CountdownTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(deadline).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        hours: Math.floor(diff / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-2 bg-tertiary-container rounded-md3-medium px-4 py-3 mb-4">
      <Timer className="w-5 h-5 text-on-tertiary-container flex-shrink-0" />
      <div className="flex-1">
        <p className="text-label-md text-on-tertiary-container leading-none mb-0.5 font-medium">
          Voting closes in
        </p>
        <p className="text-title-lg font-medium text-on-tertiary-container leading-tight font-mono">
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </p>
      </div>
    </div>
  );
}

// ─── Vote Button ──────────────────────────────────────────
function VoteButton({
  type,
  isActive,
  count,
  onPress,
  disabled,
}: {
  type: "in" | "maybe" | "out";
  isActive: boolean;
  count: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  const config = {
    in: {
      label: "I'm In",
      icon: CheckCircle2,
      activeBg: "bg-primary",
      activeText: "text-on-primary",
      inactiveBg: "bg-primary-container",
      inactiveText: "text-on-primary-container",
      inactiveBorder: "border-primary",
    },
    maybe: {
      label: "Maybe",
      icon: CircleAlert,
      activeBg: "bg-secondary",
      activeText: "text-on-secondary",
      inactiveBg: "bg-secondary-container",
      inactiveText: "text-on-secondary-container",
      inactiveBorder: "border-secondary",
    },
    out: {
      label: "Can't",
      icon: CircleX,
      activeBg: "bg-error",
      activeText: "text-on-error",
      inactiveBg: "bg-error-container",
      inactiveText: "text-on-error-container",
      inactiveBorder: "border-error",
    },
  }[type];

  const Icon = config.icon;

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-md3-medium border-2 transition-colors min-h-[48px] ${
        disabled
          ? "opacity-50 cursor-not-allowed border-outline-variant bg-surface-container"
          : isActive
          ? `${config.activeBg} ${config.activeText} border-transparent`
          : `${config.inactiveBg} ${config.inactiveText} ${config.inactiveBorder}`
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-label-md font-medium leading-none">{config.label}</span>
      <span className="text-label-sm leading-none opacity-80">{count}</span>
    </button>
  );
}

// ─── Avatar Stack ──────────────────────────────────────────
function AvatarStack({
  playerIds,
  max = 5,
}: {
  playerIds: string[];
  max?: number;
}) {
  const visible = playerIds.slice(0, max);
  const extra = playerIds.length - max;

  return (
    <div className="flex items-center">
      {visible.map((pid, i) => (
        <div
          key={pid}
          className="w-[28px] h-[28px] rounded-md3-full border-2 border-surface bg-primary-container flex items-center justify-center flex-shrink-0"
          style={{ marginLeft: i > 0 ? -8 : 0, zIndex: visible.length - i }}
        >
          <span className="text-[10px] font-medium text-on-primary-container leading-none">
            {i + 1}
          </span>
        </div>
      ))}
      {extra > 0 && (
        <div
          className="w-[28px] h-[28px] rounded-md3-full bg-surface-variant flex items-center justify-center border-2 border-surface flex-shrink-0"
          style={{ marginLeft: -8 }}
        >
          <span className="text-label-sm font-medium text-on-surface-variant leading-none">
            +{extra}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Option Card ──────────────────────────────────────────
function OptionCard({
  option,
  index,
  isWinner,
  isConfirmed,
  isReadOnly,
  userVote,
  onVote,
  isHost,
  onEdit,
}: {
  option: VoteOption;
  index: number;
  isWinner: boolean;
  isConfirmed: boolean;
  isReadOnly: boolean;
  userVote: "in" | "maybe" | "out" | null;
  onVote: (optionId: string, vote: "in" | "maybe" | "out") => void;
  isHost?: boolean;
  onEdit?: (option: VoteOption) => void;
}) {
  const totalIn = option.votes.in.length;
  const totalMaybe = option.votes.maybe.length;
  const totalOut = option.votes.out.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.05, 0.7, 0.1, 1.0] }}
      className={`rounded-md3-large border-2 p-4 mb-3 transition-colors relative ${
        isWinner
          ? "border-primary bg-primary/5"
          : isConfirmed && !isWinner
          ? "border-outline-variant bg-surface-container-low opacity-60"
          : "border-outline bg-surface-container-lowest"
      }`}
    >
      {/* Option header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isWinner && (
            <div className="w-5 h-5 rounded-md3-full bg-primary flex items-center justify-center flex-shrink-0">
              <Trophy className="w-3 h-3 text-on-primary" />
            </div>
          )}
          <span className="text-label-lg font-medium text-primary leading-none">
            Option {index + 1}
            {isWinner ? " \u2014 Winner" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isHost && onEdit && (
            <button 
              onClick={() => onEdit(option)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant bg-surface-container bg-opacity-50 hover:bg-opacity-100"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          <span className="text-label-md text-on-surface-variant leading-none font-medium">
            {totalIn} In
          </span>
        </div>
      </div>

      {/* Date & Time */}
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
          <span className="text-body-md text-on-surface leading-normal">
            {formatDate(option.date)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
          <span className="text-body-md text-on-surface leading-normal">
            {formatTime(option.startTime)} – {formatTime(option.endTime)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
          <span className="text-body-md text-on-surface leading-normal">
            {option.location}
          </span>
        </div>
      </div>

      {/* Voter Avatars */}
      {option.votes.in.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <AvatarStack playerIds={option.votes.in} />
          {option.votes.in.length > 0 && (
            <span className="text-label-sm text-on-surface-variant leading-none">
              voted In
            </span>
          )}
        </div>
      )}

      {/* Vote Buttons */}
      {!isReadOnly && (
        <div className="flex gap-2">
          <VoteButton
            type="in"
            isActive={userVote === "in"}
            count={totalIn}
            onPress={() => onVote(option.id, "in")}
          />
          <VoteButton
            type="maybe"
            isActive={userVote === "maybe"}
            count={totalMaybe}
            onPress={() => onVote(option.id, "maybe")}
          />
          <VoteButton
            type="out"
            isActive={userVote === "out"}
            count={totalOut}
            onPress={() => onVote(option.id, "out")}
          />
        </div>
      )}

      {/* Read-only vote counts */}
      {isReadOnly && (
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-label-md text-primary font-medium leading-none">
              {totalIn} In
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CircleAlert className="w-4 h-4 text-secondary" />
            <span className="text-label-md text-secondary font-medium leading-none">
              {totalMaybe} Maybe
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CircleX className="w-4 h-4 text-error" />
            <span className="text-label-md text-error font-medium leading-none">
              {totalOut} Out
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Roster Section ───────────────────────────────────────
function RosterSection({
  roster,
  maxPlayers,
}: {
  roster: Player[];
  maxPlayers: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleRoster = expanded ? roster : roster.slice(0, 4);

  return (
    <div className="bg-surface-container-lowest rounded-md3-large p-4 shadow-md3-1 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-body-md font-medium text-on-surface leading-none">
            Roster
          </h3>
        </div>
        <span className="text-label-lg font-medium text-primary leading-none">
          {roster.length}/{maxPlayers}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-[6px] rounded-md3-full bg-surface-variant mb-3 overflow-hidden">
        <div
          className="h-full rounded-md3-full bg-primary transition-all"
          style={{ width: `${Math.min(100, (roster.length / maxPlayers) * 100)}%` }}
        />
      </div>

      {/* Player list */}
      <div className="flex flex-col gap-0">
        {visibleRoster.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 py-2"
          >
            <ImageWithFallback
              src={player.avatar}
              alt={player.name}
              className="w-9 h-9 rounded-md3-full object-cover flex-shrink-0"
            />
            <span className="text-body-md text-on-surface leading-none flex-1">
              {player.name}
            </span>
            <div className="w-5 h-5 rounded-md3-full bg-primary-container flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-on-primary-container" />
            </div>
          </div>
        ))}
      </div>

      {/* Show more/less */}
      {roster.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 pt-2 mt-1 border-t border-outline-variant/50 min-h-[48px]"
        >
          <span className="text-label-lg text-primary font-medium leading-none">
            {expanded ? "Show less" : `Show all ${roster.length} players`}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-primary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-primary" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────
export function GameViewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showHostMenu, setShowHostMenu] = useState(false);
  const isHost = true; // Hardcoded mock for UI demonstration

  // Form states
  const [showProposeTime, setShowProposeTime] = useState(false);
  const [showEditTime, setShowEditTime] = useState<{ id: string } | null>(null);
  const [showDeadline, setShowDeadline] = useState(false);
  
  // Propose/Edit form values
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formLocation, setFormLocation] = useState("");
  
  // Deadline form
  const [deadlineDate, setDeadlineDate] = useState("");

  const refreshGame = useCallback(() => {
    if (!id) return;
    fetchGameById(id).then((g) => {
      if (g) setGame(g);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchGameById(id).then((g) => {
      if (g) setGame(g);
      setLoading(false);
    });
  }, [id]);

  // Handlers for advanced game operations
  const handleProposeSubmit = async () => {
    if (!game || !formDate || !formStart || !formEnd) return;
    try {
      await addGameOption(game.id, {
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        location: formLocation || undefined,
      });
      setShowProposeTime(false);
      refreshGame();
      toast.success("New time option proposed!");
    } catch (e: any) {
      toast.error("Failed to propose time option: " + e.message);
    }
  };

  const handleEditSubmit = async () => {
    if (!showEditTime || !formDate || !formStart || !formEnd) return;
    try {
      await updateGameOption(showEditTime.id, {
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        location: formLocation || undefined,
      });
      setShowEditTime(null);
      refreshGame();
      toast.success("Option updated successfully!");
    } catch (e: any) {
      toast.error("Failed to update option: " + e.message);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    try {
      await deleteGameOption(optionId);
      if (showEditTime?.id === optionId) setShowEditTime(null);
      refreshGame();
      toast.success("Option deleted!");
    } catch (e: any) {
      toast.error("Failed to delete option: " + e.message);
    }
  };

  const handleDeadlineSubmit = async () => {
    if (!game || !deadlineDate) return;
    try {
      await updateGameVotingDeadline(game.id, deadlineDate);
      setShowDeadline(false);
      refreshGame();
      toast.success("Voting deadline updated!");
    } catch (e: any) {
      toast.error("Failed to update deadline: " + e.message);
    }
  };

  const handleCancelGame = async () => {
    if (!game) return;
    if (confirm("Are you sure you want to cancel the game? All attendees will be notified.")) {
      try {
        await cancelGame(game.id);
        setShowHostMenu(false);
        refreshGame();
        toast.success("Game cancelled.");
      } catch (e: any) {
        toast.error("Failed to cancel game: " + e.message);
      }
    }
  };

  const handleConfirmGame = async (optionId: string) => {
    if (!game) return;
    if (confirm("Confirm this time option? This will lock in the game.")) {
      try {
        await confirmGame(game.id, optionId);
        refreshGame();
        toast.success("Game confirmed!");
      } catch (e: any) {
        toast.error("Failed to confirm game: " + e.message);
      }
    }
  };

  // User vote state: { optionId -> "in" | "maybe" | "out" }
  const [votes, setVotes] = useState<Record<string, "in" | "maybe" | "out">>({});

  const handleVote = useCallback(
    (optionId: string, vote: "in" | "maybe" | "out") => {
      setVotes((prev) => {
        // Toggle off if same vote
        if (prev[optionId] === vote) {
          const next = { ...prev };
          delete next[optionId];
          return next;
        }
        return { ...prev, [optionId]: vote };
      });
    },
    []
  );

  // Sort options by "in" count descending for proposal status
  const sortedOptions = useMemo(() => {
    if (!game) return [];
    const opts = [...game.timeOptions];
    if (game.status === "proposal") {
      opts.sort((a, b) => b.votes.in.length - a.votes.in.length);
    }
    return opts;
  }, [game]);

  const isReadOnly = game?.status === "completed" || game?.status === "cancelled";
  const isConfirmed = game?.status === "confirmed";
  const isVotingClosed = game ? !isGameVotable(game) && game.status === "proposal" : false;

  const perPersonCost = useMemo(() => {
    if (!game || game.totalCost === 0) return "Free";
    if (!game.splitCost) return `$${game.totalCost.toFixed(2)}`;
    const confirmed =
      game.status === "confirmed" && game.confirmedOptionId
        ? game.timeOptions
            .find((o) => o.id === game.confirmedOptionId)
            ?.votes.in.length || 1
        : game.roster.length || 1;
    return `$${(game.totalCost / confirmed).toFixed(2)}`;
  }, [game]);

  // ─── Loading / 404 ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-10 h-10 rounded-md3-full bg-primary-container flex items-center justify-center animate-pulse">
          <span className="text-title-md font-medium text-on-primary-container">O</span>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="text-body-lg text-on-surface-variant mb-4">Game not found.</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-primary text-on-primary rounded-md3-full text-label-lg font-medium min-h-[48px]"
        >
          Go Home
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(game.status);
  const createdByPlayer = null as { avatar: string; name: string } | null;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Hero Image */}
      <div className="relative h-[200px] overflow-hidden">
        <ImageWithFallback
          src={game.heroImage}
          alt={game.title}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-[48px] left-4 w-10 h-10 rounded-md3-full bg-surface/90 flex items-center justify-center min-w-[48px] min-h-[48px] shadow-md"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface" />
        </button>

        <div className="absolute top-[48px] right-4 flex gap-2">
          {/* Settings / Host button */}
          {isHost && (
            <button 
              onClick={() => setShowHostMenu(true)}
              className="w-10 h-10 rounded-md3-full bg-surface/90 flex items-center justify-center min-w-[48px] min-h-[48px] shadow-md"
            >
              <Settings className="w-5 h-5 text-on-surface" />
            </button>
          )}

          {/* Share button */}
          <button className="w-10 h-10 rounded-md3-full bg-surface/90 flex items-center justify-center min-w-[48px] min-h-[48px] shadow-md">
            <Share2 className="w-5 h-5 text-on-surface" />
          </button>
        </div>

        {/* Title on hero */}
        <div className="absolute bottom-4 left-4 right-4">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-md3-full text-label-md font-medium mb-2 ${statusConfig.bg} ${statusConfig.text}`}
          >
            {statusConfig.label}
          </span>
          <h1 className="text-title-lg font-medium text-white leading-tight drop-shadow-md">
            {game.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-6">
        {/* Quick Info Row */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-md3-full">
            <span className="text-body-md leading-none">{game.sportEmoji}</span>
            <span className="text-label-md font-medium text-on-surface leading-none">
              {game.sport}
            </span>
          </span>
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-md3-full text-label-md font-medium leading-none ${
              game.gameType === "competitive"
                ? "bg-tertiary-container text-on-tertiary-container"
                : "bg-primary-container text-on-primary-container"
            }`}
          >
            {game.gameType === "competitive" ? "\uD83C\uDFC6 Competitive" : "\uD83C\uDF89 Casual"}
          </span>
          {game.totalCost > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-container rounded-md3-full">
              <DollarSign className="w-3.5 h-3.5 text-on-primary-container" />
              <span className="text-label-md font-medium text-on-primary-container leading-none">
                {perPersonCost} / person
              </span>
            </span>
          )}
        </div>

        {/* Details Card */}
        <div className="bg-surface-container-lowest rounded-md3-large p-4 shadow-md3-1 mb-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
              <span className="text-body-md text-on-surface leading-normal">
                {game.location}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
              <span className="text-body-md text-on-surface leading-normal">
                {game.date}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
              <span className="text-body-md text-on-surface leading-normal">
                {game.time}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
              <span className="text-body-md text-on-surface leading-normal">
                {game.roster.length}/{game.maxPlayers} players
              </span>
            </div>
            {createdByPlayer && (
              <div className="flex items-center gap-3 pt-1 mt-1 border-t border-outline-variant/50">
                <ImageWithFallback
                  src={createdByPlayer.avatar}
                  alt={createdByPlayer.name}
                  className="w-5 h-5 rounded-md3-full object-cover flex-shrink-0"
                />
                <span className="text-label-md text-on-surface-variant leading-none">
                  Created by {createdByPlayer.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Voting Countdown — proposal only */}
        {game.status === "proposal" && (
          <CountdownTimer deadline={game.votingDeadline} />
        )}

        {/* Confirmed banner */}
        {isConfirmed && (
          <div className="flex items-center gap-2 bg-primary-container rounded-md3-medium px-4 py-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-on-primary-container flex-shrink-0" />
            <p className="text-body-md text-on-primary-container font-medium leading-normal">
              This game is confirmed! See you there.
            </p>
          </div>
        )}

        {/* Completed banner */}
        {game.status === "completed" && (
          <div className="flex items-center gap-2 bg-surface-container rounded-md3-medium px-4 py-3 mb-4">
            <Trophy className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
            <p className="text-body-md text-on-surface-variant font-medium leading-normal">
              This game has been completed. Thanks for playing!
            </p>
          </div>
        )}

        {/* Time Options Section */}
        <div className="mb-4">
          <h2 className="text-title-md font-medium text-on-surface mb-3 leading-none">
            {game.status === "proposal"
              ? isVotingClosed ? "Voting Closed" : "Vote on a Time"
              : game.status === "confirmed"
              ? "Game Time Options"
              : "Final Results"}
          </h2>

          {/* Voting closed banner */}
          {isVotingClosed && (
            <div className="flex items-center gap-2 bg-error-container rounded-md3-medium px-4 py-3 mb-3">
              <Ban className="w-4 h-4 text-on-error-container shrink-0" />
              <p className="text-body-sm text-on-error-container">
                All proposed dates have passed — voting is closed.
              </p>
            </div>
          )}

          <AnimatePresence>
            {sortedOptions.map((option, index) => (
              <OptionCard
                key={option.id}
                option={option}
                index={index}
                isWinner={
                  (isConfirmed || isReadOnly) &&
                  option.id === game.confirmedOptionId
                }
                isConfirmed={isConfirmed}
                isReadOnly={isReadOnly || isConfirmed || isVotingClosed}
                userVote={votes[option.id] || null}
                onVote={handleVote}
                isHost={isHost}
                onEdit={(opt) => {
                  setShowEditTime(opt);
                  setFormDate(opt.date);
                  setFormStart(opt.startTime);
                  setFormEnd(opt.endTime);
                  setFormLocation(""); // We didn't enforce a location field on VoteOption UI yet
                }}
              />
            ))}
          </AnimatePresence>

          {/* Propose new time */}
          {game.status === "proposal" && !isVotingClosed && (
            <button
              onClick={() => {
                setFormDate(""); setFormStart(""); setFormEnd(""); setFormLocation("");
                setShowProposeTime(true);
              }}
              className="w-full text-center py-3 text-label-lg text-primary font-medium min-h-[48px]"
            >
              + Propose a new time
            </button>
          )}

          {/* Confirm Game — host only, proposal with at least one option with votes, voting still open */}
          {isHost && game.status === "proposal" && !isVotingClosed && sortedOptions.length > 0 && sortedOptions[0].votes.in.length > 0 && (
            <button
              onClick={() => handleConfirmGame(sortedOptions[0].id)}
              className="w-full h-12 bg-primary text-on-primary text-label-lg font-medium rounded-md3-full flex items-center justify-center gap-2 mt-2 hover:shadow-md3-1 active:bg-primary/90 transition-all md3-state-primary"
            >
              <CheckCircle2 className="w-5 h-5" />
              Confirm Top Option
            </button>
          )}
        </div>

        {/* Cost Breakdown */}
        {game.totalCost > 0 && (
          <div className="bg-surface-container-lowest rounded-md3-large p-4 shadow-md3-1 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="text-body-md font-medium text-on-surface leading-none">
                Cost Breakdown
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-label-lg text-on-surface-variant leading-normal">
                  Total Venue Cost
                </span>
                <span className="text-body-md text-on-surface font-medium leading-normal">
                  ${game.totalCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-lg text-on-surface-variant leading-normal">
                  Split
                </span>
                <span className="text-body-md text-on-surface leading-normal">
                  {game.splitCost ? "Equally" : "No split"}
                </span>
              </div>
              <div className="border-t border-outline-variant/50 pt-2 mt-1 flex justify-between">
                <span className="text-body-md text-primary font-medium leading-normal">
                  Per Person
                </span>
                <span className="text-title-md text-primary font-medium leading-normal">
                  {perPersonCost}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Roster */}
        <RosterSection roster={game.roster} maxPlayers={game.maxPlayers} />

        {/* Group Info */}
        <div className="bg-surface-container-lowest rounded-md3-large p-4 shadow-md3-1 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label-md text-on-surface-variant mb-1 leading-none">
                Group
              </p>
              <p className="text-body-md font-medium text-on-surface leading-none">
                {game.group}
              </p>
            </div>
            <button className="px-4 py-2 rounded-md3-full bg-secondary-container text-label-lg font-medium text-on-secondary-container min-h-[48px]">
              View Group
            </button>
          </div>
        </div>

        {/* Bottom Action */}
        {game.status === "proposal" && (
          <button className="w-full h-[52px] bg-primary text-on-primary rounded-md3-full text-label-lg font-medium shadow-md3-1 md3-state-primary transition-colors min-h-[52px]">
            Confirm My Votes
          </button>
        )}
        {isConfirmed && (
          <div className="flex gap-3">
            <button className="flex-1 h-[52px] bg-primary text-on-primary rounded-md3-full text-label-lg font-medium shadow-md3-1 md3-state-primary transition-colors min-h-[52px]">
              I'm Attending
            </button>
            <button className="h-[52px] px-5 rounded-md3-full border-2 border-outline text-label-lg font-medium text-on-surface-variant min-h-[52px]">
              Can't Make It
            </button>
          </div>
        )}
      </div>

      {/* Host Settings Menu Bottom Sheet */}
      <AnimatePresence>
        {showHostMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHostMenu(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-surface-container-high rounded-t-[28px] overflow-hidden z-50 p-6 pb-8 shadow-md3-5"
            >
              <div className="w-8 h-1 bg-on-surface-variant/40 rounded-full mx-auto mb-6" />
              <h2 className="text-title-lg font-semibold text-on-surface mb-6">Host Options</h2>
              
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    setShowHostMenu(false);
                    setFormDate(""); setFormStart(""); setFormEnd(""); setFormLocation("");
                    setShowProposeTime(true);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-surface rounded-xl shadow-sm text-left"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-body-lg font-medium text-on-surface">Propose New Time</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowHostMenu(false);
                    setShowDeadline(true);
                    setDeadlineDate(game.votingDeadline ? new Date(game.votingDeadline).toISOString().slice(0, 16) : "");
                  }}
                  className="w-full flex items-center justify-between p-4 bg-surface rounded-xl shadow-sm text-left"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="text-body-lg font-medium text-on-surface">Set/Change Voting Deadline</span>
                  </div>
                </button>

                <div className="h-px w-full bg-outline-variant my-2" />

                <button
                  onClick={handleCancelGame}
                  className="w-full flex items-center justify-between p-4 bg-error-container rounded-xl shadow-sm text-left"
                >
                  <div className="flex items-center gap-3">
                    <Ban className="w-5 h-5 text-error" />
                    <span className="text-body-lg font-medium text-on-error-container">Cancel Game</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Propose a Time Modal */}
      <AnimatePresence>
        {showProposeTime && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProposeTime(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface rounded-3xl p-6 w-full max-w-sm shadow-md3-5 z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-title-lg font-semibold text-on-surface">Propose New Time</h2>
                <button onClick={() => setShowProposeTime(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Date</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full p-3 bg-surface-container rounded-xl text-on-surface" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-label-md text-on-surface-variant mb-1 block">Start Time</label>
                    <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full p-3 bg-surface-container rounded-xl text-on-surface" />
                  </div>
                  <div className="flex-1">
                    <label className="text-label-md text-on-surface-variant mb-1 block">End Time</label>
                    <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full p-3 bg-surface-container rounded-xl text-on-surface" />
                  </div>
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Location / Note (Optional)</label>
                  <input type="text" placeholder="e.g. Court 2" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full p-3 bg-surface-container rounded-xl text-on-surface" />
                </div>
                
                <button
                  onClick={handleProposeSubmit}
                  className="w-full h-12 bg-primary text-on-primary rounded-full font-medium mt-2"
                >
                  Add Option
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit a Time Modal */}
      <AnimatePresence>
        {showEditTime && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditTime(null)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface rounded-3xl p-6 w-full max-w-sm shadow-md3-5 z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-title-lg font-semibold text-on-surface">Edit Time Option</h2>
                <button onClick={() => setShowEditTime(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Date</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full p-3 bg-surface-container rounded-xl text-on-surface" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-label-md text-on-surface-variant mb-1 block">Start Time</label>
                    <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full p-3 bg-surface-container rounded-xl text-on-surface" />
                  </div>
                  <div className="flex-1">
                    <label className="text-label-md text-on-surface-variant mb-1 block">End Time</label>
                    <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full p-3 bg-surface-container rounded-xl text-on-surface" />
                  </div>
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Location / Note</label>
                  <input type="text" placeholder="e.g. Court 2" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full p-3 bg-surface-container rounded-xl text-on-surface" />
                </div>
                
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => handleDeleteOption(showEditTime.id)}
                    className="flex-1 h-12 bg-error-container text-on-error-container rounded-full font-medium"
                  >
                    Delete Option
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    className="flex-1 h-12 bg-primary text-on-primary rounded-full font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Set Voting Deadline Modal */}
      <AnimatePresence>
        {showDeadline && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeadline(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface rounded-3xl p-6 w-full max-w-sm shadow-md3-5 z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-title-lg font-semibold text-on-surface">Update Voting Deadline</h2>
                <button onClick={() => setShowDeadline(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1 block">Deadline (Date & Time)</label>
                  <input
                    type="datetime-local"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full p-3 bg-surface-container rounded-xl text-on-surface"
                  />
                </div>
                
                <button
                  onClick={handleDeadlineSubmit}
                  className="w-full h-12 bg-primary text-on-primary rounded-full font-medium mt-2"
                >
                  Save Deadline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
