import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Users, Gamepad2, Bell, Settings, LogOut, X, FlaskConical } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const settingsItems = [
  { id: "groups", icon: Users, label: "Manage my groups" },
  { id: "preferences", icon: Gamepad2, label: "Game preferences" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "account", icon: Settings, label: "Account settings" },
];

export function ProfileScreen() {
  const navigate = useNavigate();
  const { profile, signOut, isDemo, supabaseConfigured, toggleDemoMode, updateProfile } = useAuth();
  
  // Sheet/Dialog states
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  // Account Settings state
  const [accountName, setAccountName] = useState(profile?.name || "Alex Rivera");
  const [accountEmail, setAccountEmail] = useState(profile?.email || "alex@example.com");
  const [accountUsername, setAccountUsername] = useState(
    profile?.username || profile?.email?.split("@")[0] || ""
  );
  const [usernameError, setUsernameError] = useState("");

  // Group Management mock data
  const [myGroups, setMyGroups] = useState([
    { id: "1", name: "Weekend Warriors", members: 12 },
    { id: "2", name: "Thursday Night Soccer", members: 18 },
    { id: "3", name: "Uptown Hoops", members: 8 },
  ]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleActionClick = (id: string) => {
    if (id === "groups") {
      setActiveDialog("groups");
    } else if (id === "account") {
      setActiveDialog("account");
    } else {
      console.log(`Action not implemented: ${id}`);
    }
  };

  const removeGroup = (groupId: string) => {
    setMyGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleSaveAccount = async () => {
    const trimmed = accountUsername.trim().toLowerCase();
    if (trimmed && !/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      setUsernameError("3–20 characters: letters, numbers, underscores only");
      return;
    }
    if (updateProfile) {
      await updateProfile({ name: accountName, email: accountEmail, username: trimmed || null });
    }
    setActiveDialog(null);
  };

  return (
    <div className="flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-surface px-4 pt-[48px] pb-3">
        <h1 className="text-title-lg font-medium text-on-surface">Settings</h1>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center px-4 pt-4 pb-6">
        {/* Avatar */}
        <div className="w-[100px] h-[100px] rounded-md3-full overflow-hidden mb-3 ring-3 ring-primary-container">
          <UserAvatar
            name={profile?.name || "User"}
            color={profile?.color}
            avatarUrl={profile?.avatar_url}
            textClassName="text-headline-md"
          />
        </div>
        <h2 className="text-headline-sm font-medium text-on-surface mb-1">
          {profile?.name || "Alex Rivera"}
        </h2>
        <p className="text-label-lg text-on-surface-variant">
          @{profile?.username || profile?.email?.split("@")[0] || "alexrivera"}
        </p>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-center gap-8 px-4 mb-6">
        <div className="flex flex-col items-center">
          <span className="text-headline-md font-medium text-primary">
            {profile?.games_played ?? 47}
          </span>
          <span className="text-label-lg text-on-surface-variant">Games played</span>
        </div>
        <div className="w-px h-[40px] bg-on-surface/8" />
        <div className="flex flex-col items-center">
          <span className="text-headline-md font-medium text-primary">
            {profile?.weeks_played ?? 23}
          </span>
          <span className="text-label-lg text-on-surface-variant">Weeks active</span>
        </div>
      </div>

      {/* Settings List */}
      <div className="mx-4 bg-surface-container-lowest rounded-md3-large shadow-md3-1 overflow-hidden mb-8">
        {settingsItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleActionClick(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-on-surface/8 active:bg-on-surface/12 transition-colors text-left ${
                index < settingsItems.length - 1 ? "border-b border-outline-variant/50" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-md3-full bg-primary-container flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-on-primary-container" />
              </div>
              <span className="flex-1 text-body-md font-medium text-on-surface">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-on-surface-variant" />
            </button>
          );
        })}
      </div>

      {/* Log Out Button */}
      <div className="px-4 pb-8 flex justify-center">
        <button
          onClick={handleSignOut}
          className="px-8 py-2.5 rounded-md3-full border-2 border-error text-error text-label-lg font-medium hover:bg-error-container transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>

      {/* Manage Groups Dialog */}
      <Dialog open={activeDialog === "groups"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-[400px] w-[90vw] rounded-3xl p-6">
          <DialogHeader className="mb-4 text-left">
            <DialogTitle className="text-title-lg text-on-surface">Manage Groups</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto hidden-scrollbar">
            {myGroups.length > 0 ? (
              myGroups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/50">
                  <div className="flex flex-col">
                    <span className="text-body-lg font-medium text-on-surface">{group.name}</span>
                    <span className="text-label-sm text-on-surface-variant">{group.members} members</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeGroup(group.id)}
                    className="h-10 w-10 text-error hover:bg-error/10 hover:text-error rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-on-surface-variant text-body-md">
                You are not in any groups yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Settings Dialog */}
      <Dialog open={activeDialog === "account"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-[400px] w-[90vw] rounded-3xl p-6">
          <DialogHeader className="mb-4 text-left">
            <DialogTitle className="text-title-lg text-on-surface">Account Settings</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="accountName">Display Name</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="rounded-xl border-outline-variant/50 focus-visible:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="accountUsername">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-md select-none">@</span>
                <Input
                  id="accountUsername"
                  value={accountUsername}
                  onChange={(e) => {
                    setAccountUsername(e.target.value);
                    setUsernameError("");
                  }}
                  className="pl-7 rounded-xl border-outline-variant/50 focus-visible:ring-primary/50"
                  placeholder="your_handle"
                  maxLength={20}
                />
              </div>
              {usernameError && (
                <p className="text-label-sm text-error">{usernameError}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="accountEmail">Email Address</Label>
              <Input
                id="accountEmail"
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                className="rounded-xl border-outline-variant/50 focus-visible:ring-primary/50"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setActiveDialog(null)}
                className="rounded-full border-outline-variant text-on-surface-variant hover:bg-on-surface/5"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAccount}
                className="rounded-full bg-primary text-on-primary hover:bg-primary/90"
              >
                Save Changes
              </Button>
            </div>
            
            {/* Demo / Live Mode Toggle */}
            <div className="mt-2 pt-4 border-t border-outline-variant/30">
              <div
                className="flex items-center gap-4 py-2"
                onClick={() => supabaseConfigured && toggleDemoMode(!isDemo)}
                style={{ cursor: supabaseConfigured ? "pointer" : "not-allowed" }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDemo ? "bg-amber-100" : "bg-green-100"}`}>
                  <FlaskConical className="w-5 h-5" style={{ color: isDemo ? "#F59E0B" : "#22C55E" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium text-on-surface">Demo Mode</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {isDemo ? "Using pre-built sample data" : "Using live Supabase data"}
                  </p>
                  {!supabaseConfigured && (
                    <p className="text-label-sm text-amber-500">No Supabase credentials</p>
                  )}
                </div>
                <div
                  role="switch"
                  aria-checked={isDemo}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                    isDemo ? "bg-amber-400" : "bg-green-500"
                  } ${!supabaseConfigured ? "opacity-40" : ""}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      isDemo ? "translate-x-1" : "translate-x-6"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-outline-variant/30 flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl border-outline-variant/50 text-on-surface"
              >
                Change Password
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl border-error/50 text-error hover:bg-error-container hover:text-error"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
