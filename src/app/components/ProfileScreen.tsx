import { ChevronRight, Users, Gamepad2, Bell, Settings, LogOut } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const settingsItems = [
  { icon: Users, label: "Manage my groups" },
  { icon: Gamepad2, label: "Game preferences" },
  { icon: Bell, label: "Notifications" },
  { icon: Settings, label: "Account settings" },
];

export function ProfileScreen() {
  return (
    <div className="flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-[#FFFBFE] px-4 pt-[48px] pb-3">
        <h1 className="text-[22px] font-medium text-[#1C1B1F]">Settings</h1>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center px-4 pt-4 pb-6">
        {/* Avatar */}
        <div className="w-[100px] h-[100px] rounded-full overflow-hidden mb-3 ring-3 ring-[#E8F5E9]">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1756699495345-6877309eb20b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGF0aGxldGUlMjBwb3J0cmFpdCUyMGd5bSUyMGNvbmZpZGVudHxlbnwxfHx8fDE3NzE2MjgxMzZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Player avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-[20px] font-medium text-[#1C1B1F] mb-1">Alex Rivera</h2>
        <p className="text-[13px] text-[#49454F]">@alexrivera</p>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-center gap-8 px-4 mb-6">
        <div className="flex flex-col items-center">
          <span className="text-[28px] font-medium text-[#2D7A3A]">47</span>
          <span className="text-[13px] text-[#49454F]">Games played</span>
        </div>
        <div className="w-px h-[40px] bg-[rgba(0,0,0,0.08)]" />
        <div className="flex flex-col items-center">
          <span className="text-[28px] font-medium text-[#2D7A3A]">23</span>
          <span className="text-[13px] text-[#49454F]">Weeks active</span>
        </div>
      </div>

      {/* Settings List */}
      <div className="mx-4 bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] overflow-hidden mb-8">
        {settingsItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-[#F5F5F5] transition-colors text-left ${
                index < settingsItems.length - 1 ? "border-b border-[rgba(0,0,0,0.06)]" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#2D7A3A]" />
              </div>
              <span className="flex-1 text-[14px] font-medium text-[#1C1B1F]">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-[#49454F]" />
            </button>
          );
        })}
      </div>

      {/* Log Out Button */}
      <div className="px-4 pb-8 flex justify-center">
        <button className="px-8 py-2.5 rounded-full border-2 border-[#B3261E] text-[#B3261E] text-[14px] font-medium hover:bg-[#FFEAEA] transition-colors flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}
