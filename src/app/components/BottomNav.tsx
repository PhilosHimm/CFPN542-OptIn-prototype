import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Home, CalendarDays, Plus, MessageCircle, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { poll } from "@/lib/db";
import { getUnreadTotal } from "../services/messages.service";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  { icon: Plus, label: "Create", path: "/create" },
  { icon: MessageCircle, label: "Chats", path: "/chats" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isDemo } = useAuth();
  const [unread, setUnread] = useState(0);

  // Unread messages badge on the Chats tab, so a new message is visible from
  // anywhere in the app, not only once you open the chat. Polls (no realtime)
  // and refreshes on every navigation, so it clears right after reading a chat.
  useEffect(() => {
    if (isDemo || !profile?.id) { setUnread(0); return; }
    return poll(() => getUnreadTotal(profile.id).then(setUnread), 15_000, { immediate: true });
  }, [isDemo, profile?.id, location.pathname]);

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-lg z-50 border-t border-outline-variant bg-surface-container" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center justify-around h-[80px] px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const badge = item.path === "/chats" ? unread : 0;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              aria-label={badge > 0 ? `${item.label}, ${badge} unread` : item.label}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-1 min-w-[48px] py-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none rounded-lg"
            >
              <div
                className={`relative flex items-center justify-center w-[64px] h-[32px] rounded-md3-full transition-colors ${
                  isActive ? "bg-secondary-container" : "bg-transparent"
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? "text-on-secondary-container" : "text-on-surface-variant"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {badge > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 right-3 min-w-[16px] h-4 px-1 rounded-md3-full bg-error text-on-error text-[10px] font-bold leading-4 text-center"
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span
                className={`text-label-md leading-none transition-colors ${
                  isActive ? "text-on-surface font-medium" : "text-on-surface-variant"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
