import { useState } from "react";
import { useNavigate } from "react-router";
import { Activity, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { signIn, isDemo } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isDemo) {
      navigate("/");
      return;
    }

    const result = await signIn(email, password);
    setLoading(false);

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
          <div className="flex justify-center items-center gap-3">
            <div className="w-16 h-16 rounded-[20px] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30">
              <Activity className="w-9 h-9" />
            </div>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-black/90">OptIn</h1>
          <p className="text-black/40 font-medium text-sm">Pickup sports, simplified.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-600 font-medium">
              {error}
            </div>
          )}

          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 font-medium">
              Demo mode: No Supabase configured. Click Sign In to explore with mock data.
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[11px] font-bold text-black/40 uppercase tracking-widest ml-1">
              Email
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 group-focus-within:text-primary transition-colors" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/50 backdrop-blur-md border border-black/5 rounded-2xl pl-11 pr-4 py-3.5 text-[15px] font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required={!isDemo}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[11px] font-bold text-black/40 uppercase tracking-widest ml-1">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 group-focus-within:text-primary transition-colors" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full bg-white/50 backdrop-blur-md border border-black/5 rounded-2xl pl-11 pr-12 py-3.5 text-[15px] font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required={!isDemo}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full ios-btn-primary py-4 text-lg font-bold flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center space-y-4">
          <button
            onClick={() => navigate("/signup")}
            className="text-sm font-semibold text-primary"
          >
            Don't have an account? <span className="font-bold">Sign Up</span>
          </button>
        </div>
      </div>
    </div>
  );
}
