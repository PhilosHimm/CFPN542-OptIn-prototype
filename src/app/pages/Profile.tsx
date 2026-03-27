import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ChevronRight,
  Users,
  Bell,
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
  FlaskConical,
} from "lucide-react";
import { SportIcon } from "../components/SportIcon";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../contexts/AuthContext";

export function Profile() {
  const navigate = useNavigate();
  const { profile, signOut, updateProfile, isDemo, supabaseConfigured, toggleDemoMode } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(profile?.name || "Marcus Johnson");
  const [bio, setBio] = useState(profile?.bio || "Pickup basketball fanatic \u{1F3C0} \u00B7 Tuesday Hoops organizer");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Resize image to max 400x400 to keep base64 string size reasonable
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        await updateProfile({ avatar_url: dataUrl });
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (editMode) {
      await updateProfile({ name, bio });
    }
    setEditMode(!editMode);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const stats = [
    { label: "Games\nPlayed",    value: String(profile?.games_played ?? 47),  Icon: Trophy, color: "#FF9500", bg: "bg-amber-100/50" },
    { label: "Weeks\nPlayed",    value: String(profile?.weeks_played ?? 31),  Icon: Calendar, color: "#007AFF", bg: "bg-blue-100/50" },
    { label: "Attendance\nRate", value: `${profile?.attendance_rate ?? 89}%`, Icon: Percent,  color: "#34C759", bg: "bg-emerald-100/50" },
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
          onClick={handleSave}
          aria-label={editMode ? "Save profile changes" : "Edit profile"}
          className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
            editMode ? "bg-primary text-white shadow-lg" : "glass text-primary"
          }`}
        >
          {editMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          <span>{editMode ? "Save" : "Edit"}</span>
        </button>
      </header>

      {/* Profile Info */}
      <section className="px-6 flex flex-col items-center">
        <div 
          className="relative mb-6 cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-28 h-28 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-gradient-to-br from-primary to-indigo-600 p-0.5 transition-transform group-active:scale-95">
            <UserAvatar
              name={profile?.name || "User"}
              color={profile?.color}
              avatarUrl={profile?.avatar_url}
              textClassName="text-headline-lg"
              className="rounded-full"
            />
          </div>
          {editMode && (
            <button className="absolute bottom-1 right-1 w-9 h-9 bg-primary text-white rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none pointer-events-none" aria-label="Change profile photo">
              <Camera className="w-4 h-4" />
            </button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            accept="image/*" 
            className="hidden" 
          />
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
              className="w-full flex items-center gap-4 p-4 active:bg-black/5 transition-colors text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
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
          {/* Demo / Live Mode Toggle */}
          <div
            className="w-full flex items-center gap-4 p-4"
            onClick={() => supabaseConfigured && toggleDemoMode(!isDemo)}
            style={{ cursor: supabaseConfigured ? "pointer" : "not-allowed" }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDemo ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
              <FlaskConical className="w-5 h-5" style={{ color: isDemo ? "#FF9500" : "#34C759" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-black/80">Demo Mode</p>
              <p className="text-[11px] font-medium text-black/30">
                {isDemo ? "Pre-built sample data" : "Live Supabase data"}
              </p>
            </div>
            <div
              role="switch"
              aria-checked={isDemo}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                isDemo ? "bg-amber-400" : "bg-emerald-500"
              } ${!supabaseConfigured ? "opacity-40" : ""}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  isDemo ? "translate-x-1" : "translate-x-6"
                }`}
              />
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 p-4 active:bg-rose-50 transition-colors text-left text-rose-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none"
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
