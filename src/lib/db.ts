import { createClient } from "@neon/neon-js/supabase";
import type { Database } from "./database.types";
import { APP_NAME } from "@/app/constants/app";

// ─── Environment ──────────────────────────────────────────────────────────────
// VITE_APP_ENV values: "demo" | "development" | "production"
// Defaults to "production" when not set so prod builds are safe by default.
export const APP_ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? "production";
export const IS_PROD = APP_ENV === "production";

// ─── Neon client ──────────────────────────────────────────────────────────────
// One HTTPS base URL (host + database, no credentials), e.g.
//   https://ep-xxx.c-2.us-east-1.aws.neon.tech/neondb
// The SDK derives both the Neon Auth URL and the Data API URL from it. Auth uses
// the Supabase-compatible adapter, so `db.auth.*` keeps supabase-js's API, and
// `db.from()` / `db.rpc()` go to the PostgREST-compatible Data API with the
// user's JWT attached. RLS is what enforces access — there is no secret key in
// the browser.
const neonUrl = import.meta.env.VITE_NEON_URL as string | undefined;

if (!neonUrl) {
  if (IS_PROD && APP_ENV !== "demo") {
    console.error(
      `[${APP_NAME}] FATAL: VITE_NEON_URL is required in production. ` +
      "Set VITE_APP_ENV=demo to run without a database."
    );
  } else if (!IS_PROD) {
    console.warn(`[${APP_NAME}] VITE_NEON_URL not set. Running in demo mode with mock data.`);
  }
}

export const db = neonUrl ? createClient<Database>(neonUrl) : null;

type DbClient = NonNullable<typeof db>;
type SessionResult = Awaited<ReturnType<DbClient["auth"]["getSession"]>>;
export type Session = NonNullable<SessionResult["data"]["session"]>;
export type User = Session["user"];

export function isDbConfigured(): boolean {
  return db !== null;
}

// ─── Demo mode ────────────────────────────────────────────────────────────────
// Force demo mode when VITE_APP_ENV=demo, or fall back to localStorage toggle.
const DEMO_MODE_KEY = "optin_demo_mode";

export function isDemoMode(): boolean {
  if (APP_ENV === "demo") return true;
  if (!isDbConfigured()) return true;
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

// ─── Polling (replaces Supabase Realtime) ─────────────────────────────────────
// Neon has no postgres_changes equivalent wired up here, so screens that used to
// subscribe now re-fetch on an interval. Ticks are skipped while the tab is
// hidden and one fires immediately when it becomes visible again, so a
// backgrounded PWA costs no requests.
export const POLL_INTERVAL_MS = 5_000;

export function poll(
  tick: () => void | Promise<void>,
  intervalMs = POLL_INTERVAL_MS,
  { immediate = false }: { immediate?: boolean } = {}
): () => void {
  let stopped = false;
  let running = false;
  const run = async () => {
    if (stopped || running || document.visibilityState === "hidden") return;
    running = true;
    try { await tick(); } catch { /* transient — next tick retries */ }
    running = false;
  };
  // immediate: run once now. Without it the first tick waits a whole interval,
  // so anything that polls its *initial* load sat empty for that long.
  if (immediate) void run();
  const id = setInterval(run, intervalMs);
  const onVisible = () => { if (document.visibilityState === "visible") void run(); };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    stopped = true;
    clearInterval(id);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

// ─── Dev-only logging ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devLog(...args: any[]): void {
  if (!IS_PROD) {
    console.log(`[${APP_NAME}]`, ...args);
  }
}
