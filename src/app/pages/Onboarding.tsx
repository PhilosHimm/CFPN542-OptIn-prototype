import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const COLORS = [
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#F97316",
  "#EF4444",
  "#06B6D4",
  "#6366F1",
  "#EAB308",
];

const BIO_EXAMPLES = [
  "Pickup hoops every Tuesday 🏀",
  "Soccer on weekends, any surface ⚽",
  "Tennis beginner, doubles preferred 🎾",
];

export function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, isDemo, loading, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
    profile?.color ?? COLORS[1]
  );
  const [username, setUsername] = useState(
    profile?.username ??
      profile?.name?.toLowerCase().replace(/\s+/g, "_").slice(0, 20) ??
      ""
  );
  const [usernameError, setUsernameError] = useState("");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);

  if (!loading && !isDemo && !user) return <Navigate to="/login" replace />;
  // Already completed onboarding (username is set in DB) — skip
  if (!loading && profile?.username) return <Navigate to="/" replace />;

  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const initials =
    profile?.initials ??
    profile?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ??
    "?";

  const validateUsername = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameError("Username is required");
      return false;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      setUsernameError("3–20 characters: letters, numbers, underscores only");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const handleStep2Continue = () => {
    if (!validateUsername()) return;
    setStep(3);
  };

  const handleComplete = async () => {
    setSaving(true);
    // Saving a non-null username is what marks onboarding as complete (checked in Layout).
    // No localStorage needed — this is DB-persisted, so it survives sign-out/sign-in.
    const { error } = await updateProfile({ color: selectedColor, username: username.trim(), bio });
    if (error) {
      setSaving(false);
      setUsernameError(error.includes("unique") ? "Username is already taken" : `Save failed: ${error}`);
      setStep(2);
      return;
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[430px] sm:max-w-lg">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-12">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 bg-primary"
                  : s < step
                  ? "w-4 bg-primary/40"
                  : "w-4 bg-outline-variant"
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Pick your color ── */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-headline-lg font-medium text-on-surface">
                Welcome, {firstName}!
              </h1>
              <p className="text-body-md text-on-surface-variant">
                Let's personalize your profile
              </p>
            </div>

            {/* Avatar preview */}
            <div className="flex justify-center">
              <div
                className="w-28 h-28 rounded-md3-extra-large flex items-center justify-center transition-colors duration-200"
                style={{ backgroundColor: selectedColor }}
              >
                <span className="text-display-sm font-medium text-white">
                  {initials}
                </span>
              </div>
            </div>

            {/* Color swatches */}
            <div className="space-y-3">
              <p className="text-label-lg text-on-surface-variant text-center">
                Pick your color
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className="w-11 h-11 rounded-md3-full flex items-center justify-center transition-transform active:scale-90 focus:outline-none"
                    style={{ backgroundColor: color }}
                    aria-label={`Color ${color}`}
                  >
                    {selectedColor === color && (
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full h-14 bg-primary text-on-primary text-label-lg font-medium rounded-md3-full flex items-center justify-center gap-2 hover:shadow-md3-1 active:bg-primary/90 transition-all md3-state-primary"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── Step 2: Bio ── */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-headline-lg font-medium text-on-surface">
                About you
              </h1>
              <p className="text-body-md text-on-surface-variant">
                What's your pickup activity like?
              </p>
            </div>

            {/* Mini avatar */}
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-md3-extra-large flex items-center justify-center"
                style={{ backgroundColor: selectedColor }}
              >
                <span className="text-headline-md font-medium text-white">
                  {initials}
                </span>
              </div>
            </div>

            {/* Username input */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-label-lg text-on-surface-variant block"
              >
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-md select-none">
                  @
                </span>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase());
                    setUsernameError("");
                  }}
                  className="w-full pl-8 pr-4 py-3 rounded-md3-medium border border-outline bg-surface text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                  placeholder="your_handle"
                  maxLength={20}
                />
              </div>
              {usernameError ? (
                <p className="text-label-sm text-error">{usernameError}</p>
              ) : (
                <p className="text-label-sm text-on-surface-variant/60">
                  Letters, numbers, underscores · 3–20 characters
                </p>
              )}
            </div>

            {/* Bio input */}
            <div className="space-y-1.5">
              <label
                htmlFor="bio"
                className="text-label-lg text-on-surface-variant block"
              >
                Bio{" "}
                <span className="text-on-surface-variant/60">(optional)</span>
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={150}
                className="w-full px-4 py-3 rounded-md3-medium border border-outline bg-surface text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary resize-none transition-colors"
                placeholder="e.g. Pickup hoops every Tuesday 🏀"
              />
              <div className="text-right">
                <span className="text-body-sm text-on-surface-variant">
                  {bio.length}/150
                </span>
              </div>
            </div>

            {/* Quick-fill examples */}
            <div className="space-y-2">
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">
                Quick fills
              </p>
              {BIO_EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => setBio(example)}
                  className="w-full text-left px-4 py-3 rounded-md3-medium bg-surface-variant text-body-md text-on-surface-variant hover:bg-on-surface/8 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="h-14 px-6 border border-outline text-label-lg font-medium text-on-surface rounded-md3-full flex items-center justify-center hover:bg-on-surface/8 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleStep2Continue}
                className="flex-1 h-14 bg-primary text-on-primary text-label-lg font-medium rounded-md3-full flex items-center justify-center gap-2 hover:shadow-md3-1 active:bg-primary/90 transition-all md3-state-primary"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: All set ── */}
        {step === 3 && (
          <div className="space-y-8 text-center">
            <div
              className="w-28 h-28 rounded-md3-extra-large flex items-center justify-center mx-auto"
              style={{ backgroundColor: selectedColor }}
            >
              <span className="text-display-sm font-medium text-white">
                {initials}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-headline-lg font-medium text-on-surface">
                You're all set!
              </h1>
              <p className="text-body-md text-on-surface-variant">
                Ready to find your next pickup activity
              </p>
            </div>

            {/* Profile preview card */}
            <div className="bg-surface-variant rounded-md3-extra-large p-6 text-left">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-md3-extra-large flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: selectedColor }}
                >
                  <span className="text-title-lg font-medium text-white">
                    {initials}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-title-md font-medium text-on-surface truncate">
                    {profile?.name ?? "You"}
                  </p>
                  {username.trim() && (
                    <p className="text-label-md text-primary mt-0.5">
                      @{username.trim()}
                    </p>
                  )}
                  {bio ? (
                    <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">
                      {bio}
                    </p>
                  ) : (
                    <p className="text-body-sm text-on-surface-variant/50 mt-0.5 italic">
                      No bio yet
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="h-14 px-6 border border-outline text-label-lg font-medium text-on-surface rounded-md3-full flex items-center justify-center hover:bg-on-surface/8 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 h-14 bg-primary text-on-primary text-label-lg font-medium rounded-md3-full flex items-center justify-center gap-2 hover:shadow-md3-1 active:bg-primary/90 transition-all disabled:opacity-50 md3-state-primary"
              >
                {saving ? "Saving..." : "Start Playing"}
                {!saving && <Sparkles className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
