import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  ChevronRight, 
  Users, 
  Settings, 
  Bell, 
  UserCircle, 
  LogOut, 
  Camera, 
  Trophy, 
  Calendar, 
  Percent, 
  Edit3, 
  Check,
  Activity,
  Shield,
  CreditCard,
  MessageSquare
} from "lucide-react";
import { SportIcon } from "../components/SportIcon";

export function Profile() {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("Marcus Johnson");
  const [bio, setBio] = useState("Pickup basketball fanatic 🏀 · Tuesday Hoops organizer");

  const stats = [
    { label: "Games\nPlayed",    value: "47",  Icon: Trophy, color: "#FF9500", bg: "bg-amber-100/50" },
    { label: "Weeks\nPlayed",    value: "31",  Icon: Calendar, color: "#007AFF", bg: "bg-blue-100/50" },
    { label: "Attendance\nRate", value: "89%", Icon: Percent,  color: "#34C759", bg: "bg-emerald-100/50" },
  ];

  const settingsItems = [
    {
      Icon: Users,
      label: "Manage My Groups",
      sublabel: "Tuesday Hoops, Weekend Warriors, Net Gang",
      color: "#007AFF",
      bg: "bg-blue-500/10",
    },
    {
      Icon: Activity,
      label: "Game Preferences",
      sublabel: "Sports, skill level, max distance",
      color: "#5856D6",
      bg: "bg-indigo-500/10",
    },
    {
      Icon: Bell,
      label: "Notifications",
      sublabel: "Game proposals, reminders, messages",
      color: "#FF9500",
      bg: "bg-amber-500/10",
    },
    {
      Icon: Shield,
      label: "Account & Privacy",
      sublabel: "Email, security, and visibility",
      color: "#34C759",
      bg: "bg-emerald-500/10",
    },
    {
      Icon: CreditCard,
      label: "Payments & Wallet",
      sublabel: "Payment methods, transaction history",
      color: "#FF2D55",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top App Bar ─────────────────────────────────────────────────────── */}
      <header className="px-6 pt-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-black/90">Profile</h1>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all active:scale-95 ${
            editMode ? "bg-primary text-white shadow-lg" : "glass text-primary"
          }`}
        >
          {editMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          <span>{editMode ? "Save" : "Edit"}</span>
        </button>
      </header>

      {/* Profile Info */}
      <section className="px-6 flex flex-col items-center">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-gradient-to-br from-primary to-indigo-600 p-0.5">
            <img 
              src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop" 
              alt="Profile" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          {editMode && (
            <button className="absolute bottom-1 right-1 w-9 h-9 bg-primary text-white rounded-full border-4 border-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
              <Camera className="w-4 h-4" />
            </button>
          )}
        </div>

        {editMode ? (
          <div className="w-full space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-center bg-white/50 backdrop-blur-md border border-black/5 rounded-2xl px-4 py-3 text-xl font-bold outline-none focus:ring-2 focus:ring-primary/10"
            />
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full text-center bg-white/50 backdrop-blur-md border border-black/5 rounded-2xl px-4 py-3 text-sm font-medium text-black/40 outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        ) : (
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-black/90 tracking-tight">{name}</h2>
            <p className="text-sm font-medium text-black/40 max-w-[250px]">{bio}</p>
          </div>
        )}
      </section>

      {/* Stats Section */}
      <section className="px-6">
        <div className="flex gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`flex-1 rounded-3xl p-4 flex flex-col items-center text-center gap-1 ${stat.bg}`}
            >
              <stat.Icon className="w-5 h-5 mb-1" style={{ color: stat.color }} />
              <p className="text-2xl font-black tracking-tighter" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-black/30 leading-tight">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Groups Summary */}
      <section className="px-6">
        <div className="ios-card space-y-4">
          <div className="flex justify-between items-center border-b border-black/5 pb-2">
            <h3 className="text-xs font-bold text-black/30 uppercase tracking-widest">Active Groups</h3>
            <span className="text-xs font-bold text-primary">3 Total</span>
          </div>
          <div className="flex gap-4">
            {[
              { name: "Tuesday Hoops",    sport: "Basketball", color: "#F97316" },
              { name: "Weekend Warriors", sport: "Soccer",     color: "#22C55E" },
              { name: "Net Gang",         sport: "Volleyball", color: "#3B82F6" },
            ].map((group) => (
              <div key={group.name} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: group.color }}
                >
                  <SportIcon sport={group.sport} className="w-7 h-7" />
                </div>
                <p className="text-[10px] font-bold text-black/60 text-center leading-tight">{group.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Settings Menu */}
      <section className="px-6 space-y-4">
        <h3 className="text-xs font-bold text-black/30 uppercase tracking-widest ml-1">Settings</h3>
        <div className="ios-card !p-0 overflow-hidden divide-y divide-black/5">
          {settingsItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-4 p-4 active:bg-black/5 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg}`}>
                <item.Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-black/80">{item.label}</p>
                <p className="text-[11px] font-medium text-black/30 truncate">{item.sublabel}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-black/10" />
            </button>
          ))}
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-4 p-4 active:bg-rose-50 transition-colors text-left text-rose-500"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold">Sign Out</span>
            <ChevronRight className="w-5 h-5 opacity-20 ml-auto" />
          </button>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="px-6 py-8 text-center space-y-2 opacity-20">
        <div className="flex justify-center items-center gap-2">
          <Activity className="w-6 h-6" />
          <span className="text-xl font-black italic tracking-tighter">OptIn</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Liquid Glass v26.4</p>
      </footer>
    </div>
  );
}
