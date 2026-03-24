import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { players as mockPlayers, type Player } from "../data/games";

export async function getPlayers(): Promise<Player[]> {
  if (!isSupabaseConfigured()) return mockPlayers;

  const { data, error } = await supabase!
    .from("profiles")
    .select("*")
    .order("name");

  if (error || !data) return mockPlayers;

  return data.map((p: any) => ({
    id: p.id,
    name: p.name,
    initials: p.initials,
    color: p.color,
    gamesPlayed: p.games_played,
    weeksPlayed: p.weeks_played,
    attendanceRate: p.attendance_rate,
  }));
}

export async function updatePlayerProfile(
  userId: string,
  updates: { name?: string; bio?: string; avatar_url?: string | null }
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null };

  const updateData: any = { ...updates };
  if (updates.name) {
    updateData.initials = updates.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const { error } = await supabase!
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  return { error: error?.message ?? null };
}
