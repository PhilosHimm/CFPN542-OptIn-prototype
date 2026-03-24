import { useNavigate } from "react-router";
import { ChevronRight, Users, Gamepad2, Bell, Settings, LogOut } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useAuth } from "../contexts/AuthContext";

const settingsItems = [
  { icon: Users, label: "Manage my groups" },
  { icon: Gamepad2, label: "Game preferences" },
  { icon: Bell, label: "Notifications" },
  { icon: Settings, label: "Account settings" },
];

export function ProfileScreen() {
  const navigate = useNavigate();
  const { profile, signOut, isDemo } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
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
    </div>
  );
}
