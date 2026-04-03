import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, LogIn, Play } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, resetPassword, isDemo, user, loading: authLoading, enterDemoMode } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  if (!authLoading && (isDemo || user)) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      setSubmitting(false);
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      setSubmitting(false);
      return;
    }

    const result = await signIn(trimmedEmail, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate("/");
    }
  };

  const handleDemoEntry = () => {
    enterDemoMode();
    navigate("/");
  };

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
          <p className="text-body-md text-on-surface-variant">Pickup sports, simplified.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-error-container rounded-md3-medium p-4 text-body-md text-on-error-container">
              {error}
            </div>
          )}

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
                required
                aria-label="Email address"
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
                required
                minLength={8}
                aria-label="Password"
              />
              <label htmlFor="password" className="md3-floating-label !left-12">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
            {submitting ? "Signing In..." : "Sign In"}
            {!submitting && <LogIn className="w-5 h-5" />}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-on-surface/12" />
          <span className="text-body-sm text-on-surface-variant">or</span>
          <div className="flex-1 h-px bg-on-surface/12" />
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={async () => {
            const result = await signInWithGoogle();
            if (result.error) setError(result.error);
          }}
          className="w-full h-12 border border-outline text-on-surface text-label-lg font-medium rounded-md3-full flex items-center justify-center gap-3 hover:bg-on-surface/8 active:bg-on-surface/12 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Continue in Demo */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleDemoEntry}
            className="w-full h-12 border-2 border-black/10 text-on-surface-variant text-label-lg font-medium rounded-md3-full flex items-center justify-center gap-2 hover:bg-black/5 active:bg-black/10 transition-all"
          >
            <Play className="w-4 h-4" />
            Continue in Demo
          </button>
          <p className="text-center text-body-sm text-on-surface-variant/60">
            Preview OptIn with sample data. Create an account to use the live app.
          </p>
        </div>

        {/* Forgot Password */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => { setShowResetForm(!showResetForm); setResetMessage(""); }}
            className="text-body-md text-on-surface-variant hover:text-primary transition-colors"
          >
            Forgot your password?
          </button>
        </div>

        {showResetForm && (
          <div className="bg-surface-container rounded-md3-large p-4 space-y-3">
            <p className="text-body-md text-on-surface-variant">
              Enter your email and we'll send you a password reset link.
            </p>
            <div className="md3-outlined-field">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none z-10" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder=" "
                  className="!pl-12"
                  aria-label="Reset email address"
                />
                <label className="md3-floating-label !left-12">Email</label>
              </div>
            </div>
            {resetMessage && (
              <p className={`text-body-sm ${resetMessage.includes("sent") ? "text-primary" : "text-error"}`}>
                {resetMessage}
              </p>
            )}
            <button
              type="button"
              onClick={async () => {
                const trimmed = resetEmail.trim();
                if (!trimmed) { setResetMessage("Please enter your email."); return; }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setResetMessage("Please enter a valid email address."); return; }
                const result = await resetPassword(trimmed);
                setResetMessage(result.error || "Reset link sent! Check your email.");
              }}
              className="w-full h-10 bg-primary/10 text-primary text-label-lg font-medium rounded-md3-full hover:bg-primary/20 transition-colors"
            >
              Send Reset Link
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <button
            onClick={() => navigate("/signup")}
            className="text-label-lg text-primary font-medium hover:text-primary/80 transition-colors"
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
