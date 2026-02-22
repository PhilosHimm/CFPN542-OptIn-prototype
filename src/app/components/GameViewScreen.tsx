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
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import {
  getGameById,
  getPlayerById,
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
        bg: "bg-[#FFF3E0]",
        text: "text-[#E65100]",
        dot: "bg-[#E65100]",
      };
    case "confirmed":
      return {
        label: "Confirmed",
        bg: "bg-[#E8F5E9]",
        text: "text-[#2D7A3A]",
        dot: "bg-[#2D7A3A]",
      };
    case "completed":
      return {
        label: "Completed",
        bg: "bg-[#F5F5F5]",
        text: "text-[#757575]",
        dot: "bg-[#757575]",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        bg: "bg-[#FFEBEE]",
        text: "text-[#B3261E]",
        dot: "bg-[#B3261E]",
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
    <div className="flex items-center gap-2 bg-[#FFF3E0] rounded-[12px] px-4 py-3 mb-4">
      <Timer className="w-5 h-5 text-[#E65100] flex-shrink-0" />
      <div className="flex-1">
        <p className="text-[12px] text-[#E65100] leading-none mb-0.5 font-medium">
          Voting closes in
        </p>
        <p className="text-[20px] font-medium text-[#E65100] leading-tight tracking-wider font-mono">
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
      activeBg: "bg-[#2D7A3A]",
      activeText: "text-white",
      inactiveBg: "bg-[#E8F5E9]",
      inactiveText: "text-[#2D7A3A]",
      inactiveBorder: "border-[#2D7A3A]",
    },
    maybe: {
      label: "Maybe",
      icon: CircleAlert,
      activeBg: "bg-[#F9A825]",
      activeText: "text-white",
      inactiveBg: "bg-[#FFF8E1]",
      inactiveText: "text-[#F9A825]",
      inactiveBorder: "border-[#F9A825]",
    },
    out: {
      label: "Can't",
      icon: CircleX,
      activeBg: "bg-[#B3261E]",
      activeText: "text-white",
      inactiveBg: "bg-[#FFEBEE]",
      inactiveText: "text-[#B3261E]",
      inactiveBorder: "border-[#B3261E]",
    },
  }[type];

  const Icon = config.icon;

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[12px] border-2 transition-all min-h-[48px] ${
        disabled
          ? "opacity-50 cursor-not-allowed border-[#E0E0E0] bg-[#F5F5F5]"
          : isActive
          ? `${config.activeBg} ${config.activeText} border-transparent`
          : `${config.inactiveBg} ${config.inactiveText} ${config.inactiveBorder}`
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[12px] font-medium leading-none">{config.label}</span>
      <span className="text-[11px] leading-none opacity-80">{count}</span>
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
      {visible.map((pid, i) => {
        const player = getPlayerById(pid);
        if (!player) return null;
        return (
          <div
            key={pid}
            className="w-[28px] h-[28px] rounded-full border-2 border-white overflow-hidden flex-shrink-0"
            style={{ marginLeft: i > 0 ? -8 : 0, zIndex: visible.length - i }}
          >
            <ImageWithFallback
              src={player.avatar}
              alt={player.name}
              className="w-full h-full object-cover"
            />
          </div>
        );
      })}
      {extra > 0 && (
        <div
          className="w-[28px] h-[28px] rounded-full bg-[#E0E0E0] flex items-center justify-center border-2 border-white flex-shrink-0"
          style={{ marginLeft: -8 }}
        >
          <span className="text-[10px] font-medium text-[#49454F] leading-none">
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
}: {
  option: VoteOption;
  index: number;
  isWinner: boolean;
  isConfirmed: boolean;
  isReadOnly: boolean;
  userVote: "in" | "maybe" | "out" | null;
  onVote: (optionId: string, vote: "in" | "maybe" | "out") => void;
}) {
  const totalIn = option.votes.in.length;
  const totalMaybe = option.votes.maybe.length;
  const totalOut = option.votes.out.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-[16px] border-2 p-4 mb-3 transition-colors ${
        isWinner
          ? "border-[#2D7A3A] bg-[rgba(45,122,58,0.04)]"
          : isConfirmed && !isWinner
          ? "border-[#E0E0E0] bg-[#FAFAFA] opacity-60"
          : "border-[#79747E] bg-white"
      }`}
    >
      {/* Option header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isWinner && (
            <div className="w-5 h-5 rounded-full bg-[#2D7A3A] flex items-center justify-center flex-shrink-0">
              <Trophy className="w-3 h-3 text-white" />
            </div>
          )}
          <span className="text-[13px] font-medium text-[#2D7A3A] leading-none">
            Option {index + 1}
            {isWinner ? " \u2014 Winner" : ""}
          </span>
        </div>
        <span className="text-[12px] text-[#49454F] leading-none font-medium">
          {totalIn} In
        </span>
      </div>

      {/* Date & Time */}
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#49454F] flex-shrink-0" />
          <span className="text-[14px] text-[#1C1B1F] leading-normal">
            {formatDate(option.date)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#49454F] flex-shrink-0" />
          <span className="text-[14px] text-[#1C1B1F] leading-normal">
            {formatTime(option.startTime)} \u2013 {formatTime(option.endTime)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#49454F] flex-shrink-0" />
          <span className="text-[14px] text-[#1C1B1F] leading-normal">
            {option.location}
          </span>
        </div>
      </div>

      {/* Voter Avatars */}
      {option.votes.in.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <AvatarStack playerIds={option.votes.in} />
          {option.votes.in.length > 0 && (
            <span className="text-[11px] text-[#49454F] leading-none">
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
            <CheckCircle2 className="w-4 h-4 text-[#2D7A3A]" />
            <span className="text-[12px] text-[#2D7A3A] font-medium leading-none">
              {totalIn} In
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CircleAlert className="w-4 h-4 text-[#F9A825]" />
            <span className="text-[12px] text-[#F9A825] font-medium leading-none">
              {totalMaybe} Maybe
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CircleX className="w-4 h-4 text-[#B3261E]" />
            <span className="text-[12px] text-[#B3261E] font-medium leading-none">
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
    <div className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2D7A3A]" />
          <h3 className="text-[14px] font-medium text-[#1C1B1F] leading-none">
            Roster
          </h3>
        </div>
        <span className="text-[13px] font-medium text-[#2D7A3A] leading-none">
          {roster.length}/{maxPlayers}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-[6px] rounded-full bg-[#E0E0E0] mb-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#2D7A3A] transition-all"
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
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
            <span className="text-[14px] text-[#1C1B1F] leading-none flex-1">
              {player.name}
            </span>
            <div className="w-5 h-5 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2D7A3A]" />
            </div>
          </div>
        ))}
      </div>

      {/* Show more/less */}
      {roster.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 pt-2 mt-1 border-t border-[rgba(0,0,0,0.06)] min-h-[48px]"
        >
          <span className="text-[13px] text-[#2D7A3A] font-medium leading-none">
            {expanded ? "Show less" : `Show all ${roster.length} players`}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[#2D7A3A]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#2D7A3A]" />
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
  const game = getGameById(id || "");

  // User vote state: { optionId -> "in" | "maybe" | "out" }
  const [votes, setVotes] = useState<Record<string, "in" | "maybe" | "out">>({});

  // Pre-populate votes for the current user (simulate as p1)
  useEffect(() => {
    if (!game) return;
    const userVotes: Record<string, "in" | "maybe" | "out"> = {};
    game.timeOptions.forEach((opt) => {
      if (opt.votes.in.includes("p1")) userVotes[opt.id] = "in";
      else if (opt.votes.maybe.includes("p1")) userVotes[opt.id] = "maybe";
      else if (opt.votes.out.includes("p1")) userVotes[opt.id] = "out";
    });
    setVotes(userVotes);
  }, [game]);

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

  // ─── 404 ────────────────────────────────────────────────
  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="text-[16px] text-[#49454F] mb-4">Game not found.</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-[#2D7A3A] text-white rounded-full text-[14px] font-medium min-h-[48px]"
        >
          Go Home
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(game.status);
  const createdByPlayer = getPlayerById(game.createdBy);

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBFE]">
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
          className="absolute top-[48px] left-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center min-w-[48px] min-h-[48px] shadow-md"
        >
          <ArrowLeft className="w-5 h-5 text-[#1C1B1F]" />
        </button>

        {/* Share button */}
        <button className="absolute top-[48px] right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center min-w-[48px] min-h-[48px] shadow-md">
          <Share2 className="w-5 h-5 text-[#1C1B1F]" />
        </button>

        {/* Title on hero */}
        <div className="absolute bottom-4 left-4 right-4">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium mb-2 ${statusConfig.bg} ${statusConfig.text}`}
          >
            {statusConfig.label}
          </span>
          <h1 className="text-[22px] font-medium text-white leading-tight drop-shadow-md">
            {game.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-6">
        {/* Quick Info Row */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F5] rounded-full">
            <span className="text-[14px] leading-none">{game.sportEmoji}</span>
            <span className="text-[12px] font-medium text-[#1C1B1F] leading-none">
              {game.sport}
            </span>
          </span>
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-medium leading-none ${
              game.gameType === "competitive"
                ? "bg-[#FFF3E0] text-[#E65100]"
                : "bg-[#E8F5E9] text-[#2D7A3A]"
            }`}
          >
            {game.gameType === "competitive" ? "\uD83C\uDFC6 Competitive" : "\uD83C\uDF89 Casual"}
          </span>
          {game.totalCost > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F5E9] rounded-full">
              <DollarSign className="w-3.5 h-3.5 text-[#2D7A3A]" />
              <span className="text-[12px] font-medium text-[#2D7A3A] leading-none">
                {perPersonCost} / person
              </span>
            </span>
          )}
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#49454F] flex-shrink-0" />
              <span className="text-[14px] text-[#1C1B1F] leading-normal">
                {game.location}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-[#49454F] flex-shrink-0" />
              <span className="text-[14px] text-[#1C1B1F] leading-normal">
                {game.date}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#49454F] flex-shrink-0" />
              <span className="text-[14px] text-[#1C1B1F] leading-normal">
                {game.time}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#49454F] flex-shrink-0" />
              <span className="text-[14px] text-[#1C1B1F] leading-normal">
                {game.roster.length}/{game.maxPlayers} players
              </span>
            </div>
            {createdByPlayer && (
              <div className="flex items-center gap-3 pt-1 mt-1 border-t border-[rgba(0,0,0,0.06)]">
                <ImageWithFallback
                  src={createdByPlayer.avatar}
                  alt={createdByPlayer.name}
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                />
                <span className="text-[12px] text-[#49454F] leading-none">
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
          <div className="flex items-center gap-2 bg-[#E8F5E9] rounded-[12px] px-4 py-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[#2D7A3A] flex-shrink-0" />
            <p className="text-[14px] text-[#2D7A3A] font-medium leading-normal">
              This game is confirmed! See you there.
            </p>
          </div>
        )}

        {/* Completed banner */}
        {game.status === "completed" && (
          <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-[12px] px-4 py-3 mb-4">
            <Trophy className="w-5 h-5 text-[#757575] flex-shrink-0" />
            <p className="text-[14px] text-[#757575] font-medium leading-normal">
              This game has been completed. Thanks for playing!
            </p>
          </div>
        )}

        {/* Time Options Section */}
        <div className="mb-4">
          <h2 className="text-[16px] font-medium text-[#1C1B1F] mb-3 leading-none">
            {game.status === "proposal"
              ? "Vote on a Time"
              : game.status === "confirmed"
              ? "Game Time Options"
              : "Final Results"}
          </h2>

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
                isReadOnly={isReadOnly || isConfirmed}
                userVote={votes[option.id] || null}
                onVote={handleVote}
              />
            ))}
          </AnimatePresence>

          {/* Propose new time */}
          {game.status === "proposal" && (
            <button className="w-full text-center py-3 text-[13px] text-[#2D7A3A] font-medium min-h-[48px]">
              + Propose a new time
            </button>
          )}
        </div>

        {/* Cost Breakdown */}
        {game.totalCost > 0 && (
          <div className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-[#2D7A3A]" />
              <h3 className="text-[14px] font-medium text-[#1C1B1F] leading-none">
                Cost Breakdown
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-[13px] text-[#49454F] leading-normal">
                  Total Venue Cost
                </span>
                <span className="text-[14px] text-[#1C1B1F] font-medium leading-normal">
                  ${game.totalCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-[#49454F] leading-normal">
                  Split
                </span>
                <span className="text-[14px] text-[#1C1B1F] leading-normal">
                  {game.splitCost ? "Equally" : "No split"}
                </span>
              </div>
              <div className="border-t border-[rgba(0,0,0,0.06)] pt-2 mt-1 flex justify-between">
                <span className="text-[14px] text-[#2D7A3A] font-medium leading-normal">
                  Per Person
                </span>
                <span className="text-[16px] text-[#2D7A3A] font-medium leading-normal">
                  {perPersonCost}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Roster */}
        <RosterSection roster={game.roster} maxPlayers={game.maxPlayers} />

        {/* Group Info */}
        <div className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] text-[#49454F] mb-1 leading-none">
                Group
              </p>
              <p className="text-[14px] font-medium text-[#1C1B1F] leading-none">
                {game.group}
              </p>
            </div>
            <button className="px-4 py-2 rounded-full bg-[#E8F5E9] text-[13px] font-medium text-[#2D7A3A] min-h-[48px]">
              View Group
            </button>
          </div>
        </div>

        {/* Bottom Action */}
        {game.status === "proposal" && (
          <button className="w-full h-[52px] bg-[#2D7A3A] text-white rounded-full text-[14px] font-medium shadow-md hover:bg-[#236B2F] active:bg-[#1B5724] transition-colors min-h-[52px]">
            Confirm My Votes
          </button>
        )}
        {isConfirmed && (
          <div className="flex gap-3">
            <button className="flex-1 h-[52px] bg-[#2D7A3A] text-white rounded-full text-[14px] font-medium shadow-md hover:bg-[#236B2F] transition-colors min-h-[52px]">
              I'm Attending
            </button>
            <button className="h-[52px] px-5 rounded-full border-2 border-[#79747E] text-[14px] font-medium text-[#49454F] min-h-[52px]">
              Can't Make It
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
