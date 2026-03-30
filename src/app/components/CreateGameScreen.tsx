import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  ChevronDown,
  MapPin,
  Plus,
  Trash2,
  CalendarDays,
  Clock,
  DollarSign,
  Link2,
  Share2,
  Search,
  Users,
  Eye,
  Lock,
  CheckCircle2,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import { saveGame } from "./gameData";
import { useAuth } from "../contexts/AuthContext";
import { getGroups } from "../services/games.service";
import { getFriendIds } from "../services/friendships.service";
import { getPlayers } from "../services/profiles.service";

// ─── Constants ─────────────────────────────────────────────
const TOTAL_STEPS = 5;
const sports = [
  "Soccer",
  "Basketball",
  "Volleyball",
  "Tennis",
  "Pickleball",
  "Flag Football",
  "Softball",
  "Hockey",
  "Baseball",
  "Rugby",
  "Badminton",
  "Ultimate Frisbee",
  "Lacrosse",
  "Golf",
  "Cricket",
  "Other / Custom...",
];
const stepLabels = [
  "Details",
  "Times",
  "Costs",
  "Invite",
  "Review",
];

// ─── Types ─────────────────────────────────────────────────
type InvitePlayer = {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  color?: string;
  sport?: string;
};

interface TimeOption {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  address: string;
}

