import { db, isDemoMode, poll } from "@/lib/db";
import {
  directMessages as mockDirectMessages,
  groupMessages as mockGroupMessages,
  type Message,
} from "../data/activities";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  isSystem: boolean;
}

export async function getDirectMessages(currentUserId?: string): Promise<Message[]> {
  if (isDemoMode()) return mockDirectMessages;
  return fetchConversations("direct", currentUserId);
}

export async function getGroupMessages(currentUserId?: string): Promise<Message[]> {
  if (isDemoMode()) return mockGroupMessages;
  return fetchConversations("group", currentUserId);
}

async function fetchConversations(type: "direct" | "group", currentUserId?: string): Promise<Message[]> {
  if (!db) return [];

  // Try to grab current user from session if not provided
  if (!currentUserId) {
    const { data: { session } } = await db.auth.getSession();
    currentUserId = session?.user?.id;
  }

  try {
    // Only the latest message per conversation is needed for the list preview;
    // embedding every message of every conversation scaled with chat history.
    const { data, error } = await db
      .from("conversations")
      .select("*, conversation_members(user_id, unread_count, profiles:user_id(name, initials, color)), messages(content, created_at, is_system)")
      .eq("type", type)
      .order("updated_at", { ascending: false })
      .order("created_at", { referencedTable: "messages", ascending: false })
      .limit(1, { referencedTable: "messages" });

    if (error) console.error("fetchConversations error:", error);
    if (error || !data || data.length === 0) return [];

    return data.map((conv: any) => {
      const members = conv.conversation_members || [];
      // The embed is already ordered newest-first and limited to one; sorting
      // again keeps the preview right even if a backend ignored the embed limit.
      const lastMsg = [...(conv.messages || [])].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // For direct chats, show the other user's info; for groups, use the conversation name
      let name = conv.name || "Chat";
      let initials = name.slice(0, 2).toUpperCase();
      let color = "#007AFF";

      if (type === "direct" && members.length > 0) {
        // Pick the other member's profile
        let otherMember = members.find((m: any) => m.user_id !== currentUserId && m.profiles);
        // Fallback to first member who has a profile if logic above fails (shouldn't if > 1 members)
        if (!otherMember) {
          otherMember = members.find((m: any) => m.profiles);
        }
        if (otherMember?.profiles) {
          name = otherMember.profiles.name || name;
          initials = otherMember.profiles.initials || initials;
          color = otherMember.profiles.color || color;
        }
      }

      // Calculate unread count specifically for the current user
      const currentUserMember = members.find((m: any) => m.user_id === currentUserId);
      const unreadCount = currentUserMember?.unread_count || 0;

      return {
        id: conv.id,
        type,
        name,
        initials,
        color,
        lastMessage: lastMsg?.content || "No messages yet",
        timestamp: lastMsg ? formatTimestamp(lastMsg.created_at) : "",
        unread: unreadCount,
        isSystemMessage: lastMsg?.is_system || false,
      };
    });
  } catch {

    return [];
  }
}

