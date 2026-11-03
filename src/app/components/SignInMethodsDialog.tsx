import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  changePassword,
  connectGoogle,
  disconnectGoogle,
  getSignInMethods,
  sendEmailCode,
  setPasswordWithCode,
  verifyEmailWithCode,
  type SignInMethods,
} from "@/lib/authMethods";

type Panel = null | "change-password" | "add-password" | "verify-email";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function SignInMethodsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [methods, setMethods] = useState<SignInMethods | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await getSignInMethods();
    setMethods(data);
    setLoadError(error);
  };

  useEffect(() => {
    if (open) load();
    else resetPanel();
  }, [open]);

  function resetPanel() {
    setPanel(null);
    setCodeSent(false);
    setCode("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFormError(null);
  }

  const openPanel = (p: Panel) => { resetPanel(); setPanel(p); };

  const run = async (fn: () => Promise<{ error: string | null }>, success: string, after?: () => void) => {
    setBusy(true);
    setFormError(null);
    const { error } = await fn();
    setBusy(false);
    if (error) { setFormError(error); return false; }
    toast.success(success);
    after?.();
    return true;
  };

  const passwordProblem = (): string | null => {
    if (newPassword.length < 8) return "Use at least 8 characters.";
    if (newPassword !== confirmPassword) return "The passwords don't match.";
    return null;
  };

  const email = methods?.email ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] w-[90vw] rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-2 text-left">
          <DialogTitle className="text-title-lg text-on-surface">Sign-in methods</DialogTitle>
          <DialogDescription className="text-body-md text-on-surface-variant">
            Use your email and password, Google, or both to sign in to the same account.
          </DialogDescription>
        </DialogHeader>

        {loadError && (
          <p className="bg-error-container text-on-error-container rounded-md3-medium p-3 text-body-md">{loadError}</p>
        )}
        {!methods && !loadError && <p className="text-body-md text-on-surface-variant py-4">Loading…</p>}

        {methods && (
          <div className="space-y-3">
            {/* Email */}
            <div className="rounded-md3-medium bg-surface-container-high p-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-on-surface-variant" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-body-lg text-on-surface truncate">{email}</p>
                  <p className={`text-label-md ${methods.emailVerified ? "text-primary" : "text-on-surface-variant"}`}>
                    {methods.emailVerified ? "Verified" : "Not verified"}
                  </p>
                </div>
                {!methods.emailVerified && panel !== "verify-email" && (
                  <Button variant="outline" className="min-h-[48px]" onClick={() => openPanel("verify-email")}>Verify</Button>
                )}
              </div>
              {!methods.emailVerified && panel !== "verify-email" && (
                <p className="text-body-sm text-on-surface-variant mt-2">
                  Verifying lets "Continue with Google" sign in to this same account.
                </p>
              )}
              {panel === "verify-email" && (
                <div className="mt-3 space-y-3">
                  {!codeSent ? (
                    <Button className="w-full min-h-[48px]" disabled={busy}
                      onClick={async () => { if (await run(() => sendEmailCode(email, "verify"), "Code sent. Check your email.")) setCodeSent(true); }}>
                      Email me a code
                    </Button>
                  ) : (
                    <>
                      <Label htmlFor="verify-code">6-digit code</Label>
                      <Input id="verify-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
                      <Button className="w-full min-h-[48px]" disabled={busy || code.trim().length < 4}
                        onClick={() => run(() => verifyEmailWithCode(email, code), "Email verified", () => { resetPanel(); load(); })}>
                        Verify email
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" className="w-full min-h-[48px]" onClick={resetPanel}>Cancel</Button>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="rounded-md3-medium bg-surface-container-high p-4">
              <div className="flex items-center gap-3">
                <KeyRound className="w-5 h-5 text-on-surface-variant" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-body-lg text-on-surface">Email &amp; password</p>
                  <p className="text-label-md text-on-surface-variant">{methods.hasPassword ? "Set up" : "Not set up"}</p>
                </div>
                {panel !== "change-password" && panel !== "add-password" && (
                  <Button variant="outline" className="min-h-[48px]"
                    onClick={() => openPanel(methods.hasPassword ? "change-password" : "add-password")}>
                    {methods.hasPassword ? "Change" : "Add"}
                  </Button>
                )}
              </div>

              {panel === "change-password" && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                  <Button className="w-full min-h-[48px]" disabled={busy || !currentPassword}
                    onClick={() => {
                      const problem = passwordProblem();
                      if (problem) { setFormError(problem); return; }
                      run(() => changePassword(currentPassword, newPassword), "Password changed", () => { resetPanel(); load(); });
                    }}>
                    Change password
                  </Button>
                  <Button variant="ghost" className="w-full min-h-[48px]" onClick={resetPanel}>Cancel</Button>
                </div>
              )}

              {panel === "add-password" && (
                <div className="mt-3 space-y-3">
                  <p className="text-body-sm text-on-surface-variant">
                    We'll email a code to {email} to confirm it's you, then you can sign in with this email and a password too.
                  </p>
                  {!codeSent ? (
                    <Button className="w-full min-h-[48px]" disabled={busy}
                      onClick={async () => { if (await run(() => sendEmailCode(email, "password"), "Code sent. Check your email.")) setCodeSent(true); }}>
                      Email me a code
                    </Button>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="password-code">6-digit code</Label>
                        <Input id="password-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="add-new-password">Password</Label>
                        <Input id="add-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="add-confirm-password">Confirm password</Label>
                        <Input id="add-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                      </div>
                      <Button className="w-full min-h-[48px]" disabled={busy || code.trim().length < 4}
                        onClick={() => {
                          const problem = passwordProblem();
                          if (problem) { setFormError(problem); return; }
                          run(() => setPasswordWithCode(email, code, newPassword), "Password added", () => { resetPanel(); load(); });
                        }}>
                        Add password
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" className="w-full min-h-[48px]" onClick={resetPanel}>Cancel</Button>
                </div>
              )}
            </div>

            {/* Google */}
            <div className="rounded-md3-medium bg-surface-container-high p-4">
              <div className="flex items-center gap-3">
                <GoogleMark />
                <div className="flex-1">
                  <p className="text-body-lg text-on-surface">Google</p>
                  <p className={`text-label-md ${methods.googleAccountId ? "text-primary" : "text-on-surface-variant"}`}>
                    {methods.googleAccountId ? (
                      <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Connected</span>
                    ) : "Not connected"}
                  </p>
                </div>
                {methods.googleAccountId ? (
                  <Button variant="outline" className="min-h-[48px]" disabled={busy || !methods.hasPassword}
                    onClick={() => run(() => disconnectGoogle(methods.googleAccountId!), "Google disconnected", load)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button variant="outline" className="min-h-[48px]" disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const { error } = await connectGoogle(); // redirects to Google on success
                      setBusy(false);
                      if (error) setFormError(error);
                    }}>
                    Connect
                  </Button>
                )}
              </div>
              {methods.googleAccountId && !methods.hasPassword && (
                <p className="text-body-sm text-on-surface-variant mt-2">
                  Add a password before disconnecting Google, so you can still sign in.
                </p>
              )}
              {!methods.googleAccountId && (
                <p className="text-body-sm text-on-surface-variant mt-2">
                  Use the Google account with the same email ({email}).
                </p>
              )}
            </div>

            {formError && (
              <p role="alert" className="bg-error-container text-on-error-container rounded-md3-medium p-3 text-body-md">{formError}</p>
            )}

            <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              Either method signs you in to the same profile, friends and chats.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
