// @refresh reset
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db, isDbConfigured, isDemoMode, setDemoModePreference, devLog } from "@/lib/db";
import type { Session, User } from "@/lib/db";

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
  dbConfigured: boolean;
  toggleDemoMode: (enabled: boolean) => void;
  enterDemoMode: () => void;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
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
  const dbConfigured = isDbConfigured();

  useEffect(() => {
    if (isDemo) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    if (!db) {
      setLoading(false);
      return;
    }

    db.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user);
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === "SIGNED_OUT" || !newSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (newSession?.user) {
        fetchProfile(newSession.user);
      }
    });

    // Periodic session refresh check — attempt token refresh, detect expiry
    const refreshInterval = setInterval(async () => {
      if (!db) return;
      try {
        const { data: { session: currentSession }, error } = await db.auth.getSession();
        if ((!currentSession || error) && user) {
          // Attempt to refresh the token before giving up
          const { data: refreshData } = await db.auth.refreshSession();
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

  // Neon Auth announces sign-in through Better Auth's localStorage broadcast,
  // and `storage` events only fire in *other* tabs — so onAuthStateChange never
  // sees SIGNED_IN in the tab that signed in. Apply the session from the sign-in
  // result directly instead of waiting for an event that won't arrive.
  function applySession(newSession: Session | null) {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    if (newSession?.user) {
      setLoading(true);
      fetchProfile(newSession.user);
    }
  }

  async function fetchProfile(authUser: User) {
    if (!db) { setLoading(false); return; }
    const userId = authUser.id;
    try {
      // maybeSingle(): "no row" is data === null with no error, so creating the
      // profile doesn't depend on PostgREST's PGRST116 code, which the Neon
      // Data API doesn't necessarily return.
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(`[OptIn] Profile fetch failed: ${error.code ?? ""} ${error.message}`);
      } else if (data) {
        setProfile(data as UserProfile);
      } else {
        // First sign-in for this user (email or Google): create the profile.
        const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
        const name =
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          authUser.email?.split("@")[0] ||
          "User";
        const { data: created, error: insertError } = await db
          .from("profiles")
          .insert({
            id: userId,
            email: authUser.email ?? "",
            name,
            initials: getInitials(name),
            color: "#2D7A3A",
            username: null,
            bio: "",
            games_played: 0,
            weeks_played: 0,
            attendance_rate: 0,
          })
          .select("*")
          .single();
        if (insertError) {
          console.error(`[OptIn] Profile create failed: ${insertError.code ?? ""} ${insertError.message}`);
        } else if (created) {
          setProfile(created as UserProfile);
        }
      }
    } catch (err) {
      console.error("[OptIn] Profile fetch threw:", err);
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
    if (!db) return { error: "Database not configured" };

    try {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) return { error: error.message };
      // Neon Auth signs the user in on sign-up (email verification is off).
      if (data.session) applySession(data.session);
      return { error: null };
    } catch {
      return { error: "Something went wrong — please try again" };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (isDemo) return { error: "Running in demo mode" };
    if (!db) return { error: "Database not configured" };

    try {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (!error) {
        setSessionExpired(false);
        applySession(data.session);
        devLog("Signed in — user id:", data.user?.id ?? "null");
      }
      return { error: error?.message ?? null };
    } catch {
      return { error: "Something went wrong — please try again" };
    }
  };

  const signInWithGoogle = async () => {
    if (isDemo) return { error: "Running in demo mode" };
    if (!db) return { error: "Database not configured" };
    const { error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
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

    if (db) {
      try { await db.auth.signOut(); } catch { /* ignore */ }
    }
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    if (isDemo) return { error: "Running in demo mode" };
    if (!db) return { error: "Database not configured" };

    try {
      const { error } = await db.auth.resetPasswordForEmail(email, {
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
    if (!db) return { error: "Database not configured" };

    try {
      const { error } = await db
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
      value={{ user, profile, session, loading, isDemo, sessionExpired, dbConfigured, toggleDemoMode, enterDemoMode, signUp, signIn, signInWithGoogle, signOut, updateProfile, resetPassword }}
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
