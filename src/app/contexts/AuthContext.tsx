// @refresh reset
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured, isDemoMode, setDemoModePreference } from "@/lib/supabase";
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
  supabaseConfigured: boolean;
  toggleDemoMode: (enabled: boolean) => void;
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

const AuthContext = createContext<AuthContextType | null>(null);

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const COLORS = ["#22C55E", "#3B82F6", "#8B5CF6", "#F97316", "#EF4444", "#06B6D4", "#6366F1", "#EAB308"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(() => isDemoMode());
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (isDemo) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    supabase!.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === "TOKEN_REFRESHED") {
        // Token was automatically refreshed — session is still valid
      }

      if (event === "SIGNED_OUT" || !session) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Set up periodic session refresh check
    const refreshInterval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase!.auth.getSession();
      if (!currentSession && user) {
        // Session expired — sign out gracefully
        setUser(null);
        setSession(null);
        setProfile(null);
      }
    }, 60_000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [isDemo]);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase!
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data && !error) {
      setProfile(data as UserProfile);
    }
    setLoading(false);
  }

  const toggleDemoMode = (enabled: boolean) => {
    setDemoModePreference(enabled);
    setIsDemo(enabled);
    if (enabled) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (isDemo) return { error: "Running in demo mode" };

    const { error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    if (isDemo) return { error: "Running in demo mode" };

    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (isDemo) return;
    await supabase!.auth.signOut();
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (isDemo) return { error: "Running in demo mode" };
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error?.message ?? null };
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (isDemo) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      return { error: null };
    }

    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase!
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    }

    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, isDemo, supabaseConfigured, toggleDemoMode, signUp, signIn, signOut, updateProfile, resetPassword }}
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