// ─── Mock display helpers ───────────────────────────────────
function formatDateDisplay(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}
function formatTimeDisplay(timeStr: string) {
  if (!timeStr) return "";
  const [h, min] = timeStr.split(":").map(Number);
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ─── Sub-components ────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 px-4 pt-2 pb-3">
      {stepLabels.map((label, i) => {
        const stepNum = i + 1;
        const isComplete = step > stepNum;
        const isCurrent = step === stepNum;
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-[4px] w-full rounded-md3-full transition-colors duration-300 ${
                isComplete || isCurrent
                  ? "bg-primary"
                  : "bg-surface-variant"
              }`}
            />
            <span
              className={`text-label-sm leading-none transition-colors duration-300 ${
                isComplete || isCurrent
                  ? "text-primary font-medium"
                  : "text-on-surface-variant"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OutlinedTextField({
  label,
  placeholder,
  value,
  onChange,
  icon,
  type = "text",
  prefix,
  inputMode,
  mock,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  type?: string;
  prefix?: string;
  inputMode?: "text" | "numeric" | "decimal";
  mock?: boolean;
}) {
  const paddingLeft = icon ? "pl-12" : prefix ? "pl-9" : "pl-4";
  return (
    <div className="mb-4">
      <div className="md3-outlined-field relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant z-10">
            {icon}
          </div>
        )}
        {prefix && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-body-lg text-on-surface-variant z-10">
            {prefix}
          </div>
        )}
        {mock ? (
          <div
            className={`w-full h-[56px] ${paddingLeft} pr-4 rounded-md3-extra-small border border-outline bg-transparent text-body-lg text-on-surface flex items-center`}
          >
            {value}
          </div>
        ) : (
          <input
            type={type}
            inputMode={inputMode}
            placeholder=" "
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full h-[56px] ${paddingLeft} pr-4 rounded-md3-extra-small border border-outline bg-transparent text-body-lg text-on-surface focus:border-primary focus:border-2 focus:outline-none transition-colors peer`}
          />
        )}
        <label
          className={`md3-floating-label ${mock ? "!top-0 !text-xs !text-primary" : ""} ${
            icon ? "!left-12" : prefix ? "!left-9" : ""
          }`}
        >
          {label}
        </label>
      </div>
    </div>
  );
}

function NextButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-[40px] rounded-md3-full text-label-lg font-medium shadow-md3-1 transition-colors ${
        disabled
          ? "bg-surface-variant text-on-surface-variant opacity-38 cursor-not-allowed"
          : "bg-primary text-on-primary md3-state-primary"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────
export function CreateGameScreen() {
  const navigate = useNavigate();
  const { profile, user, isDemo } = useAuth();
  const [searchParams] = useSearchParams();
  const mock = searchParams.get("mock") === "true";
  const initialStep = Math.min(Math.max(parseInt(searchParams.get("step") || "1"), 1), 5);

  const [currentStep, setCurrentStep] = useState(mock ? initialStep : 1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [showSuccess, setShowSuccess] = useState(mock && searchParams.get("step") === "success");

  // Step 1 state
  const [selectedSport, setSelectedSport] = useState(mock ? "Soccer" : "");
  const [customSportName, setCustomSportName] = useState("");
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false);
  const [gameTitle, setGameTitle] = useState(mock ? "Sunday Soccer Showdown" : "");
  const [address, setAddress] = useState(mock ? "Riverside Park, Field 3, Chicago" : "");
  const [gameType, setGameType] = useState<"casual" | "competitive" | "">(mock ? "casual" : "");
  const [maxPlayers, setMaxPlayers] = useState(mock ? "12" : "12");

  // Step 2 state
  const defaultDate = new Date().toISOString().split("T")[0];
  const [timeOptions, setTimeOptions] = useState<TimeOption[]>(
    mock
      ? [
          { id: "1", date: defaultDate, startTime: "10:00", endTime: "12:00", address: "" },
          { id: "2", date: defaultDate, startTime: "12:00", endTime: "14:00", address: "" },
        ]
      : [{ id: "1", date: defaultDate, startTime: "10:00", endTime: "12:00", address: "" }]
  );

  // Step 3 state
  const [totalCost, setTotalCost] = useState(mock ? "60" : "");
  const [splitCost, setSplitCost] = useState(true);

  // Step 4 state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [invitePlayers, setInvitePlayers] = useState<InvitePlayer[]>([]);

  // Step 5 state
  const [visibility, setVisibility] = useState<"public" | "group" | "private" | "">(
    ""
  );
  const [assignedGroup, setAssignedGroup] = useState("");
  const [realGroups, setRealGroups] = useState<{ id: string; name: string }[]>([]);
  const [votingPeriodType, setVotingPeriodType] = useState<number | "custom">(24);
  const [customVotingHours, setCustomVotingHours] = useState<string>("");

  // ─── Load real groups + friends ────────────────────────
  useEffect(() => {
    getGroups().then((gs) => {
      const mapped = gs.map((g) => ({ id: g.id, name: g.name }));
      setRealGroups(mapped);
      if (mapped.length > 0) setAssignedGroup(mapped[0].id);
    });
    if (isDemo) {
      getPlayers().then((allPlayers) => {
        setInvitePlayers(
          allPlayers
            .filter((p) => p.id !== profile?.id)
            .map((p) => ({ id: p.id, name: p.name, initials: p.initials, color: p.color }))
        );
      });
    } else if (profile?.id) {
      getFriendIds(profile.id).then((friendIds) => {
        if (friendIds.length === 0) return;
        getPlayers().then((allPlayers) => {
          setInvitePlayers(
            allPlayers
              .filter((p) => friendIds.includes(p.id))
              .map((p) => ({ id: p.id, name: p.name, initials: p.initials, color: p.color }))
          );
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // ─── Derived ──────────────────────────────────────────
  const perPersonCost = useMemo(() => {
    const cost = parseFloat(totalCost) || 0;
    const players = parseInt(maxPlayers) || 1;
    if (!splitCost || cost === 0) return "0.00";
    return (cost / players).toFixed(2);
  }, [totalCost, splitCost, maxPlayers]);

  const filteredPlayers = useMemo(() => {
    const list = invitePlayers;
    if (!searchQuery.trim()) return list;
    return list.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, invitePlayers]);

  const allSelected = filteredPlayers.length > 0 && selectedPlayers.length === filteredPlayers.length;

  // ─── Handlers ─────────────────────────────────────────
  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    } else {
      navigate(-1);
    }
  }, [currentStep, navigate]);

  const addTimeOption = useCallback(() => {
    if (timeOptions.length >= 5) return;
    setTimeOptions((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        date: "",
        startTime: "",
        endTime: "",
        address: "",
      },
    ]);
  }, [timeOptions.length]);

  const removeTimeOption = useCallback((id: string) => {
    setTimeOptions((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const updateTimeOption = useCallback(
    (id: string, field: keyof TimeOption, value: string) => {
      setTimeOptions((prev) =>
        prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
      );
    },
    []
  );

  const togglePlayer = useCallback((id: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(filteredPlayers.map((p) => p.id));
    }
  }, [allSelected, filteredPlayers]);

  const handleCopyLink = useCallback(() => {
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, []);

  const [createError, setCreateError] = useState<string | null>(null);

  const effectiveSport = selectedSport === "Other / Custom..."
    ? customSportName.trim()
    : selectedSport;

  const handleCreateGame = useCallback(async () => {
    setCreateError(null);
    const result = await saveGame({
      title: gameTitle,
      sport: effectiveSport,
      gameType: gameType as "casual" | "competitive",
      maxPlayers: parseInt(maxPlayers) || 12,
      totalCost: parseFloat(totalCost) || 0,
      location: address,
      groupId: assignedGroup,
      visibility: visibility === "public" ? "Public" : visibility === "group" ? "Group Only" : "Private",
      createdBy: profile?.id || user?.id || "",
      votingPeriodHours: votingPeriodType === "custom" ? parseInt(customVotingHours) || 24 : votingPeriodType,
      timeOptions: timeOptions.map((o) => ({
        date: o.date,
        startTime: o.startTime,
        endTime: o.endTime,
        location: o.address || address,
      })),
      invitedPlayerIds: selectedPlayers,
    });

    if (result.error) {
      setCreateError(result.error);
      return;
    }

    setShowSuccess(true);
    setTimeout(() => {
      navigate("/");
    }, 2000);
  }, [navigate, gameTitle, effectiveSport, gameType, maxPlayers, totalCost, address, assignedGroup, visibility, profile, user, timeOptions, selectedPlayers, votingPeriodType, customVotingHours]);

  // ─── Step validation ──────────────────────────────────
  const isStep1Valid =
    effectiveSport !== "" && gameTitle.trim() !== "" && gameType !== "";
  const isStep2Valid = timeOptions.every(
    (o) => o.date !== "" && o.startTime !== "" && o.endTime !== ""
  );

  // ─── Animation variants ───────────────────────────────
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  // ─── Success overlay ─────────────────────────────────
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: [0.05, 0.7, 0.1, 1.0] }}
          className="w-[80px] h-[80px] rounded-md3-full bg-secondary-container flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-on-secondary-container" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.05, 0.7, 0.1, 1.0] }}
          className="text-headline-sm font-medium text-on-surface mb-2"
        >
          Game Created!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: [0.05, 0.7, 0.1, 1.0] }}
          className="text-body-md text-on-surface-variant text-center"
        >
          Your game proposal has been sent to{" "}
          {selectedPlayers.length > 0
            ? `${selectedPlayers.length} player${
                selectedPlayers.length > 1 ? "s" : ""
              }`
            : "your group"}
          . Voting is now open!
        </motion.p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-surface px-4 pt-[48px] pb-1">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={goBack}
            className="w-10 h-10 rounded-md3-full flex items-center justify-center hover:bg-on-surface/8 active:bg-on-surface/12 transition-colors min-w-[48px] min-h-[48px]"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </button>
          <h1 className="text-title-lg font-medium text-on-surface leading-tight">
            Create Game
          </h1>
          <span className="ml-auto text-label-md text-on-surface-variant">
            {currentStep}/{TOTAL_STEPS}
          </span>
        </div>
        <ProgressBar step={currentStep} />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.05, 0.7, 0.1, 1.0] }}
            className="px-4 pb-6"
          >
            {currentStep === 1 && (
              <StepDetails
                selectedSport={selectedSport}
                setSelectedSport={setSelectedSport}
                customSportName={customSportName}
                setCustomSportName={setCustomSportName}
                sportDropdownOpen={sportDropdownOpen}
                setSportDropdownOpen={setSportDropdownOpen}
                gameTitle={gameTitle}
                setGameTitle={setGameTitle}
                address={address}
                setAddress={setAddress}
                gameType={gameType}
                setGameType={setGameType}
                maxPlayers={maxPlayers}
                setMaxPlayers={setMaxPlayers}
                onNext={goNext}
                isValid={isStep1Valid}
              />
            )}
            {currentStep === 2 && (
              <StepTimeLocation
                timeOptions={timeOptions}
                onAdd={addTimeOption}
                onRemove={removeTimeOption}
                onUpdate={updateTimeOption}
                onNext={goNext}
                isValid={isStep2Valid}
                mock={mock}
              />
            )}
            {currentStep === 3 && (
              <StepCosts
                totalCost={totalCost}
                setTotalCost={setTotalCost}
                splitCost={splitCost}
                setSplitCost={setSplitCost}
                perPersonCost={perPersonCost}
                onNext={goNext}
              />
            )}
            {currentStep === 4 && (
              <StepInvite
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredPlayers={filteredPlayers}
                selectedPlayers={selectedPlayers}
                togglePlayer={togglePlayer}
                allSelected={allSelected}
                toggleSelectAll={toggleSelectAll}
                linkCopied={linkCopied}
                handleCopyLink={handleCopyLink}
                onNext={goNext}
              />
            )}
            {currentStep === 5 && (
              <StepReview
                selectedSport={effectiveSport}
                gameTitle={gameTitle}
                address={address}
                gameType={gameType}
                maxPlayers={maxPlayers}
                timeOptions={timeOptions}
                totalCost={totalCost}
                splitCost={splitCost}
                perPersonCost={perPersonCost}
                selectedPlayers={selectedPlayers}
                invitePlayers={invitePlayers}
                groups={realGroups}
                visibility={visibility}
                setVisibility={setVisibility}
                assignedGroup={assignedGroup}
                setAssignedGroup={setAssignedGroup}
                votingPeriodType={votingPeriodType}
                setVotingPeriodType={setVotingPeriodType}
                customVotingHours={customVotingHours}
                setCustomVotingHours={setCustomVotingHours}
                onSubmit={handleCreateGame}
                error={createError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── STEP 1: Game Details ──────────────────────────────────
function StepDetails({
  selectedSport,
  setSelectedSport,
  customSportName,
  setCustomSportName,
  sportDropdownOpen,
  setSportDropdownOpen,
  gameTitle,
  setGameTitle,
  address,
  setAddress,
  gameType,
  setGameType,
  maxPlayers,
  setMaxPlayers,
  onNext,
  isValid,
  mock,
}: {
  selectedSport: string;
  setSelectedSport: (v: string) => void;
  customSportName: string;
  setCustomSportName: (v: string) => void;
  sportDropdownOpen: boolean;
  setSportDropdownOpen: (v: boolean) => void;
  gameTitle: string;
  setGameTitle: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  gameType: "casual" | "competitive" | "";
  setGameType: (v: "casual" | "competitive") => void;
  maxPlayers: string;
  setMaxPlayers: (v: string) => void;
  onNext: () => void;
  isValid: boolean;
  mock?: boolean;
}) {
  return (
    <>
      <p className="text-body-md text-on-surface-variant mb-5 leading-normal">
        Let's get started. What are we playing?
      </p>

      {/* Sport Dropdown */}
      <div className="mb-4 relative">
        <label className="block text-label-md font-medium text-on-surface-variant mb-1.5 leading-none">
          Sport
        </label>
        <button
          onClick={() => setSportDropdownOpen(!sportDropdownOpen)}
          className="w-full h-[56px] px-4 rounded-md3-extra-small border border-outline bg-transparent flex items-center justify-between text-left hover:border-on-surface transition-colors"
        >
          <span
            className={`text-body-lg ${
              selectedSport ? "text-on-surface" : "text-on-surface-variant"
            }`}
          >
            {selectedSport || "Select Sport"}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-on-surface-variant transition-transform ${
              sportDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {sportDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-md3-extra-small shadow-md3-3 border border-outline-variant z-20 overflow-hidden max-h-60 overflow-y-auto">
            {sports.map((sport) => (
              <button
                key={sport}
                onClick={() => {
                  setSelectedSport(sport);
                  setSportDropdownOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-body-md hover:bg-on-surface/8 transition-colors ${
                  selectedSport === sport
                    ? "bg-secondary-container text-on-secondary-container font-medium"
                    : "text-on-surface"
                }`}
              >
                {sport}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom sport input */}
      {selectedSport === "Other / Custom..." && (
        <div className="mb-4">
          <OutlinedTextField
            label="Sport Name"
            placeholder="e.g. Kickball, Dodgeball..."
            value={customSportName}
            onChange={setCustomSportName}
          />
        </div>
      )}

      {/* Game Title */}
      <OutlinedTextField
        label="Game Title"
        placeholder="e.g. Sunday Soccer Showdown"
        value={gameTitle}
        onChange={setGameTitle}
      />

      {/* Address Field */}
      <OutlinedTextField
        label="Location"
        placeholder="Where is it? Address"
        value={address}
        onChange={setAddress}
        icon={<MapPin className="w-5 h-5 text-on-surface-variant" />}
      />

      {/* Map Placeholder */}
      <div className="mb-5 rounded-md3-medium overflow-hidden h-[140px]">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1707826858461-45968b58532e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwcGFyayUyMG1hcCUyMG92ZXJoZWFkJTIwc2F0ZWxsaXRlJTIwdmlld3xlbnwxfHx8fDE3NzE2MjgxMzJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Map view"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Game Type */}
      <div className="mb-5">
        <h3 className="text-title-sm font-medium text-on-surface mb-3 leading-none">
          Game Type
        </h3>
        <div className="flex gap-3">
          {(
            [
              {
                key: "casual" as const,
                emoji: "🎉",
                label: "Casual",
                sub: "Just for fun",
              },
              {
                key: "competitive" as const,
                emoji: "🏆",
                label: "Competitive",
                sub: "Serious play",
              },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setGameType(item.key)}
              className={`flex-1 py-3 px-4 rounded-md3-medium border text-center transition-all min-h-[48px] ${
                gameType === item.key
                  ? "border-primary bg-secondary-container"
                  : "border-outline bg-surface"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-title-lg leading-none">{item.emoji}</span>
                <span
                  className={`text-label-lg font-medium leading-none ${
                    gameType === item.key ? "text-on-secondary-container" : "text-on-surface"
                  }`}
                >
                  {item.label}
                </span>
                <span className="text-body-sm text-on-surface-variant leading-none">
                  {item.sub}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Max Players */}
      <OutlinedTextField
        label="Max Players"
        placeholder="12"
        value={maxPlayers}
        onChange={setMaxPlayers}
        icon={<Users className="w-5 h-5 text-on-surface-variant" />}
        type="number"
        inputMode="numeric"
      />

      <div className="mt-2">
        <NextButton
          label="Next: Time Slots"
          onClick={onNext}
          disabled={!isValid}
        />
      </div>
    </>
  );
}

// ─── STEP 2: Time & Location ───────────────────────────────
function StepTimeLocation({
  timeOptions,
  onAdd,
  onRemove,
  onUpdate,
  onNext,
  isValid,
  mock,
}: {
  timeOptions: TimeOption[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof TimeOption, value: string) => void;
  onNext: () => void;
  isValid: boolean;
  mock?: boolean;
}) {
  return (
    <>
      <p className="text-body-md text-on-surface-variant mb-5 leading-normal">
        Propose up to 5 date/time options for voting.
      </p>

      {timeOptions.map((option, index) => (
        <div
          key={option.id}
          className="mb-4 p-4 rounded-md3-medium border border-outline bg-surface-container-lowest relative"
        >
          {/* Option header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-body-md font-medium text-primary leading-none">
              Option {index + 1}
            </span>
            {timeOptions.length > 1 && (
              <button
                onClick={() => onRemove(option.id)}
                className="w-8 h-8 min-w-[48px] min-h-[48px] flex items-center justify-center -mr-2 -mt-1"
              >
                <Trash2 className="w-4 h-4 text-error" />
              </button>
            )}
          </div>

          {/* Date */}
          <div className="mb-3">
            <label className="block text-label-md font-medium text-on-surface-variant mb-1 leading-none">
              Date
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <CalendarDays className="w-4 h-4 text-on-surface-variant" />
              </div>
              {mock ? (
                <div className="w-full h-[48px] pl-10 pr-3 rounded-md3-extra-small border border-outline bg-transparent text-body-md text-on-surface flex items-center">
                  {formatDateDisplay(option.date)}
                </div>
              ) : (
                <input
                  type="date"
                  value={option.date}
                  onChange={(e) => onUpdate(option.id, "date", e.target.value)}
                  className="w-full h-[48px] pl-10 pr-3 rounded-md3-extra-small border border-outline bg-transparent text-body-md text-on-surface focus:border-primary focus:border-2 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Time row */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-label-md font-medium text-on-surface-variant mb-1 leading-none">
                Start Time
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Clock className="w-4 h-4 text-on-surface-variant" />
                </div>
                {mock ? (
                  <div className="w-full h-[48px] pl-10 pr-2 rounded-md3-extra-small border border-outline bg-transparent text-body-md text-on-surface flex items-center">
                    {formatTimeDisplay(option.startTime)}
                  </div>
                ) : (
                  <input
                    type="time"
                    value={option.startTime}
                    onChange={(e) =>
                      onUpdate(option.id, "startTime", e.target.value)
                    }
                    className="w-full h-[48px] pl-10 pr-2 rounded-md3-extra-small border border-outline bg-transparent text-body-md text-on-surface focus:border-primary focus:border-2 focus:outline-none"
                  />
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-label-md font-medium text-on-surface-variant mb-1 leading-none">
                End Time
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Clock className="w-4 h-4 text-on-surface-variant" />
                </div>
                {mock ? (
                  <div className="w-full h-[48px] pl-10 pr-2 rounded-md3-extra-small border border-outline bg-transparent text-body-md text-on-surface flex items-center">
                    {formatTimeDisplay(option.endTime)}
                  </div>
                ) : (
                  <input
                    type="time"
                    value={option.endTime}
                    onChange={(e) =>
                      onUpdate(option.id, "endTime", e.target.value)
                    }
                    className="w-full h-[48px] pl-10 pr-2 rounded-md3-extra-small border border-outline bg-transparent text-body-md text-on-surface focus:border-primary focus:border-2 focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Option-specific address */}
          <div>
            <label className="block text-label-md font-medium text-on-surface-variant mb-1 leading-none">
              Venue (optional)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <MapPin className="w-4 h-4 text-on-surface-variant" />
              </div>
              {mock ? (
                <div className="w-full h-[48px] pl-10 pr-3 rounded-md3-extra-small border border-outline bg-transparent text-body-md text-on-surface-variant/50 flex items-center">
                  {option.address || "Same as game location"}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Same as game location"
                  value={option.address}
                  onChange={(e) =>
                    onUpdate(option.id, "address", e.target.value)
                  }
                  className="w-full h-[48px] pl-10 pr-3 rounded-md3-extra-small border border-outline bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:border-2 focus:outline-none"
                />
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add another time */}
      {timeOptions.length < 5 && (
        <button
          onClick={onAdd}
          className="w-full h-[40px] mb-6 rounded-md3-full border border-outline flex items-center justify-center gap-2 text-label-lg font-medium text-primary hover:bg-secondary-container transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add another time ({timeOptions.length}/5)
        </button>
      )}

      <div className="mt-2">
        <NextButton
          label="Next: Costs"
          onClick={onNext}
          disabled={!isValid}
        />
      </div>
    </>
  );
}

// ─── STEP 3: Costs ─────────────────────────────────────────
function StepCosts({
  totalCost,
  setTotalCost,
  splitCost,
  setSplitCost,
  perPersonCost,
  onNext,
}: {
  totalCost: string;
  setTotalCost: (v: string) => void;
  splitCost: boolean;
  setSplitCost: (v: boolean) => void;
  perPersonCost: string;
  onNext: () => void;
}) {
  return (
    <>
      <p className="text-body-md text-on-surface-variant mb-5 leading-normal">
        Add any venue or equipment costs. Players can see the split.
      </p>

      {/* Total Cost */}
      <OutlinedTextField
        label="Total Venue Cost"
        placeholder="0.00"
        value={totalCost}
        onChange={setTotalCost}
        prefix="$"
        type="text"
        inputMode="decimal"
      />

      {/* Split Toggle */}
      <div className="flex items-center justify-between py-4 mb-4 border-b border-outline-variant/50">
        <div>
          <p className="text-body-md font-medium text-on-surface leading-normal">
            Split cost among players?
          </p>
          <p className="text-label-md text-on-surface-variant leading-normal">
            Divide equally among confirmed players
          </p>
        </div>
        <button
          onClick={() => setSplitCost(!splitCost)}
          className="md3-switch min-w-[52px] min-h-[48px]"
          data-checked={splitCost ? "true" : "false"}
          role="switch"
          aria-checked={splitCost}
        >
          <div className="md3-switch-thumb" />
        </button>
      </div>

      {/* Per-person estimate */}
      <div className="bg-primary-container rounded-md3-large p-5 mb-6 flex flex-col items-center gap-1">
        <DollarSign className="w-6 h-6 text-on-primary-container mb-1" />
        <span className="text-label-md text-on-primary-container leading-none">
          Estimated per person
        </span>
        <span className="text-headline-md font-medium text-on-primary-container leading-tight">
          ${perPersonCost}
        </span>
        <span className="text-label-md text-on-primary-container leading-none">
          {splitCost ? "Split equally" : "No split — full amount shown"}
        </span>
      </div>

      {/* Free / Per Player / Fixed Total chips */}
      <div className="mb-6">
        <h3 className="text-title-sm font-medium text-on-surface mb-3 leading-none">
          Cost Type
        </h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Free", value: "" },
            { label: "Per Player $", value: "per" },
            { label: "Fixed Total $", value: "fixed" },
          ].map((chip) => {
            const isActive =
              chip.value === ""
                ? totalCost === "" || totalCost === "0"
                : chip.value === "fixed"
                ? parseFloat(totalCost) > 0 && splitCost
                : parseFloat(totalCost) > 0 && !splitCost;
            return (
              <button
                key={chip.value}
                onClick={() => {
                  if (chip.value === "") {
                    setTotalCost("");
                    setSplitCost(false);
                  } else if (chip.value === "per") {
                    setSplitCost(false);
                  } else {
                    setSplitCost(true);
                  }
                }}
                className={`px-4 py-2 rounded-md3-full border text-label-lg font-medium transition-colors min-h-[32px] ${
                  isActive
                    ? "bg-secondary-container text-on-secondary-container border-transparent"
                    : "bg-surface text-on-surface-variant border-outline"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <NextButton label="Next: Invite Players" onClick={onNext} />
    </>
  );
}

// ─── STEP 4: Invite Players ────────────────────────────────
function StepInvite({
  searchQuery,
  setSearchQuery,
  filteredPlayers,
  selectedPlayers,
  togglePlayer,
  allSelected,
  toggleSelectAll,
  linkCopied,
  handleCopyLink,
  onNext,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filteredPlayers: InvitePlayer[];
  selectedPlayers: string[];
  togglePlayer: (id: string) => void;
  allSelected: boolean;
  toggleSelectAll: () => void;
  linkCopied: boolean;
  handleCopyLink: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <p className="text-body-md text-on-surface-variant mb-5 leading-normal">
        Share the game or invite specific players.
      </p>

      {/* Share methods */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCopyLink}
          className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-md3-medium border transition-all min-h-[48px] ${
            linkCopied
              ? "border-primary bg-secondary-container"
              : "border-outline bg-surface"
          }`}
        >
          {linkCopied ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : (
            <Link2 className="w-5 h-5 text-on-surface-variant" />
          )}
          <span
            className={`text-label-lg font-medium leading-none ${
              linkCopied ? "text-on-secondary-container" : "text-on-surface"
            }`}
          >
            {linkCopied ? "Copied!" : "Copy Link"}
          </span>
        </button>
        <button className="flex-1 flex flex-col items-center gap-2 py-4 rounded-md3-medium border border-outline bg-surface min-h-[48px]">
          <Share2 className="w-5 h-5 text-on-surface-variant" />
          <span className="text-label-lg font-medium text-on-surface leading-none">
            Share
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <Search className="w-5 h-5 text-on-surface-variant" />
        </div>
        <input
          type="text"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-[48px] pl-12 pr-10 rounded-md3-full border border-outline bg-surface text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:border-2 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        )}
      </div>

      {/* Suggested Players header + Select All */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-body-md font-medium text-on-surface leading-none">
          Suggested Players
        </span>
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 min-h-[48px] px-2"
        >
          <span className="text-label-lg text-primary font-medium leading-none">
            {allSelected ? "Deselect All" : "Select All"}
          </span>
          <div
            className={`w-5 h-5 rounded-md3-extra-small border-2 flex items-center justify-center transition-colors ${
              allSelected
                ? "bg-primary border-primary"
                : "border-outline bg-transparent"
            }`}
          >
            {allSelected && (
              <svg
                width="12"
                height="10"
                viewBox="0 0 12 10"
                fill="none"
              >
                <path
                  d="M1 5L4.5 8.5L11 1.5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* Player list */}
      <div className="flex flex-col gap-0 mb-6">
        {filteredPlayers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-on-surface-variant">
            <Users className="w-8 h-8 opacity-40" />
            <p className="text-body-md">No friends yet</p>
            <p className="text-label-md text-center">Add friends first, then invite them to games.</p>
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const isSelected = selectedPlayers.includes(player.id);
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-md3-medium transition-colors min-h-[56px] ${
                  isSelected ? "bg-secondary-container" : "hover:bg-on-surface/8"
                }`}
              >
                {player.avatar ? (
                  <ImageWithFallback
                    src={player.avatar}
                    alt={player.name}
                    className="w-10 h-10 rounded-md3-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-md3-full flex items-center justify-center flex-shrink-0 text-label-lg font-medium text-white"
                    style={{ backgroundColor: player.color || "#6750A4" }}
                  >
                    {player.initials || player.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-body-md font-medium text-on-surface leading-tight">
                    {player.name}
                  </p>
                  {player.sport && (
                    <p className="text-label-md text-on-surface-variant leading-tight">
                      {player.sport}
                    </p>
                  )}
                </div>
                <div
                  className={`w-5 h-5 rounded-md3-extra-small border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-outline bg-transparent"
                  }`}
                >
                  {isSelected && (
                    <svg
                      width="12"
                      height="10"
                      viewBox="0 0 12 10"
                      fill="none"
                    >
                      <path
                        d="M1 5L4.5 8.5L11 1.5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Selected count */}
      {selectedPlayers.length > 0 && (
        <div className="mb-4 text-center">
          <span className="inline-flex items-center px-4 py-1.5 rounded-md3-full bg-secondary-container text-label-lg font-medium text-on-secondary-container">
            {selectedPlayers.length} player
            {selectedPlayers.length > 1 ? "s" : ""} selected
          </span>
        </div>
      )}

      <NextButton label="Next: Review & Create" onClick={onNext} />
    </>
  );
}

// ─── STEP 5: Review & Post ─────────────────────────────────
function StepReview({
  selectedSport,
  gameTitle,
  address,
  gameType,
  maxPlayers,
  timeOptions,
  totalCost,
  splitCost,
  perPersonCost,
  selectedPlayers,
  invitePlayers,
  groups,
  visibility,
  setVisibility,
  assignedGroup,
  setAssignedGroup,
  votingPeriodType,
  setVotingPeriodType,
  customVotingHours,
  setCustomVotingHours,
  onSubmit,
  error,
}: {
  selectedSport: string;
  gameTitle: string;
  address: string;
  gameType: string;
  maxPlayers: string;
  timeOptions: TimeOption[];
  totalCost: string;
  splitCost: boolean;
  perPersonCost: string;
  selectedPlayers: string[];
  invitePlayers: InvitePlayer[];
  groups: { id: string; name: string }[];
  visibility: "public" | "group" | "private" | "";
  setVisibility: (v: "public" | "group" | "private" | "") => void;
  assignedGroup: string;
  setAssignedGroup: (v: string) => void;
  votingPeriodType: number | "custom";
  setVotingPeriodType: (v: number | "custom") => void;
  customVotingHours: string;
  setCustomVotingHours: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
}) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <>
      <p className="text-body-md text-on-surface-variant mb-5 leading-normal">
        Review your game details before posting.
      </p>

      {/* Game Details Section */}
      <div className="bg-surface-container-lowest rounded-md3-large p-4 mb-3 shadow-md3-1">
        <h3 className="text-body-md font-medium text-primary mb-3 leading-none">
          Game Details
        </h3>
        <div className="flex flex-col gap-2">
          <ReviewRow label="Sport" value={selectedSport || "—"} />
          <ReviewRow label="Title" value={gameTitle || "—"} />
          <ReviewRow label="Location" value={address || "—"} />
          <ReviewRow
            label="Type"
            value={gameType ? gameType.charAt(0).toUpperCase() + gameType.slice(1) : "—"}
          />
          <ReviewRow label="Max Players" value={maxPlayers || "—"} />
        </div>
      </div>

      {/* Time Options Section */}
      <div className="bg-surface-container-lowest rounded-md3-large p-4 mb-3 shadow-md3-1">
        <h3 className="text-body-md font-medium text-primary mb-3 leading-none">
          Proposed Times
        </h3>
        {timeOptions.map((option, index) => (
          <div
            key={option.id}
            className={`flex flex-col gap-1 ${
              index < timeOptions.length - 1
                ? "pb-3 mb-3 border-b border-outline-variant/50"
                : ""
            }`}
          >
            <span className="text-label-md font-medium text-on-surface-variant leading-none">
              Option {index + 1}
            </span>
            <span className="text-body-md text-on-surface leading-normal">
              {formatDate(option.date)} &middot;{" "}
              {formatTime(option.startTime)} – {formatTime(option.endTime)}
            </span>
            {option.address && (
              <span className="text-label-md text-on-surface-variant leading-normal">
                {option.address}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Cost Section */}
      <div className="bg-surface-container-lowest rounded-md3-large p-4 mb-3 shadow-md3-1">
        <h3 className="text-body-md font-medium text-primary mb-3 leading-none">
          Cost
        </h3>
        <div className="flex flex-col gap-2">
          <ReviewRow
            label="Total Cost"
            value={
              totalCost && parseFloat(totalCost) > 0
                ? `$${parseFloat(totalCost).toFixed(2)}`
                : "Free"
            }
          />
          {totalCost && parseFloat(totalCost) > 0 && (
            <>
              <ReviewRow label="Split" value={splitCost ? "Yes" : "No"} />
              <ReviewRow label="Per Person" value={`$${perPersonCost}`} />
            </>
          )}
        </div>
      </div>

      {/* Invited Players */}
      <div className="bg-surface-container-lowest rounded-md3-large p-4 mb-3 shadow-md3-1">
        <h3 className="text-body-md font-medium text-primary mb-3 leading-none">
          Invited Players
        </h3>
        {selectedPlayers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedPlayers.map((pid) => {
              const player = invitePlayers.find((p) => p.id === pid);
              if (!player) return null;
              return (
                <div
                  key={pid}
                  className="flex items-center gap-2 bg-secondary-container rounded-md3-full px-3 py-1.5"
                >
                  {player.avatar ? (
                    <ImageWithFallback
                      src={player.avatar}
                      alt={player.name}
                      className="w-6 h-6 rounded-md3-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-md3-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
                      style={{ backgroundColor: player.color || "#6750A4" }}
                    >
                      {player.initials || player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-label-md font-medium text-on-surface leading-none">
                    {player.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-label-lg text-on-surface-variant leading-normal">
            No players invited yet. Share the link after creating.
          </p>
        )}
      </div>

      {/* Voting Period */}
      <div className="bg-surface rounded-md3-large p-4 mb-3 shadow-md3-1">
        <h3 className="text-title-sm font-medium text-primary mb-3 leading-none">
          Voting Period
        </h3>
        <p className="text-label-md text-on-surface-variant mb-4 leading-normal">
          How long before the first proposed time should voting close?
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {(
              [
                { value: 12, label: "12h" },
                { value: 24, label: "24h" },
                { value: 48, label: "48h" },
                { value: "custom", label: "Custom" },
              ] as const
            ).map((item) => {
              const isActive = votingPeriodType === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => setVotingPeriodType(item.value)}
                  className={`flex-1 flex justify-center py-2 rounded-md3-medium text-label-lg font-medium transition-colors border ${
                    isActive
                      ? "bg-secondary-container text-on-secondary-container border-transparent"
                      : "bg-transparent text-on-surface-variant border-outline"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          {votingPeriodType === "custom" && (
            <div className="flex items-center gap-3 mt-1">
              <input
                type="number"
                value={customVotingHours}
                onChange={(e) => setCustomVotingHours(e.target.value)}
                placeholder="Hours"
                className="w-24 h-[48px] px-3 rounded-md3-extra-small border border-outline bg-transparent text-body-lg text-on-surface focus:border-primary focus:outline-none"
              />
              <span className="text-body-md text-on-surface-variant">
                hours before first game
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Visibility (Optional) */}
      <div className="bg-surface rounded-md3-large p-4 mb-3 shadow-md3-1">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-title-sm font-medium text-primary leading-none">
            Visibility
          </h3>
          <span className="text-label-sm text-on-surface-variant">Optional</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {(
            [
              { key: "public" as const, label: "Public Game", icon: Eye },
              { key: "group" as const, label: "Group Only", icon: Users },
              { key: "private" as const, label: "Private Game", icon: Lock },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = visibility === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setVisibility(isActive ? "" : item.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-md3-full text-label-lg font-medium transition-colors min-h-[40px] ${
                  isActive
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface text-on-surface-variant border border-outline"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="leading-none text-[13px] sm:text-base">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Group Assignment */}
      {visibility === "group" && (
        <div className="bg-surface-container-lowest rounded-md3-large p-4 mb-6 shadow-md3-1">
          <h3 className="text-body-md font-medium text-primary mb-3 leading-none">
            Assign to Group
          </h3>
          {groups.length === 0 ? (
            <p className="text-label-lg text-on-surface-variant leading-normal">
              No groups yet. Create a group from the home screen.
            </p>
          ) : (
            <div className="flex flex-col gap-0">
              {groups.map((group) => {
                const isSelected = assignedGroup === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => setAssignedGroup(group.id)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-md3-medium transition-colors min-h-[48px] ${
                      isSelected ? "bg-secondary-container" : "hover:bg-on-surface/8"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md3-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "border-primary" : "border-outline"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-[10px] h-[10px] rounded-md3-full bg-primary" />
                      )}
                    </div>
                    <span className="text-body-md text-on-surface font-medium leading-none">
                      {group.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="w-full px-3 py-2 rounded-md3-medium bg-error-container text-on-error-container text-body-sm">
          {error}
        </div>
      )}

      {/* Create Game CTA */}
      <button
        onClick={onSubmit}
        className="w-full h-[40px] bg-primary text-on-primary rounded-md3-full text-label-lg font-medium shadow-md3-1 md3-state-primary transition-colors"
      >
        Create Game
      </button>
    </>
  );
}

// ─── Shared tiny component ─────────────────────────────────
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-label-md text-on-surface-variant leading-normal flex-shrink-0">
        {label}
      </span>
      <span className="text-body-md text-on-surface text-right leading-normal">
        {value}
      </span>
    </div>
  );
}
