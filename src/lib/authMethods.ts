// Sign-in methods on one account: email + password, Google, or both.
//
// The Supabase-compatible adapter covers sign-in itself, but not account
// linking, OTP email verification or adding a password to a Google-only
// account. Those come from the underlying Better Auth client, which
// `db.auth.getBetterAuthInstance()` exposes. Its TypeScript type omits the
// plugins Neon Auth enables (emailOtp), so the calls used here are typed by
// hand below. They are the same ones the adapter makes internally.
import { db } from "./db";

type BAResult<T = unknown> = { data: T | null; error: { message?: string; code?: string; status?: number } | null };

interface BetterAuthAccountApi {
  getSession(): Promise<BAResult<{ user: { email: string; emailVerified: boolean } }>>;
  listAccounts(): Promise<BAResult<Array<{ id: string; providerId: string; accountId: string }>>>;
  signIn: {
    social(args: { provider: "google"; callbackURL: string; errorCallbackURL: string; newUserCallbackURL?: string }): Promise<BAResult>;
  };
  linkSocial(args: { provider: "google"; callbackURL: string; errorCallbackURL: string }): Promise<BAResult<{ url?: string }>>;
  unlinkAccount(args: { accountId: string; providerId?: string }): Promise<BAResult>;
  changePassword(args: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }): Promise<BAResult>;
  emailOtp: {
    sendVerificationOtp(args: { email: string; type: "email-verification" | "forget-password" }): Promise<BAResult>;
    verifyEmail(args: { email: string; otp: string }): Promise<BAResult>;
    resetPassword(args: { email: string; otp: string; password: string }): Promise<BAResult>;
  };
}

function ba(): BetterAuthAccountApi | null {
  if (!db) return null;
  return db.auth.getBetterAuthInstance() as unknown as BetterAuthAccountApi;
}

const err = (e: BAResult["error"], fallback: string) => (e ? e.message || fallback : null);

/** Only same-app paths: "/x", never "//host" or "https://…". */
export function safePath(path: string | undefined | null, fallback = "/"): string {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

/**
 * Google sign-in with an errorCallbackURL inside the app. Without one, Better
 * Auth sends a refused sign-in (e.g. `account_not_linked`) to its own error
 * page on the Neon Auth host, which strands the user outside the app.
 */
export async function signInWithGoogle(returnTo = "/"): Promise<{ error: string | null }> {
  const client = ba();
  if (!client) return { error: "Database not configured" };
  const origin = window.location.origin;
  const { error } = await client.signIn.social({
    provider: "google",
    callbackURL: origin + safePath(returnTo),
    errorCallbackURL: `${origin}/login`,
  });
  return { error: err(error, "Google sign-in failed") };
}

export interface SignInMethods {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  googleAccountId: string | null;
}

export async function getSignInMethods(): Promise<{ data: SignInMethods | null; error: string | null }> {
  const client = ba();
  if (!client) return { data: null, error: "Database not configured" };
  const [session, accounts] = await Promise.all([client.getSession(), client.listAccounts()]);
  if (session.error || !session.data) return { data: null, error: err(session.error, "Not signed in") };
  if (accounts.error || !accounts.data) return { data: null, error: err(accounts.error, "Couldn't load sign-in methods") };
  const google = accounts.data.find((a) => a.providerId === "google");
  return {
    data: {
      email: session.data.user.email,
      emailVerified: !!session.data.user.emailVerified,
      hasPassword: accounts.data.some((a) => a.providerId === "credential"),
      googleAccountId: google?.accountId ?? null,
    },
    error: null,
  };
}

/** Link Google to the signed-in account. Redirects to Google and back to /profile. */
export async function connectGoogle(): Promise<{ error: string | null }> {
  const client = ba();
  if (!client) return { error: "Database not configured" };
  const origin = window.location.origin;
  const { error } = await client.linkSocial({
    provider: "google",
    callbackURL: `${origin}/profile?signin=google-linked`,
    errorCallbackURL: `${origin}/profile`,
  });
  return { error: err(error, "Couldn't connect Google") };
}

export async function disconnectGoogle(accountId: string): Promise<{ error: string | null }> {
  const client = ba();
  if (!client) return { error: "Database not configured" };
  const { error } = await client.unlinkAccount({ accountId, providerId: "google" });
  return { error: err(error, "Couldn't disconnect Google") };
}

/** Email a 6-digit code: to verify the address, or to add/reset a password. */
export async function sendEmailCode(email: string, purpose: "verify" | "password"): Promise<{ error: string | null }> {
  const client = ba();
  if (!client) return { error: "Database not configured" };
  const { error } = await client.emailOtp.sendVerificationOtp({
    email,
    type: purpose === "verify" ? "email-verification" : "forget-password",
  });
  return { error: err(error, "Couldn't send the code") };
}

export async function verifyEmailWithCode(email: string, otp: string): Promise<{ error: string | null }> {
  const client = ba();
  if (!client) return { error: "Database not configured" };
  const { error } = await client.emailOtp.verifyEmail({ email, otp: otp.trim() });
  return { error: err(error, "That code didn't work") };
}

/** Set a password with an emailed code. Also adds a password to a Google-only account. */
export async function setPasswordWithCode(email: string, otp: string, password: string): Promise<{ error: string | null }> {
  const client = ba();
  if (!client) return { error: "Database not configured" };
  const { error } = await client.emailOtp.resetPassword({ email, otp: otp.trim(), password });
  return { error: err(error, "Couldn't set the password") };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ error: string | null }> {
  const client = ba();
  if (!client) return { error: "Database not configured" };
  const { error } = await client.changePassword({ currentPassword, newPassword, revokeOtherSessions: false });
  return { error: err(error, "Couldn't change the password") };
}

/** Plain-language text for the `?error=` codes Better Auth appends to errorCallbackURL. */
export function describeAuthError(code: string): string {
  switch (code.toLowerCase()) {
    case "account_not_linked":
      return "This Google account's email already has an OptIn account with a password. Sign in with your email and password, then go to Profile → Sign-in methods → Connect Google. After that, either way works.";
    case "email_doesn't_match":
    case "email_does_not_match":
      return "That Google account uses a different email from your OptIn account. Connect the Google account with the same email.";
    case "account_already_linked_to_different_user":
      return "That Google account is already connected to a different OptIn account.";
    case "unable_to_link_account":
    case "linking-failed":
      return "Google couldn't be connected to this account. Try again, or verify your email first.";
    case "access_denied":
      return "Google sign-in was cancelled.";
    default:
      return "Google sign-in didn't complete. Please try again.";
  }
}
