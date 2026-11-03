import { db, isDemoMode } from "@/lib/db";
import { players as mockPlayers, type Player } from "../data/activities";

export interface ProfileSearchResult {
  id: string;
  name: string;
  username?: string | null;
  color?: string;
  // Other users' emails are deliberately not selected: search results go to
  // anyone signed in.
  avatar_url?: string | null;
}

export async function getPlayers(): Promise<Player[]> {
  if (isDemoMode()) return mockPlayers;
  if (!db) return [];

  try {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .order("name");

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      initials: p.initials,
      color: p.color,
      activitiesPlayed: p.activities_played,
      weeksPlayed: p.weeks_played,
      attendanceRate: p.attendance_rate,
    }));
  } catch {
    return [];
  }
}

export async function getProfilesByIds(ids: string[]): Promise<ProfileSearchResult[]> {
  if (!ids.length) return [];

  if (isDemoMode()) {
    return mockPlayers
      .filter((p) => ids.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name, color: p.color }));
  }

  if (!db) return [];

  try {
    const { data, error } = await db
      .from("profiles")
      .select("id, name, username, color, avatar_url")
      .in("id", ids);

    if (error || !data) return [];

    return data.map((profile: any) => ({
      id: profile.id,
      name: profile.name,
      username: profile.username,
      color: profile.color,
      avatar_url: profile.avatar_url,
    }));
  } catch {
    return [];
  }
}

export async function searchProfiles(
  query: string,
  excludeUserId?: string
): Promise<ProfileSearchResult[]> {
  // The query goes into a PostgREST `or=(...)` filter, where `,` `(` `)` `.`
  // `:` and `*`/`%` are syntax: a name with a comma broke the search, and a
  // crafted one could add filter terms. Keep letters, digits, spaces, `_`, `-`, `'`.
  const normalizedQuery = query.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_'-]/gu, "").trim();
  if (!normalizedQuery) return [];

  if (isDemoMode()) {
    return mockPlayers
      .filter((player) => player.name.toLowerCase().includes(normalizedQuery))
      .filter((player) => player.id !== excludeUserId)
      .map((player) => ({
        id: player.id,
        name: player.name,
        color: player.color,
      }));
  }

  if (!db) return [];

  // Queries the profiles table directly (not filtered by activity membership).
  // The db client auto-attaches the user's JWT so requests are authenticated.
  // The profiles SELECT RLS policy uses USING (true), allowing all users to discover
  // each other by name/username — this is intentional for the friend-search flow.
  try {
    const { data, error } = await db
      .from("profiles")
      .select("id, name, username, color, avatar_url")
      .or(`name.ilike.%${normalizedQuery}%,username.ilike.%${normalizedQuery}%`)
      .limit(20);

    if (error || !data) return [];

    return data
      .filter((profile: any) => profile.id !== excludeUserId)
      .map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        username: profile.username,
        color: profile.color,
          avatar_url: profile.avatar_url,
      }));
  } catch {
    return [];
  }
}

export async function updatePlayerProfile(
  userId: string,
  updates: { name?: string; bio?: string; avatar_url?: string | null }
): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!db) return { error: "Unable to connect to the server." };

  try {
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.name) {
      updateData.initials = updates.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }

    const { error } = await db
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    return { error: error?.message ?? null };
  } catch {
    return { error: "Something went wrong — please try again" };
  }
}
