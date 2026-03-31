// @refresh reset
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured, isDemoMode, setDemoModePreference, devLog } from "@/lib/supabase";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string | null;
  initials: string;
  color: string;
  bio: string;
  avatar_url: string | null;
  games_played: number;
  weeks_played: number;
  attendance_rate: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  sessionExpired: boolean;
  supabaseConfigured: boolean;
  toggleDemoMode: (enabled: boolean) => void;
  enterDemoMode: () => void;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const DEMO_PROFILE: UserProfile = {
  id: "demo-user",
  email: "marcus@optin.app",
  name: "Marcus Johnson",
  username: "marcus_j",
  initials: "MJ",
  color: "#007AFF",
  bio: "Pickup basketball fanatic \u{1F3C0} \u00B7 Tuesday Hoops organizer",
  avatar_url: null,
  games_played: 47,
  weeks_played: 31,
  attendance_rate: 89,
};

const DEMO_SESSION_KEY = "optin_demo_session";

const AuthContext = createContext<AuthContextType | null>(null);

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isDemo, setIsDemo] = useState(() => isDemoMode() || localStorage.getItem(DEMO_SESSION_KEY) === "true");
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (isDemo) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === "SIGNED_OUT" || !newSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (newSession?.user) {
        fetchProfile(newSession.user.id);
      }
    });

    // Periodic session refresh check — attempt token refresh, detect expiry
    const refreshInterval = setInterval(async () => {
      if (!supabase) return;
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if ((!currentSession || error) && user) {
          // Attempt to refresh the token before giving up
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (!refreshData.session) {
            setSessionExpired(true);
            setUser(null);
            setSession(null);
            setProfile(null);
          }
        }
      } catch {
        // Network error — don't sign out on transient failures
      }
    }, 60_000);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [isDemo]);

  async function fetchProfile(userId: string) {
    if (!supabase) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data && !error) {
        setProfile(data as UserProfile);
      }
    } catch {
      // Profile fetch failed — proceed without profile
    }
    setLoading(false);
  }

  const toggleDemoMode = (enabled: boolean) => {
    setDemoModePreference(enabled);
    setIsDemo(enabled);
    if (enabled) {
      localStorage.setItem(DEMO_SESSION_KEY, "true");
      setProfile(DEMO_PROFILE);
      setLoading(false);
    } else {
      localStorage.removeItem(DEMO_SESSION_KEY);
    }
  };

  const enterDemoMode = () => {
    setDemoModePreference(true);
    localStorage.setItem(DEMO_SESSION_KEY, "true");
    setIsDemo(true);
    setProfile(DEMO_PROFILE);
    setLoading(false);
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (isDemo) return { error: "Running in demo mode" };
    if (!supabase) return { error: "Supabase not configured" };

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch {
      return { error: "Something went wrong — please try again" };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (isDemo) return { error: "Running in demo mode" };
    if (!supabase) return { error: "Supabase not configured" };

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        setSessionExpired(false);
        // Dev-only: confirm auth.uid() is set correctly after sign-in
        supabase.auth.getUser().then(({ data }) => {
          devLog("Signed in — auth.uid():", data.user?.id ?? "null");
        });
      }
      return { error: error?.message ?? null };
    } catch {
      return { error: "Something went wrong — please try again" };
    }
  };

  const signOut = async () => {
    // Clear all optin localStorage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("optin_")) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    if (isDemo) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setIsDemo(false);
      setProfile(null);
      setUser(null);
      setSession(null);
      return;
    }

    if (supabase) {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    }
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    if (isDemo) return { error: "Running in demo mode" };
    if (!supabase) return { error: "Supabase not configured" };

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      return { error: error?.message ?? null };
    } catch {
      return { error: "Something went wrong — please try again" };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (isDemo) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      return { error: null };
    }

    if (!user) return { error: "Not authenticated" };
    if (!supabase) return { error: "Supabase not configured" };

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (!error) {
        setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      }

      return { error: error?.message ?? null };
    } catch {
      return { error: "Something went wrong — please try again" };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, isDemo, sessionExpired, supabaseConfigured, toggleDemoMode, enterDemoMode, signUp, signIn, signOut, updateProfile, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
