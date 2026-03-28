import { createClient } from "@supabase/supabase-js";

// ─── Environment ──────────────────────────────────────────────────────────────
// VITE_APP_ENV values: "demo" | "development" | "production"
// Defaults to "production" when not set so prod builds are safe by default.
export const APP_ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? "production";
export const IS_PROD = APP_ENV === "production";

// ─── Supabase client ──────────────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  if (IS_PROD && APP_ENV !== "demo") {
    console.error(
      "[OptIn] FATAL: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in production. " +
      "Set VITE_APP_ENV=demo to run without Supabase."
    );
  } else if (!IS_PROD) {
    console.warn(
      "[OptIn] Supabase credentials not found. Running in demo mode with mock data."
    );
  }
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// ─── Demo mode ────────────────────────────────────────────────────────────────
// Force demo mode when VITE_APP_ENV=demo, or fall back to localStorage toggle.
const DEMO_MODE_KEY = "optin_demo_mode";

export function isDemoMode(): boolean {
  if (APP_ENV === "demo") return true;
  if (!isSupabaseConfigured()) return true;
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setDemoModePreference(enabled: boolean): void {
  try {
    localStorage.setItem(DEMO_MODE_KEY, String(enabled));
  } catch {
    // ignore
  }
}

// ─── Dev-only logging ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devLog(...args: any[]): void {
  if (!IS_PROD) {
    console.log("[OptIn]", ...args);
  }
}
