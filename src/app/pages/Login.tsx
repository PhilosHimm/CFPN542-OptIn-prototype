import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { signIn, isDemo, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && (isDemo || user)) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (isDemo) {
      navigate("/");
      return;
    }

    const result = await signIn(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[430px] space-y-10">
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

          {isDemo && (
            <div className="bg-tertiary-container rounded-md3-medium p-4 text-body-md text-on-tertiary-container">
              Demo mode: No Supabase configured. Click Sign In to explore with mock data.
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
                required={!isDemo}
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
              />
              <label htmlFor="password" className="md3-floating-label !left-12">
                Password
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
            {submitting ? "Signing In..." : "Sign In"}
            {!submitting && <LogIn className="w-5 h-5" />}
          </button>
        </form>

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
