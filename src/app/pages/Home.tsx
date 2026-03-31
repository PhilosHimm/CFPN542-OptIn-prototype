import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Trophy,
  Plus,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { SportIcon } from "../components/SportIcon";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { getGames, getGroups, createGroup, getInvites, respondToInvite } from "../services/games.service";
import { sports } from "../services/games.service";
import type { GameInvite } from "../services/games.service";
import type { Game, Group, GameStatus } from "../data/games";
import { supabase, isDemoMode } from "@/lib/supabase";

function isGameExpired(game: Game): boolean {
  const today = new Date().toISOString().split("T")[0];
  return game.options.length > 0 && game.options.every((o) => o.date && o.date < today);
}

function StatusBadge({ status }: { status: GameStatus }) {
  const config = {
    proposal: { label: "Voting Open", color: "text-amber-600 bg-amber-100" },
    confirmed: { label: "Confirmed", color: "text-emerald-600 bg-emerald-100" },
    completed: { label: "Played", color: "text-slate-500 bg-slate-100" },
    cancelled: { label: "Cancelled", color: "text-rose-600 bg-rose-100" },
  };
  const { label, color } = config[status] || config.proposal;
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${color}`}>
      {label}
    </span>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSport, setNewGroupSport] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  useEffect(() => {
    getGames().then(setGames);
    getGroups().then(setGroups);
    if (profile) getInvites(profile.id).then(setInvites);
  }, [profile?.id]);

  // Subscribe to new invite inserts for the current user
  useEffect(() => {
    if (!profile || isDemoMode() || !supabase) return;

    const channel = supabase
      .channel(`invites:user-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_players",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          if ((payload.new as any)?.status === "invited") {
            getInvites(profile.id).then(setInvites);
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [profile?.id]);

  const upcomingGames = games.filter((g) => g.status !== "completed" && g.status !== "cancelled" && !isGameExpired(g));
  const completedGames = games.filter((g) => g.status === "completed");

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupSport || !profile) return;
    setCreatingGroup(true);
    const { id, error } = await createGroup({ name: newGroupName.trim(), sport: newGroupSport, createdBy: profile.id });
    setCreatingGroup(false);
    if (!error && id) {
      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupSport("");
      getGroups().then(setGroups);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-6 pt-4 flex justify-between items-end">
        <div>
          <p className="text-black/55 text-sm font-medium">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-black/90">Hey, {profile?.name.split(" ")[0] || "there"}</h1>
        </div>
        <div className="flex gap-3">
          <button
            aria-label="Notifications"
            onClick={() => setShowNotifications(true)}
            className="relative w-11 h-11 glass rounded-full flex items-center justify-center text-black/70 active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            <Bell className="w-5 h-5" />
            {invites.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" aria-hidden="true" />
            )}
          </button>
          <button 
            onClick={() => navigate("/profile")}
            aria-label="View profile"
            className="w-11 h-11 rounded-full border-2 border-white shadow-lg overflow-hidden active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            <UserAvatar
              name={profile?.name || "User"}
              color={profile?.color}
              avatarUrl={profile?.avatar_url}
              textClassName="text-label-md"
            />
          </button>
        </div>
      </header>

      {/* ── My Groups ────────────────────────────────────────────────────────── */}
      <section>
        <div className="px-6 flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-black/80">My Groups</h3>
          <button
            onClick={() => navigate("/profile")}
            className="text-primary text-sm font-semibold flex items-center gap-0.5"
          >
            Manage <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 no-scrollbar">
          {groups.length > 0 && groups.map((group) => (
            <button
              key={group.id}
              className="flex-shrink-0 w-[120px] ios-card flex flex-col items-center gap-3 text-center transition-transform active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-inner shadow-black/5"
                style={{ backgroundColor: group.color }}
              >
                <SportIcon sport={group.sport} className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-black/90 leading-tight">{group.name}</p>
                <p className="text-[11px] font-medium text-black/55 mt-0.5">{group.memberCount} members</p>
              </div>
              {group.nextGame && (
                <div className="bg-black/5 px-2 py-0.5 rounded-md">
                  <p className="text-[9px] font-bold text-black/60 uppercase tracking-tighter">{group.nextGame}</p>
                </div>
              )}
            </button>
          ))}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {groups.length === 0 && (
              <p className="text-xs font-medium text-black/55 text-center mb-1">Create your first group to get started</p>
            )}
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex-shrink-0 w-[120px] rounded-[20px] border-2 border-dashed border-black/10 flex flex-col items-center justify-center gap-2 text-black/55 active:bg-black/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold">New Group</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Upcoming Games ───────────────────────────────────────────────────── */}
      <section className="px-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-black/80">Upcoming Games</h3>
          <button 
            onClick={() => navigate("/calendar")}
            className="text-primary text-sm font-semibold flex items-center gap-0.5"
          >
            Calendar <CalendarIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {upcomingGames.length === 0 ? (
            <div className="ios-card bg-white/30 border-dashed py-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-black/5 flex items-center justify-center text-black/20">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-black/70">No upcoming games yet</p>
                <p className="text-xs font-medium text-black/55 mt-1">Create your first game to get started!</p>
              </div>
              <button onClick={() => navigate("/create")} className="mt-2 px-6 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-md active:scale-95 transition-all">
                Create Game
              </button>
            </div>
          ) : (
            upcomingGames.map((game) => {
              const group = groups.find((g) => g.id === game.groupId);
              const topOption = game.options.length > 0 ? [...game.options].sort((a, b) => b.inVotes - a.inVotes)[0] : null;
              const confirmedOption = game.confirmedOptionId
                ? game.options.find((o) => o.id === game.confirmedOptionId)
                : null;
              const displayOption = confirmedOption || topOption;

              return (
                <button
                  key={game.id}
                  onClick={() => navigate(`/game/${game.id}`)}
                  className="w-full ios-card text-left flex flex-col gap-4 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                >
                  {/* Visual Accent */}
                  <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: game.sportColor }} />

                  <div className="flex justify-between items-start pl-2">
                    <div className="flex gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: game.sportColor }}
                      >
                        <SportIcon sport={game.sport} className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-black/90">{game.title}</h4>
                        <p className="text-xs font-medium text-black/55 mt-0.5">
                          {group?.name} • {game.gameType}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={game.status} />
                  </div>

                  {displayOption && (
                    <div className={`p-3 rounded-xl ml-2 ${game.status === 'proposal' ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Clock className={`w-3.5 h-3.5 ${game.status === 'proposal' ? 'text-amber-600' : 'text-emerald-600'}`} />
                        <span className={`text-xs font-bold ${game.status === 'proposal' ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {displayOption.displayDate} @ {displayOption.startTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-black/55" />
                        <span className="text-xs font-medium text-black/60 truncate">
                          {displayOption.location}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pl-2 mt-1">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {topOption?.voterInitials.slice(0, 4).map((init, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: `hsl(${i * 45}, 70%, 45%)` }}
                          >
                            {init}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-black/55 uppercase tracking-wider">
                        {game.currentPlayers}/{game.maxPlayers} JOINED
                      </span>
                    </div>

                    <div className="bg-black/5 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-bold text-black/60">
                        {game.perPersonCost > 0 ? `$${game.perPersonCost.toFixed(2)}` : 'FREE'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ── Weekly CTA ────────────────────────────────────────────────────────── */}
      <section className="px-6">
        <button 
          onClick={() => navigate("/create")}
          className="w-full bg-primary rounded-3xl p-6 flex items-center gap-4 text-white shadow-xl shadow-primary/20 active:scale-[0.98] transition-all overflow-hidden relative cursor-pointer focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
          <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-white shrink-0">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg">Initiate Weekly Game</p>
            <p className="text-xs text-white/70 font-medium">Auto-fill group recurring schedules</p>
          </div>
          <div className="ml-auto w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
        </button>
      </section>

      {/* ── Recent Games ────────────────────────────────────────────────────────── */}
      {completedGames.length > 0 && (
        <section className="px-6 pb-4">
          <h3 className="text-xl font-bold text-black/80 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {completedGames.map((game) => (
              <button
                key={game.id}
                onClick={() => navigate(`/game/${game.id}`)}
                className="w-full ios-card p-3 flex items-center gap-4 active:scale-[0.98] transition-all opacity-80 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                  <SportIcon sport={game.sport} className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-black/90">{game.title}</p>
                  <p className="text-[11px] font-medium text-black/55">
                    {game.options.length > 0 ? game.options[0].displayDate : "No date"} • {game.currentPlayers} players
                  </p>
                </div>
                <StatusBadge status={game.status} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Notifications Panel ──────────────────────────────────────────────── */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            onKeyDown={(e) => e.key === "Escape" && setShowNotifications(false)}
            tabIndex={-1}
            ref={(el) => el?.focus()}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-lg bg-white rounded-t-3xl z-50 p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black/90">Notifications</h2>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-black/50" />
              </button>
            </div>
            {invites.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <Bell className="w-12 h-12 text-black/10" />
                <p className="font-bold text-black/55">No new notifications</p>
                <p className="text-sm text-black/50">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-96">
                {invites.map((invite) => (
                  <div key={invite.gameId} className="ios-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: invite.sportColor }}
                      >
                        <span className="text-lg">{invite.sportEmoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">Game Invite</p>
                        <p className="font-bold text-black/90 truncate">{invite.title}</p>
                        {invite.bestOptionDisplayDate && (
                          <p className="text-xs font-medium text-black/55">
                            {invite.bestOptionDisplayDate}
                            {invite.bestOptionStartTime ? ` @ ${invite.bestOptionStartTime}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={respondingTo === invite.gameId}
                        onClick={async () => {
                          if (!profile) return;
                          setRespondingTo(invite.gameId);
                          await respondToInvite(invite.gameId, profile.id, true);
                          const [updatedInvites, updatedGames] = await Promise.all([
                            getInvites(profile.id),
                            getGames(),
                          ]);
                          setInvites(updatedInvites);
                          setGames(updatedGames);
                          setRespondingTo(null);
                        }}
                        className="flex-1 py-2.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {respondingTo === invite.gameId ? "..." : "Accept"}
                      </button>
                      <button
                        disabled={respondingTo === invite.gameId}
                        onClick={async () => {
                          if (!profile) return;
                          setRespondingTo(invite.gameId);
                          await respondToInvite(invite.gameId, profile.id, false);
                          getInvites(profile.id).then(setInvites);
                          setRespondingTo(null);
                        }}
                        className="flex-1 py-2.5 rounded-2xl bg-black/5 text-black/60 font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Create Group Modal ───────────────────────────────────────────────── */}
      {showCreateGroup && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCreateGroup(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create Group"
            onKeyDown={(e) => e.key === "Escape" && setShowCreateGroup(false)}
            tabIndex={-1}
            ref={(el) => el?.focus()}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-lg bg-white rounded-t-3xl z-50 p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black/90">Create Group</h2>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-black/50" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-black/60 block mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Sunday Soccer Crew"
                  className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-black/60 block mb-1">Sport</label>
                <div className="flex flex-wrap gap-2">
                  {sports.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setNewGroupSport(s.name)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                        newGroupSport === s.name
                          ? "bg-primary text-white border-primary"
                          : "border-black/10 text-black/60"
                      }`}
                    >
                      {s.emoji} {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || !newGroupSport || creatingGroup}
                className="w-full py-3 bg-primary text-white rounded-full font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
              >
                {creatingGroup ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
