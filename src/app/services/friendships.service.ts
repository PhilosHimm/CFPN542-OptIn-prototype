import { db, isDemoMode } from "@/lib/db";
import { createConversation } from "./messages.service";
import { players as mockPlayers } from "../data/activities";

export interface MessageRequestItem {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
}

type RequestStatus = "pending" | "accepted" | "declined";

type DemoFriendRequest = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: RequestStatus;
  createdAt: string;
};

type DemoFriendship = {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: string;
};

const DEMO_REQUESTS_KEY = "optin_friend_requests";
const DEMO_FRIENDS_KEY = "optin_friendships";

function normalizePair(userAId: string, userBId: string): [string, string] {
  return [userAId, userBId].sort() as [string, string];
}

function loadDemoRequests(currentUserId: string): DemoFriendRequest[] {
  const raw = localStorage.getItem(DEMO_REQUESTS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DemoFriendRequest[];
    } catch {
      // ignore malformed local storage and reset below
    }
  }

  const seeded: DemoFriendRequest[] = [
    {
      id: "seed-request-1",
      requesterId: "p2",
      addresseeId: currentUserId,
      status: "pending",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
  localStorage.setItem(DEMO_REQUESTS_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveDemoRequests(requests: DemoFriendRequest[]) {
  localStorage.setItem(DEMO_REQUESTS_KEY, JSON.stringify(requests));
}

function loadDemoFriends(): DemoFriendship[] {
  const raw = localStorage.getItem(DEMO_FRIENDS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as DemoFriendship[];
  } catch {
    return [];
  }
}

function saveDemoFriends(friendships: DemoFriendship[]) {
  localStorage.setItem(DEMO_FRIENDS_KEY, JSON.stringify(friendships));
}

function resolveDemoName(userId: string): string {
  const mockUser = mockPlayers.find((p) => p.id === userId);
  return mockUser?.name ?? "Unknown player";
}

export async function getFriendIds(currentUserId: string): Promise<string[]> {
  if (!currentUserId) return [];

  if (isDemoMode()) {
    return loadDemoFriends()
      .filter((friendship) => friendship.userAId === currentUserId || friendship.userBId === currentUserId)
      .map((friendship) => (friendship.userAId === currentUserId ? friendship.userBId : friendship.userAId));
  }

  if (!db) return [];
  try {
    const { data, error } = await db
      .from("friendships")
      .select("user_a_id, user_b_id")
      .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`);

    if (error || !data) return [];
    return data.map((row: any) => (row.user_a_id === currentUserId ? row.user_b_id : row.user_a_id));
  } catch { return []; }
}

export async function getIncomingMessageRequests(currentUserId: string): Promise<MessageRequestItem[]> {
  if (!currentUserId) return [];

  if (isDemoMode()) {
    const requests = loadDemoRequests(currentUserId)
      .filter((request) => request.addresseeId === currentUserId && request.status === "pending")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return requests.map((request) => ({
      id: request.id,
      requesterId: request.requesterId,
      requesterName: resolveDemoName(request.requesterId),
    }));
  }

  if (!db) return [];
  const { data, error } = await db
    .from("friend_requests")
    .select("id, requester_id, requester:requester_id(name, avatar_url)")
    .eq("addressee_id", currentUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((request: any) => ({
    id: request.id,
    requesterId: request.requester_id,
    requesterName: request.requester?.name ?? "Unknown",
    requesterAvatar: request.requester?.avatar_url ?? undefined,
  }));
}

export async function getOutgoingMessageRequestUserIds(currentUserId: string): Promise<string[]> {
  if (!currentUserId) return [];

  if (isDemoMode()) {
    const requests = loadDemoRequests(currentUserId);
    return requests
      .filter((request) => request.requesterId === currentUserId && request.status === "pending")
      .map((request) => request.addresseeId);
  }

  if (!db) return [];
  const { data, error } = await db
    .from("friend_requests")
    .select("addressee_id")
    .eq("requester_id", currentUserId)
    .eq("status", "pending");

  if (error || !data) return [];

  return data.map((request: any) => request.addressee_id);
}

export async function sendMessageRequest(
  requesterId: string,
  addresseeId: string
): Promise<{ status: "sent" | "already_pending" | "already_friends" | "accepted" | "invalid" | "error"; error?: string }> {
  if (!requesterId || !addresseeId || requesterId === addresseeId) {
    return { status: "invalid" };
  }

  const [userAId, userBId] = normalizePair(requesterId, addresseeId);

  if (isDemoMode()) {
    const friendships = loadDemoFriends();
    const alreadyFriends = friendships.some(
      (friendship) => friendship.userAId === userAId && friendship.userBId === userBId
    );
    if (alreadyFriends) return { status: "already_friends" };

    const requests = loadDemoRequests(requesterId);
    const hasPending = requests.some(
      (request) =>
        request.status === "pending" &&
        ((request.requesterId === requesterId && request.addresseeId === addresseeId) ||
          (request.requesterId === addresseeId && request.addresseeId === requesterId))
    );

    if (hasPending) return { status: "already_pending" };

    requests.push({
      id: `request-${Date.now()}`,
      requesterId,
      addresseeId,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    saveDemoRequests(requests);
    return { status: "sent" };
  }

  if (!db) return { status: "error", error: "Unable to connect" };
  // send_friend_request does the already-friends / already-pending checks and
  // the insert in one transaction. If the other person had already asked us,
  // it accepts their request instead and returns 'accepted'.
  const { data, error } = await db.rpc("send_friend_request", { p_addressee: addresseeId });
  if (error) return { status: "error", error: error.message };
  return { status: data as "sent" | "already_pending" | "already_friends" | "accepted" };
}

export async function acceptMessageRequest(
  requestId: string,
  currentUserId: string
): Promise<{ error: string | null; conversationId?: string }> {
  if (!requestId || !currentUserId) return { error: "Invalid request" };

  if (isDemoMode()) {
    const requests = loadDemoRequests(currentUserId);
    const request = requests.find((item) => item.id === requestId && item.addresseeId === currentUserId);
    if (!request) return { error: "Request not found" };

    request.status = "accepted";
    saveDemoRequests(requests);

    const [userAId, userBId] = normalizePair(request.requesterId, request.addresseeId);
    const friendships = loadDemoFriends();
    const exists = friendships.some((friendship) => friendship.userAId === userAId && friendship.userBId === userBId);

    if (!exists) {
      friendships.push({
        id: `friendship-${Date.now()}`,
        userAId,
        userBId,
        createdAt: new Date().toISOString(),
      });
      saveDemoFriends(friendships);
    }

    // Create a demo conversation so messages have somewhere to go
    const { id: convId } = await createConversation(false, "", [currentUserId, request.requesterId], currentUserId);
    return { error: null, conversationId: convId ?? undefined };
  }

  if (!db) return { error: "Unable to connect" };
  // Marks the request accepted, creates the friendship and returns the pair's
  // direct conversation, all in one transaction.
  const { data, error } = await db.rpc("respond_to_friend_request", { p_request_id: requestId, p_accept: true });
  if (error) return { error: error.message };
  return { error: null, conversationId: (data as string | null) ?? undefined };
}

export async function declineMessageRequest(
  requestId: string,
  currentUserId: string
): Promise<{ error: string | null }> {
  if (!requestId || !currentUserId) return { error: "Invalid request" };

  if (isDemoMode()) {
    const requests = loadDemoRequests(currentUserId);
    const request = requests.find((item) => item.id === requestId && item.addresseeId === currentUserId);
    if (!request) return { error: "Request not found" };

    request.status = "declined";
    saveDemoRequests(requests);
    return { error: null };
  }

  if (!db) return { error: "Unable to connect" };
  const { error } = await db.rpc("respond_to_friend_request", { p_request_id: requestId, p_accept: false });
  return { error: error?.message ?? null };
}

export async function removeFriend(
  currentUserId: string,
  friendId: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) {
    const friendships = loadDemoFriends();
    const updated = friendships.filter(
      (f) =>
        !(f.userAId === currentUserId && f.userBId === friendId) &&
        !(f.userAId === friendId && f.userBId === currentUserId)
    );
    saveDemoFriends(updated);
    return { error: null };
  }

  if (!db) return { error: "Unable to connect" };

  const { data, error } = await db
    .from("friendships")
    .delete()
    .or(`and(user_a_id.eq.${currentUserId},user_b_id.eq.${friendId}),and(user_a_id.eq.${friendId},user_b_id.eq.${currentUserId})`)
    .select("id");

  // A delete RLS filters out reports no error, so check a row actually went.
  if (error) return { error: error.message };
  return { error: (data?.length ?? 0) > 0 ? null : "Couldn't remove this friend." };
}
