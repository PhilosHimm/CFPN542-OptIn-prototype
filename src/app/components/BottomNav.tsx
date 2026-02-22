import { useLocation, useNavigate } from "react-router";
import { Home, CalendarDays, Plus, MessageCircle, User } from "lucide-react";

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant bg-surface-container" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex items-center justify-around h-[80px] px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 min-w-[48px] py-2"
            >
              <div
                className={`flex items-center justify-center w-[64px] h-[32px] rounded-md3-full transition-colors ${
                  isActive ? "bg-secondary-container" : "bg-transparent"
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? "text-on-secondary-container" : "text-on-surface-variant"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
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
