import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not found. The app will run in demo mode with mock data."
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

const DEMO_MODE_KEY = "optin_demo_mode";

export function isDemoMode(): boolean {
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
