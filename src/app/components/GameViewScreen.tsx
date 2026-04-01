import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Calendar,
  Copy,
  UserPlus
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchGameById,
  autoTransitionGame,
  addGameOption,
  approveGameOption,
  updateGameOption,
  deleteGameOption,
  updateGameVotingDeadline,
  updateGameVisibility,
  cancelGame,
  deleteGame,
  confirmGame,
  unconfirmGame,
  clearVotesForOption,
  castVote,
  deleteVote,
  getUserVotes,
  isGameVotable,
  getMinPlayers,
  removePlayerFromGame,
  type Game,
  type VoteOption,
  type Player,
} from "./gameData";
import { isDemoMode } from "@/lib/supabase";
import { getPlayerStatusForGame, respondToInvite } from "../services/games.service";

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
function CountdownTimer({ deadline, onExpire }: { deadline: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const firedRef = useRef(false);

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
      if (diff <= 0 && !firedRef.current && onExpire) {
        firedRef.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

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
  onShowVoters,
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
  onShowVoters?: () => void;
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

      {/* See who voted */}
      {onShowVoters && (totalIn + totalMaybe + totalOut > 0) && (
        <button
          onClick={onShowVoters}
          className="mt-2 text-label-sm text-on-surface-variant underline underline-offset-2 min-h-[32px]"
        >
          See who voted
        </button>
      )}
    </motion.div>
  );
}

// ─── Roster Section ───────────────────────────────────────
function RosterSection({
  roster,
  maxPlayers,
  isHost,
  onRemovePlayer,
}: {
  roster: Player[];
  maxPlayers: number | null;
  isHost: boolean;
  onRemovePlayer?: (playerId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const visibleRoster = expanded ? roster : roster.slice(0, 4);

  return (
    <div className="bg-surface-container-lowest rounded-md3-large p-4 shadow-md3-1 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-body-md font-medium text-on-surface leading-none">
            Invited Players
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-label-lg font-medium text-primary leading-none">
            {maxPlayers ? `${roster.length}/${maxPlayers}` : `${roster.length} joined`}
          </span>
          {isHost && roster.length > 0 && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-1.5 rounded-md3-full ${isEditing ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}
              title={isEditing ? "Done editing" : "Edit players"}
            >
              {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {maxPlayers ? (
        <div className="w-full h-[6px] rounded-md3-full bg-surface-variant mb-3 overflow-hidden">
          <div
            className="h-full rounded-md3-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (roster.length / maxPlayers) * 100)}%` }}
          />
        </div>
      ) : null}

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
            {isEditing ? (
              <button
                onClick={() => onRemovePlayer?.(player.id)}
                className="w-8 h-8 rounded-md3-full bg-error-container flex items-center justify-center flex-shrink-0 hover:bg-error transition-colors text-on-error-container hover:text-on-error"
                title="Remove player"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-5 h-5 rounded-md3-full bg-primary-container flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-on-primary-container" />
              </div>
            )}
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
  const { user } = useAuth();
  const [game, setGame] = useState<Game | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showHostMenu, setShowHostMenu] = useState(false);
  const isHost = !!game && !!user && game.createdBy === user.id;

  // Form states
  const [showProposeTime, setShowProposeTime] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditTime, setShowEditTime] = useState<VoteOption | null>(null);
  const [showDeadline, setShowDeadline] = useState(false);
  const [showVisibilitySheet, setShowVisibilitySheet] = useState(false);
  const [visibilitySelected, setVisibilitySelected] = useState<"Public" | "Group Only" | "Private">("Public");

  // Propose/Edit form values
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formLocation, setFormLocation] = useState("");

  // Deadline form
  const [deadlineDate, setDeadlineDate] = useState("");

  // Tie-break sheet (Task 6)
  const [showTieBreak, setShowTieBreak] = useState(false);
  const [tiedOptions, setTiedOptions] = useState<VoteOption[]>([]);

  // Min-player warning (Task 5)
  const [showMinPlayerWarning, setShowMinPlayerWarning] = useState<{
    optionId: string;
    inCount: number;
    minRequired: number;
  } | null>(null);

  // Cancel reason sheet (Task 11)
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Voter details modal
  const [selectedOptionForVoters, setSelectedOptionForVoters] = useState<VoteOption | null>(null);

  // Invite gate state
  const [playerStatus, setPlayerStatus] = useState<"invited" | "joined" | "declined" | null>(null);
  const [respondingToInvite, setRespondingToInvite] = useState(false);

  const refreshGame = useCallback(() => {
    if (!id) return;
    fetchGameById(id).then(async (g) => {
      if (g) {
        setGame(g);
        if (user && !isDemoMode()) {
          const status = await getPlayerStatusForGame(id, user.id);
          setPlayerStatus(status);
        }
      }
    });
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    // fetchGameById calls auto_transition_game RPC internally (SECURITY DEFINER),
    // so the game status is always up-to-date regardless of who is viewing.
    fetchGameById(id).then(async (g) => {
      if (g) {
        setGame(g);
        // Load this user's existing votes so buttons reflect prior choices
        if (user && !isDemoMode()) {
          const [existing, status] = await Promise.all([
            getUserVotes(id, user.id),
            getPlayerStatusForGame(id, user.id)
          ]);
          setVotes(existing);
          setPlayerStatus(status);
        }
      }
      setLoading(false);
    });
  }, [id, user]);

  const handleRespondToInvite = async (accept: boolean) => {
    if (!game || !user) return;
    setRespondingToInvite(true);
    const { error } = await respondToInvite(game.id, user.id, accept);
    setRespondingToInvite(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(accept ? "Invite accepted!" : "Invite declined.");
      if (accept) {
        setPlayerStatus("joined");
      } else {
        setPlayerStatus("declined");
        navigate("/");
      }
      refreshGame();
    }
  };

  // Handlers for advanced game operations
  const handleProposeSubmit = async () => {
    if (!game || !formDate || !formStart || !formEnd) return;
    const status = isHost ? "approved" : "pending";
    try {
      await addGameOption(
        game.id,
        { date: formDate, start_time: formStart, end_time: formEnd, location: formLocation || undefined },
        status,
        user?.id,
      );
      setShowProposeTime(false);
      refreshGame();
      toast.success(isHost ? "New time option added!" : "Proposal sent to the host for approval!");
    } catch (e: any) {
      toast.error("Failed to propose time option: " + e.message);
    }
  };

  const handleApproveOption = async (optionId: string) => {
    const ok = await approveGameOption(optionId);
    if (ok) { refreshGame(); toast.success("Proposal approved!"); }
    else toast.error("Failed to approve proposal.");
  };

  const handleDeclineOption = async (optionId: string) => {
    const ok = await deleteGameOption(optionId);
    if (ok) { refreshGame(); toast.success("Proposal declined."); }
    else toast.error("Failed to decline proposal.");
  };

  const handleEditSubmit = async () => {
    if (!showEditTime || !formDate || !formStart || !formEnd) return;
    const isMaterialChange =
      formDate !== showEditTime.date ||
      formStart !== showEditTime.startTime ||
      formEnd !== showEditTime.endTime;
    try {
      await updateGameOption(showEditTime.id, {
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        location: formLocation || undefined,
      });
      if (isMaterialChange) {
        await clearVotesForOption(showEditTime.id);
        toast.success("Option updated — votes cleared so players can re-vote.");
      } else {
        toast.success("Option updated successfully!");
      }
      setShowEditTime(null);
      refreshGame();
    } catch (e: any) {
      toast.error("Failed to update option: " + e.message);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    try {
      await deleteGameOption(optionId);
      if (showEditTime?.id === optionId) setShowEditTime(null);
      refreshGame();
      toast.success("Option deleted.");
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

  const handleVisibilitySubmit = async () => {
    if (!game) return;
    try {
      const success = await updateGameVisibility(game.id, visibilitySelected);
      if (success) {
        toast.success("Visibility updated!");
        setShowVisibilitySheet(false);
        refreshGame();
      } else {
        toast.error("Failed to update visibility");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating visibility.");
    }
  };

  // Task 11: cancel with reason sheet
  const handleCancelGame = () => {
    if (!game) return;
    setCancelReason("");
    setShowHostMenu(false);
    setShowCancelSheet(true);
  };

  const handleCancelConfirm = async () => {
    if (!game) return;
    try {
      await cancelGame(game.id, cancelReason || undefined);
      setShowCancelSheet(false);
      refreshGame();
      toast.success("Game cancelled.");
    } catch (e: any) {
      toast.error("Failed to cancel game: " + e.message);
    }
  };

  const handleDeleteGame = async () => {
    if (!game) return;
    if (window.confirm("Are you sure you want to completely delete this game? This cannot be undone and will remove it for all users.")) {
      try {
        const success = await deleteGame(game.id);
        if (!success) throw new Error("Database error");
        setShowHostMenu(false);
        toast.success("Game permanently deleted.");
        navigate("/");
      } catch (e: any) {
        toast.error("Failed to delete game: " + e.message);
      }
    }
  };

  // Task 5: confirm with min-player check
  const handleConfirmWithChecks = useCallback(async (optionId: string) => {
    if (!game) return;
    const opt = game.timeOptions.find((o) => o.id === optionId);
    const inCount = opt?.votes.in.length ?? 0;
    const minRequired = getMinPlayers(game.sport);
    if (inCount < minRequired) {
      setShowMinPlayerWarning({ optionId, inCount, minRequired });
      return;
    }
    try {
      await confirmGame(game.id, optionId);
      refreshGame();
      toast.success("Game confirmed!");
    } catch (e: any) {
      toast.error("Failed to confirm game: " + e.message);
    }
  }, [game, refreshGame]);

  const handleConfirmGame = (optionId: string) => {
    handleConfirmWithChecks(optionId);
  };

  // Task 4: undo confirmation
  const handleUndoConfirm = async () => {
    if (!game || game.status !== "confirmed") return;
    const confirmedOpt = game.timeOptions.find((o) => o.id === game.confirmedOptionId);
    if (confirmedOpt && new Date(confirmedOpt.date + "T00:00") < new Date()) {
      toast.error("Cannot undo — the game date has already passed.");
      return;
    }
    try {
      await unconfirmGame(game.id);
      setShowHostMenu(false);
      refreshGame();
      toast.success("Confirmation undone — back to voting.");
    } catch (e: any) {
      toast.error("Failed to undo confirmation: " + e.message);
    }
  };

  // Deadline expiry → server-side auto-transition, then show tie-break UI if needed
  const handleDeadlineExpiry = useCallback(async () => {
    if (!game || game.status !== "proposal") return;

    if (!isDemoMode()) {
      // auto_transition_game RPC handles cancel and single-winner confirm server-side.
      // Any authenticated user can call it (SECURITY DEFINER bypasses RLS).
      await autoTransitionGame(game.id);
      const updated = await fetchGameById(game.id);
      if (updated) {
        setGame(updated);
        // If still proposal after transition, there's a tie — show tiebreak for host
        if (updated.status === "proposal" && updated.createdBy === game.createdBy) {
          const opts = [...updated.timeOptions].sort((a, b) => b.votes.in.length - a.votes.in.length);
          const maxVotes = opts[0]?.votes.in.length ?? 0;
          if (maxVotes > 0) {
            const tied = opts.filter((o) => o.votes.in.length === maxVotes);
            if (tied.length > 1) {
              setTiedOptions(tied);
              setShowTieBreak(true);
            }
          }
        }
      }
      return;
    }

    // Demo mode: client-side logic only
    const opts = [...game.timeOptions].sort((a, b) => b.votes.in.length - a.votes.in.length);
    const maxVotes = opts.length > 0 ? opts[0].votes.in.length : 0;
    if (maxVotes === 0) {
      toast.info("Voting closed with no attendees — game cancelled.");
      return;
    }
    const topOptions = opts.filter((o) => o.votes.in.length === maxVotes);
    if (topOptions.length === 1) {
      await handleConfirmWithChecks(topOptions[0].id);
    } else {
      setTiedOptions(topOptions);
      setShowTieBreak(true);
    }
  }, [game, handleConfirmWithChecks]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  // User vote state: { optionId -> "in" | "maybe" | "out" }
  const [votes, setVotes] = useState<Record<string, "in" | "maybe" | "out">>({});
  const voteCooldown = useRef<Set<string>>(new Set());

  const handleRemovePlayer = async (playerId: string) => {
    if (!game || !user) return;
    
    // In demo mode or if it works, update local state
    const success = await removePlayerFromGame(game.id, playerId);
    if (success) {
      setGame(prev => prev ? {
        ...prev,
        roster: prev.roster.filter(p => p.id !== playerId)
      } : prev);
      toast.success("Player removed from game.");
    } else {
      toast.error("Failed to remove player.");
    }
  };

  const handleVote = useCallback(
    async (optionId: string, vote: "in" | "maybe" | "out") => {
      // Debounce: ignore rapid clicks on the same option
      if (voteCooldown.current.has(optionId)) return;
      voteCooldown.current.add(optionId);
      setTimeout(() => voteCooldown.current.delete(optionId), 400);

      // Determine the new vote state optimistically
      const prevVotes = votes;
      const isToggleOff = prevVotes[optionId] === vote;

      // Optimistic update — reflect immediately in UI
      setVotes((prev) => {
        if (isToggleOff) {
          const next = { ...prev };
          delete next[optionId];
          return next;
        }
        return { ...prev, [optionId]: vote };
      });

      // Persist to Supabase (no-op in demo mode)
      if (!isDemoMode() && user) {
        const success = isToggleOff
          ? await deleteVote(optionId, user.id)
          : await castVote(optionId, user.id, vote);

        if (!success) {
          // Revert optimistic update on failure
          setVotes(prevVotes);
          toast.error("Failed to save your vote — please try again.");
          return;
        }

        // Refresh game data to get accurate vote counts from DB
        refreshGame();
      }
    },
    [votes, user, refreshGame]
  );

  // Sort options by "in" count descending for proposal status
  // Non-hosts only see approved options in the voting list
  const sortedOptions = useMemo(() => {
    if (!game) return [];
    const opts = game.timeOptions.filter((o) => isHost || (o.status ?? "approved") === "approved");
    if (game.status === "proposal") {
      opts.sort((a, b) => b.votes.in.length - a.votes.in.length);
    }
    return opts;
  }, [game, isHost]);

  // Pending proposals — shown to host only
  const pendingOptions = useMemo(() => {
    if (!game || !isHost) return [];
    return game.timeOptions.filter((o) => (o.status ?? "approved") === "pending");
  }, [game, isHost]);

  // Stable 0-based index by creation order — doesn't shift when votes re-sort the list
  const stableIndexMap = useMemo(() => {
    if (!game) return {} as Record<string, number>;
    return Object.fromEntries(game.timeOptions.map((opt, i) => [opt.id, i]));
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

  // ─── Invite Gate ────────────────────────────────────────
  if (playerStatus === "invited" && !isHost) {
    return (
      <div className="flex flex-col min-h-screen bg-surface max-w-lg mx-auto w-full relative">
        <div className="relative h-[300px] overflow-hidden">
          <ImageWithFallback
            src={game.heroImage}
            alt={game.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-[48px] left-4 w-10 h-10 rounded-md3-full bg-surface/90 flex items-center justify-center min-w-[48px] min-h-[48px] shadow-md"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </button>
        </div>
        <div className="px-6 py-8 flex flex-col items-center flex-1 -mt-10 bg-surface rounded-t-[32px] relative z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
          <div className="w-16 h-16 bg-primary-container rounded-md3-full flex items-center justify-center mb-6 shadow-sm text-3xl">
            {game.sportEmoji}
          </div>
          <h1 className="text-title-lg text-on-surface font-semibold text-center mb-4 leading-tight">
            You've been invited to<br /> {game.title}
          </h1>
          <p className="text-body-lg text-on-surface-variant text-center mb-10 leading-relaxed px-2">
            Accept the invite to view game details, vote on times, and see who else is going.
          </p>

          <div className="w-full space-y-3 mt-auto mb-6">
            <button
              onClick={() => handleRespondToInvite(true)}
              disabled={respondingToInvite}
              className={`w-full h-[56px] text-on-primary rounded-md3-full text-label-lg font-medium shadow-md3-1 flex items-center justify-center gap-2 transition-all ${
                respondingToInvite ? "bg-primary/70 cursor-not-allowed" : "bg-primary hover:shadow-md3-2 active:bg-primary/90"
              }`}
            >
              {respondingToInvite ? "Accepting..." : "Accept Invite"}
            </button>
            <button
              onClick={() => handleRespondToInvite(false)}
              disabled={respondingToInvite}
              className="w-full h-[56px] bg-surface-container text-on-surface rounded-md3-full text-label-lg font-medium shadow-sm hover:bg-surface-container-high transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(game.status);
  const createdByPlayer = null as { avatar: string; name: string } | null;

  return (
    <div className="flex flex-col min-h-screen bg-surface max-w-lg mx-auto w-full">
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
          <button
            onClick={handleShare}
            aria-label="Share game"
            className="w-10 h-10 rounded-md3-full bg-surface/90 flex items-center justify-center min-w-[48px] min-h-[48px] shadow-md"
          >
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
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md3-full text-label-md font-medium leading-none ${
              isHost
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-variant text-on-surface-variant"
            }`}
          >
            {isHost ? "👑 Host" : "🎫 Invitee"}
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
                {game.maxPlayers ? `${game.roster.length}/${game.maxPlayers} players` : `${game.roster.length} players`}
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
          <CountdownTimer deadline={game.votingDeadline} onExpire={handleDeadlineExpiry} />
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

        {/* Cancelled banner with reason (Task 11) */}
        {game.status === "cancelled" && (
          <div className="flex items-start gap-2 bg-error-container rounded-md3-medium px-4 py-3 mb-4">
            <Ban className="w-5 h-5 text-on-error-container flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body-md text-on-error-container font-medium leading-normal">
                This game has been cancelled.
              </p>
              {game.cancellationReason && (
                <p className="text-body-sm text-on-error-container mt-0.5">
                  Reason: {game.cancellationReason}
                </p>
              )}
            </div>
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
            {sortedOptions.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                index={stableIndexMap[option.id] ?? 0}
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
                  setFormLocation(opt.location || "");
                }}
                onShowVoters={() => setSelectedOptionForVoters(option)}
              />
            ))}
          </AnimatePresence>

          {/* Pending Proposals — host only */}
          {isHost && pendingOptions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-title-sm font-medium text-on-surface mb-2 leading-none">
                Pending Proposals ({pendingOptions.length})
              </h3>
              {pendingOptions.map((option) => (
                <motion.div
                  key={option.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-md3-large border-2 border-outline-variant bg-surface-container-low p-4 mb-3"
                >
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                      <span className="text-body-md text-on-surface leading-normal">{formatDate(option.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                      <span className="text-body-md text-on-surface leading-normal">
                        {formatTime(option.startTime)} – {formatTime(option.endTime)}
                      </span>
                    </div>
                    {option.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                        <span className="text-body-md text-on-surface leading-normal">{option.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveOption(option.id)}
                      className="flex-1 h-10 bg-primary text-on-primary text-label-md font-medium rounded-full flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeclineOption(option.id)}
                      className="flex-1 h-10 bg-error-container text-on-error-container text-label-md font-medium rounded-full flex items-center justify-center gap-1.5"
                    >
                      <CircleX className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

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
            {/* Task 10: cost-split warning when no confirmed attendees */}
            {game.status === "confirmed" && game.roster.length === 0 && (
              <div className="flex items-center gap-2 bg-error-container rounded-xl px-3 py-2 mb-3">
                <CircleAlert className="w-4 h-4 text-on-error-container shrink-0" />
                <p className="text-body-sm text-on-error-container">
                  No confirmed attendees — cost split unavailable
                </p>
              </div>
            )}
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
                  {game.roster.length === 0 ? "—" : perPersonCost}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Roster */}
        <RosterSection 
          roster={game.roster} 
          maxPlayers={game.maxPlayers} 
          isHost={isHost}
          onRemovePlayer={handleRemovePlayer}
        />

        {/* Group Info */}
        {game.group && (
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
        )}

        {/* Bottom Action */}
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

      {/* Host Settings Menu Bottom Sheet (Task 7 — status-conditional) */}
      <AnimatePresence>
        {showHostMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHostMenu(false)}
              className="fixed inset-0 bg-black/60 z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              role="dialog"
              aria-modal="true"
              aria-label="Host Options"
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface-container-high rounded-t-[28px] max-h-[85vh] flex flex-col z-[70] shadow-md3-5"
            >
              <div className="p-6 pb-2 shrink-0 border-b border-outline-variant/30 flex flex-col items-center">
                <div className="w-8 h-1 bg-on-surface-variant/40 rounded-full mb-6" />
                <h2 className="text-title-lg font-semibold text-on-surface w-full text-left">Host Options</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pb-safe mb-8 flex flex-col gap-4" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
                {/* Proposal-only actions */}
                {game.status === "proposal" && (
                  <>
                    <button
                      onClick={() => {
                        setShowHostMenu(false);
                        setFormDate(""); setFormStart(""); setFormEnd(""); setFormLocation("");
                        setShowProposeTime(true);
                      }}
                      className="w-full flex items-center p-4 bg-surface rounded-xl shadow-sm text-left gap-3"
                    >
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="text-body-lg font-medium text-on-surface">Propose New Time</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowHostMenu(false);
                        setShowDeadline(true);
                        setDeadlineDate(game.votingDeadline ? new Date(game.votingDeadline).toISOString().slice(0, 16) : "");
                      }}
                      className="w-full flex items-center p-4 bg-surface rounded-xl shadow-sm text-left gap-3"
                    >
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="text-body-lg font-medium text-on-surface">Set / Change Voting Deadline</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setShowHostMenu(false);
                    setVisibilitySelected((game.visibility as "Public" | "Group Only" | "Private") || "Public");
                    setShowVisibilitySheet(true);
                  }}
                  className="w-full flex items-center p-4 bg-surface rounded-xl shadow-sm text-left gap-3"
                >
                  <Settings className="w-5 h-5 text-primary" />
                  <span className="text-body-lg font-medium text-on-surface">Change Visibility</span>
                </button>

                {/* Confirmed-only actions (Task 4 — undo confirm) */}
                {game.status === "confirmed" && (() => {
                  const confirmedOpt = game.timeOptions.find((o) => o.id === game.confirmedOptionId);
                  const canUndo = confirmedOpt ? new Date(confirmedOpt.date + "T00:00") >= new Date() : false;
                  return canUndo ? (
                    <button
                      onClick={handleUndoConfirm}
                      className="w-full flex items-center p-4 bg-surface rounded-xl shadow-sm text-left gap-3"
                    >
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="text-body-lg font-medium text-on-surface">Undo Confirmation</span>
                    </button>
                  ) : null;
                })()}

                <div className="h-px w-full bg-outline-variant" />

                <button
                  onClick={handleCancelGame}
                  className="w-full flex items-center p-4 bg-error-container rounded-xl shadow-sm text-left gap-3"
                >
                  <Ban className="w-5 h-5 text-error" />
                  <span className="text-body-lg font-medium text-on-error-container">Cancel Game</span>
                </button>

                <button
                  onClick={handleDeleteGame}
                  className="w-full flex items-center p-4 bg-error rounded-xl shadow-sm text-left gap-3"
                >
                  <Ban className="w-5 h-5 text-on-error" />
                  <span className="text-body-lg font-medium text-on-error">Delete Game</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cancel Reason Sheet (Task 11) */}
      <AnimatePresence>
        {showCancelSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelSheet(false)}
              className="fixed inset-0 bg-black/60 z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              role="dialog"
              aria-modal="true"
              aria-label="Cancel Game"
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface-container-high rounded-t-[28px] overflow-hidden z-[61] p-6 pb-8 shadow-md3-5"
            >
              <div className="w-8 h-1 bg-on-surface-variant/40 rounded-full mx-auto mb-6" />
              <h2 className="text-title-lg font-semibold text-on-surface mb-2">Cancel Game</h2>
              <p className="text-body-md text-on-surface-variant mb-5">
                Select a reason (optional) — this will be shown to all players.
              </p>
              <div className="flex flex-col gap-3 mb-6">
                {["Weather", "Venue issue", "Not enough players", "Personal"].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setCancelReason(cancelReason === reason ? "" : reason)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-colors ${
                      cancelReason === reason
                        ? "border-error bg-error-container text-on-error-container"
                        : "border-outline-variant bg-surface text-on-surface"
                    }`}
                  >
                    <span className="text-body-md font-medium">{reason}</span>
                    {cancelReason === reason && <CheckCircle2 className="w-5 h-5 text-error" />}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCancelConfirm}
                className="w-full h-12 bg-error text-on-error rounded-full font-medium text-label-lg"
              >
                Confirm Cancellation
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tie-break Sheet (Task 6) */}
      <AnimatePresence>
        {showTieBreak && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTieBreak(false)}
              className="fixed inset-0 bg-black/60 z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              role="dialog"
              aria-modal="true"
              aria-label="Tie Breaker"
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface-container-high rounded-t-[28px] overflow-hidden z-[61] p-6 pb-8 shadow-md3-5"
            >
              <div className="w-8 h-1 bg-on-surface-variant/40 rounded-full mx-auto mb-6" />
              <h2 className="text-title-lg font-semibold text-on-surface mb-2">Tie Breaker</h2>
              <p className="text-body-md text-on-surface-variant mb-5">
                Multiple options tied. Pick the winning time slot.
              </p>
              <div className="flex flex-col gap-3">
                {tiedOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={async () => {
                      await handleConfirmWithChecks(opt.id);
                      setShowTieBreak(false);
                    }}
                    className="w-full flex flex-col p-4 bg-surface rounded-xl border-2 border-outline text-left gap-1 hover:border-primary transition-colors"
                  >
                    <span className="text-body-md font-semibold text-on-surface">{formatDate(opt.date)}</span>
                    <span className="text-body-sm text-on-surface-variant">
                      {formatTime(opt.startTime)} – {formatTime(opt.endTime)}
                    </span>
                    {opt.location && (
                      <span className="text-body-sm text-on-surface-variant">{opt.location}</span>
                    )}
                    <span className="text-label-md text-primary font-medium mt-1">
                      {opt.votes.in.length} confirmed In
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Min-player Warning Dialog (Task 5) */}
      <AnimatePresence>
        {showMinPlayerWarning && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMinPlayerWarning(null)}
              className="fixed inset-0 bg-black/60 z-[60]"
            />
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                role="alertdialog"
                aria-modal="true"
                aria-label="Minimum players warning"
                className="bg-surface rounded-3xl p-6 w-full max-w-sm shadow-md3-5"
              >
                <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-on-tertiary-container" />
                </div>
                <h3 className="text-title-lg font-semibold text-on-surface text-center mb-2">
                  Low Player Count
                </h3>
                <p className="text-body-md text-on-surface-variant text-center mb-6">
                  Only <span className="font-semibold text-on-surface">{showMinPlayerWarning.inCount}</span> of{" "}
                  <span className="font-semibold text-on-surface">{showMinPlayerWarning.minRequired}</span> minimum
                  players have confirmed. Confirm anyway?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMinPlayerWarning(null)}
                    className="flex-1 h-12 rounded-full border-2 border-outline text-label-lg font-medium text-on-surface"
                  >
                    Wait
                  </button>
                  <button
                    onClick={async () => {
                      const { optionId } = showMinPlayerWarning;
                      setShowMinPlayerWarning(null);
                      try {
                        await confirmGame(game!.id, optionId);
                        refreshGame();
                        toast.success("Game confirmed!");
                      } catch (e: any) {
                        toast.error("Failed to confirm: " + e.message);
                      }
                    }}
                    className="flex-1 h-12 bg-primary text-on-primary rounded-full text-label-lg font-medium"
                  >
                    Confirm Anyway
                  </button>
                </div>
              </motion.div>
            </div>
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

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface rounded-3xl p-6 w-full max-w-sm shadow-md3-5 z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-title-lg font-semibold text-on-surface">Share Game</h2>
                <button onClick={() => setShowShareModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface-variant transition-colors active:scale-95">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (game?.visibility === "Public") {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Game link copied!");
                      setShowShareModal(false);
                    }
                  }}
                  disabled={game?.visibility !== "Public"}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors ${game?.visibility !== "Public" ? "bg-surface-variant/50 opacity-50 cursor-not-allowed" : "bg-surface-variant hover:bg-surface-variant/80 active:bg-surface-variant/60"}`}
                >
                  <div className="w-10 h-10 rounded-full bg-on-surface/5 flex items-center justify-center">
                    <Copy className="w-5 h-5 text-on-surface" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-on-surface text-body-lg">Copy link</p>
                    <p className="text-body-sm text-on-surface-variant">
                      {game?.visibility !== "Public" ? "Requires public open access game" : "Anyone with the link can join"}
                    </p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    toast.success("Direct invite opened!");
                    setShowShareModal(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-variant text-left hover:bg-surface-variant/80 active:bg-surface-variant/60 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-on-surface/5 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-on-surface" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-on-surface text-body-lg">Direct invite</p>
                    <p className="text-body-sm text-on-surface-variant">Send an invite to specific players</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    toast.success("Group invite opened!");
                    setShowShareModal(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-variant text-left hover:bg-surface-variant/80 active:bg-surface-variant/60 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-on-surface/5 flex items-center justify-center">
                    <Users className="w-5 h-5 text-on-surface" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-on-surface text-body-lg">Group invite</p>
                    <p className="text-body-sm text-on-surface-variant">Share this game directly with a group</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visibility Sheet */}
      <AnimatePresence>
        {showVisibilitySheet && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVisibilitySheet(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface rounded-3xl p-6 w-full max-w-sm shadow-md3-5 z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-title-lg font-semibold text-on-surface">Change Visibility</h2>
                <button onClick={() => setShowVisibilitySheet(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {["Public", "Group Only", "Private"].map((vis) => (
                  <button
                    key={vis}
                    onClick={() => {
                      setVisibilitySelected(vis as any);
                    }}
                    className={`w-full flex items-center p-4 rounded-xl shadow-sm text-left gap-3 ${visibilitySelected === vis ? 'bg-primary text-on-primary ring-2 ring-primary ring-offset-2 ring-offset-surface' : 'bg-surface-container text-on-surface'}`}
                  >
                    <span className="text-body-lg font-medium">{vis}{vis === 'Public' ? ' Game' : ''}</span>
                  </button>
                ))}
                
                <button
                  onClick={handleVisibilitySubmit}
                  className="w-full h-12 bg-primary text-on-primary rounded-full font-medium mt-4 md3-state-primary"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voter Details Modal */}
      <AnimatePresence>
        {selectedOptionForVoters && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOptionForVoters(null)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative bg-surface rounded-t-3xl w-full max-w-lg shadow-md3-5 z-10 pb-safe"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-outline-variant" />
              </div>
              <div className="flex justify-between items-center px-6 py-3">
                <h2 className="text-title-lg font-semibold text-on-surface">Who Voted</h2>
                <button
                  onClick={() => setSelectedOptionForVoters(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface-variant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 pb-8 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                {(
                  [
                    { label: "I'm In", ids: selectedOptionForVoters.votes.in, Icon: CheckCircle2, color: "text-primary" },
                    { label: "Maybe", ids: selectedOptionForVoters.votes.maybe, Icon: CircleAlert, color: "text-secondary" },
                    { label: "Can't", ids: selectedOptionForVoters.votes.out, Icon: CircleX, color: "text-error" },
                  ] as const
                ).map(({ label, ids, Icon, color }) => (
                  <div key={label}>
                    <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-label-md font-medium leading-none">{label} · {ids.length}</span>
                    </div>
                    {ids.length === 0 ? (
                      <p className="text-body-sm text-on-surface-variant pl-1">No votes yet</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {ids.map((uid) => {
                          const player = game?.roster.find((p) => p.id === uid);
                          const name = player?.name ?? uid;
                          return (
                            <div key={uid} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-label-sm font-medium text-on-primary-container flex-shrink-0">
                                {name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-body-md text-on-surface leading-none">{name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