export async function getChatMessages(conversationId: string, currentUserId: string): Promise<ChatMessage[]> {
  if (isDemoMode()) {
    return [
      { id: "1", senderId: "p8", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#A06C00", content: "New activity proposal posted! \u{1F3C0}", timestamp: "5m ago", isMe: false, isSystem: true },
      { id: "2", senderId: currentUserId, senderName: "You", senderInitials: "M", senderColor: "#007AFF", content: "Just voted In on Option 1 \u2014 Riverside Courts on Thursday works great!", timestamp: "4m ago", isMe: true, isSystem: false },
      { id: "3", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#34C759", content: "Same! Thursday 7pm is perfect \u{1F64C}", timestamp: "3m ago", isMe: false, isSystem: false },
      { id: "4", senderId: "p2", senderName: "Jordan Kim", senderInitials: "JK", senderColor: "#007AFF", content: "I'm a maybe on Thursday, might have to work late \u{1F605}", timestamp: "2m ago", isMe: false, isSystem: false },
      { id: "5", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#5856D6", content: "Saturday option also works if not Thursday", timestamp: "1m ago", isMe: false, isSystem: false },
    ];
  }

  if (!db) return [];

  try {
    const { data, error } = await db
      .from("messages")
      .select("*, profiles:sender_id(name, initials, color)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    return data.map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.profiles?.name || "Unknown",
      senderInitials: m.profiles?.initials || "?",
      senderColor: m.profiles?.color || "#999",
      content: m.content,
      timestamp: formatTimestamp(m.created_at),
      isMe: m.sender_id === currentUserId,
      isSystem: m.is_system,
    }));
  } catch {

    return [];
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<{ error: string | null }> {
  const trimmedContent = content.trim();
  if (!trimmedContent) return { error: null };

  if (isDemoMode()) return { error: null };

  if (!db) return { error: "Unable to connect to the server. Please try again later." };

  try {
    // trg_on_message_insert bumps conversations.updated_at and every other
    // member's unread_count, so the insert is the whole operation.
    const { error } = await db.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: trimmedContent,
    });

    return { error: error?.message ?? null };
  } catch {
    return { error: "Failed to send message. Please try again." };
  }
}

export function subscribeToMessages(
  conversationId: string,
  currentUserId: string,
  onMessage: (message: ChatMessage) => void
) {
  if (isDemoMode()) return { unsubscribe: () => {} };

  if (!db) return { unsubscribe: () => {} };

  // Poll for rows newer than a cursor. The cursor starts a minute in the past to
  // cover the gap since the caller's initial fetch and client/server clock skew;
  // the overlap is harmless because callers dedupe by message id.
  let since = new Date(Date.now() - 60_000).toISOString();
  const stop = poll(async () => {
    if (!db) return;
    const { data, error } = await db
      .from("messages")
      .select("*, profiles:sender_id(name, initials, color)")
      .eq("conversation_id", conversationId)
      .gt("created_at", since)
      .order("created_at", { ascending: true });
    if (error || !data) return;
    for (const row of data) {
      if (row.created_at && row.created_at > since) since = row.created_at;
      onMessage({
        id: row.id,
        senderId: row.sender_id ?? "",
        senderName: row.profiles?.name || "Unknown",
        senderInitials: row.profiles?.initials || "?",
        senderColor: row.profiles?.color || "#999",
        content: row.content,
        timestamp: formatTimestamp(row.created_at ?? new Date().toISOString()),
        isMe: row.sender_id === currentUserId,
        isSystem: row.is_system ?? false,
      });
    }
  });

  return { unsubscribe: stop };
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  if (diffHours < 48) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
/**
 * Open (or create) a chat. Conversations are only created server-side:
 * a 1:1 chat goes through get_or_create_direct_conversation, which reuses the
 * pair's existing conversation instead of making a new one every time, and a
 * group through create_group_conversation. Both require the other people to be
 * friends. `participantIds` may include the caller; they are filtered out.
 */
export async function createConversation(
  isGroup: boolean,
  name: string,
  participantIds: string[],
  currentUserId?: string
): Promise<{ id: string | null; error: string | null }> {
  if (isDemoMode() || !db) return { id: Date.now().toString(), error: null };

  const others = [...new Set(participantIds)].filter((id) => id && id !== currentUserId);
  try {
    const { data, error } = isGroup
      ? await db.rpc("create_group_conversation", { p_name: name, p_member_ids: others })
      : await db.rpc("get_or_create_direct_conversation", { p_other: others[0] });
    if (error) return { id: null, error: error.message };
    return { id: data as string, error: null };
  } catch {
    return { id: null, error: "Failed to start chat. Please try again." };
  }
}

/** Clear the caller's unread badge for a conversation. */
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  if (isDemoMode() || !db) return;
  await db
    .from("conversation_members")
    .update({ unread_count: 0, last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

/** Leave a conversation. It disappears from the caller's list; others keep it. */
export async function leaveConversation(conversationId: string, userId: string): Promise<{ error: string | null }> {
  if (isDemoMode()) return { error: null };
  if (!db) return { error: "Unable to connect to the server. Please try again later." };
  const { data, error } = await db
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .select("id");
  if (error) return { error: error.message };
  return { error: (data?.length ?? 0) > 0 ? null : "Couldn't leave this chat." };
}
