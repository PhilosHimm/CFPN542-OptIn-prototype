import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Users, Gamepad2, Bell, Settings, LogOut, X } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
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
  const { profile, signOut, isDemo, updateProfile } = useAuth();
  
  // Sheet/Dialog states
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  // Account Settings state
  const [accountName, setAccountName] = useState(profile?.name || "Alex Rivera");
  const [accountEmail, setAccountEmail] = useState(profile?.email || "alex@example.com");

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
    if (updateProfile) {
      await updateProfile({ name: accountName, email: accountEmail });
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
          <ImageWithFallback
            src={profile?.avatar_url || "https://images.unsplash.com/photo-1756699495345-6877309eb20b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGF0aGxldGUlMjBwb3J0cmFpdCUyMGd5bSUyMGNvbmZpZGVudHxlbnwxfHx8fDE3NzE2MjgxMzZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"}
            alt="Player avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-headline-sm font-medium text-on-surface mb-1">
          {profile?.name || "Alex Rivera"}
        </h2>
        <p className="text-label-lg text-on-surface-variant">
          {profile?.email ? `@${profile.email.split("@")[0]}` : "@alexrivera"}
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
            
            <div className="mt-4 pt-4 border-t border-outline-variant/30 flex flex-col gap-3">
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
