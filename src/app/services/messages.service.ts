import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  directMessages as mockDirectMessages,
  groupMessages as mockGroupMessages,
  type Message,
} from "../data/games";

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

export async function getDirectMessages(): Promise<Message[]> {
  if (!isSupabaseConfigured()) return mockDirectMessages;

  // In production, query conversations + last message for each
  const { data, error } = await supabase!
    .from("conversations")
    .select("*, conversation_members(*), messages(content, created_at, is_system)")
    .eq("type", "direct")
    .order("updated_at", { ascending: false });

  if (error || !data) return mockDirectMessages;
  return mockDirectMessages; // fallback until full implementation
}

export async function getGroupMessages(): Promise<Message[]> {
  if (!isSupabaseConfigured()) return mockGroupMessages;

  const { data, error } = await supabase!
    .from("conversations")
    .select("*, conversation_members(*), messages(content, created_at, is_system)")
    .eq("type", "group")
    .order("updated_at", { ascending: false });

  if (error || !data) return mockGroupMessages;
  return mockGroupMessages; // fallback until full implementation
}

export async function getChatMessages(conversationId: string, currentUserId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) {
    return [
      { id: "1", senderId: "p8", senderName: "Sam Wilson", senderInitials: "SW", senderColor: "#A06C00", content: "New game proposal posted! \u{1F3C0}", timestamp: "5m ago", isMe: false, isSystem: true },
      { id: "2", senderId: currentUserId, senderName: "You", senderInitials: "M", senderColor: "#007AFF", content: "Just voted In on Option 1 \u2014 Riverside Courts on Thursday works great!", timestamp: "4m ago", isMe: true, isSystem: false },
      { id: "3", senderId: "p1", senderName: "Alex Rivera", senderInitials: "AR", senderColor: "#34C759", content: "Same! Thursday 7pm is perfect \u{1F64C}", timestamp: "3m ago", isMe: false, isSystem: false },
      { id: "4", senderId: "p2", senderName: "Jordan Kim", senderInitials: "JK", senderColor: "#007AFF", content: "I'm a maybe on Thursday, might have to work late \u{1F605}", timestamp: "2m ago", isMe: false, isSystem: false },
      { id: "5", senderId: "p3", senderName: "Taylor Smith", senderInitials: "TS", senderColor: "#5856D6", content: "Saturday option also works if not Thursday", timestamp: "1m ago", isMe: false, isSystem: false },
    ];
  }

  const { data, error } = await supabase!
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
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null };

  const { error } = await supabase!.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
  });

  if (!error) {
    await supabase!
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  return { error: error?.message ?? null };
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: any) => void
) {
  if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

  const channel = supabase!
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase!.removeChannel(channel);
    },
  };
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
