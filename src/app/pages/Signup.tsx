import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Signup() {
  const navigate = useNavigate();
  const { signUp, isDemo, user, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!authLoading && !success && (isDemo || user)) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (isDemo) {
      setSuccess(true);
      setSubmitting(false);
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your full name (at least 2 characters)");
      setSubmitting(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      setSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setSubmitting(false);
      return;
    }

    const result = await signUp(trimmedEmail, password, trimmedName);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[430px] sm:max-w-lg text-center space-y-8">
          <div className="w-24 h-24 rounded-md3-extra-large bg-primary-container flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-on-primary-container" />
          </div>
          <div className="space-y-2">
            <h2 className="text-headline-md font-medium text-on-surface">Account Created!</h2>
            <p className="text-body-md text-on-surface-variant">
              {isDemo
                ? "Demo mode active. Let's set up your profile."
                : "Check your email to verify your account, then sign in to complete your profile."}
            </p>
          </div>
          {isDemo ? (
            <button
              onClick={() => navigate("/onboarding")}
              className="w-full h-14 bg-primary text-on-primary text-label-lg font-medium rounded-md3-full flex items-center justify-center hover:shadow-md3-1 active:bg-primary/90 transition-all md3-state-primary"
            >
              Set Up My Profile
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full h-14 bg-primary text-on-primary text-label-lg font-medium rounded-md3-full flex items-center justify-center hover:shadow-md3-1 active:bg-primary/90 transition-all md3-state-primary"
            >
              Go to Sign In
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[430px] sm:max-w-lg space-y-10">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-md3-extra-large bg-primary-container flex items-center justify-center">
              <span className="text-display-sm font-medium text-on-primary-container">O</span>
            </div>
          </div>
          <h1 className="text-headline-lg font-medium text-on-surface">OptIn</h1>
          <p className="text-body-md text-on-surface-variant">Create your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-error-container rounded-md3-medium p-4 text-body-md text-on-error-container">
              {error}
            </div>
          )}

          {isDemo && (
            <div className="bg-tertiary-container rounded-md3-medium p-4 text-body-md text-on-tertiary-container">
              Demo mode: No Supabase configured. Sign up is simulated.
            </div>
          )}

          <div className="md3-outlined-field">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none z-10" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
                className="!pl-12"
                required
                aria-label="Full Name"
              />
              <label htmlFor="name" className="md3-floating-label !left-12">
                Full Name
              </label>
            </div>
          </div>

          <div className="md3-outlined-field">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none z-10" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className="!pl-12"
                required={!isDemo}
                aria-label="Email"
              />
              <label htmlFor="email" className="md3-floating-label !left-12">
                Email
              </label>
            </div>
          </div>

          <div className="md3-outlined-field">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none z-10" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className="!pl-12 !pr-12"
                required={!isDemo}
                minLength={8}
                aria-label="Password"
              />
              <label htmlFor="password" className="md3-floating-label !left-12">
                Password (min 8 characters)
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-md3-full text-on-surface-variant hover:bg-on-surface/8 transition-colors z-10"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 bg-primary text-on-primary text-label-lg font-medium rounded-md3-full flex items-center justify-center gap-2 hover:shadow-md3-1 active:bg-primary/90 transition-all disabled:opacity-50 md3-state-primary"
          >
            {submitting ? "Creating Account..." : "Create Account"}
            {!submitting && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-label-lg text-primary font-medium hover:text-primary/80 transition-colors"
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
