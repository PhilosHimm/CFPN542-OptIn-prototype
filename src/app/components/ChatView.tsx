import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Users, MoreHorizontal, BellOff, Trash2, Ban, MessageCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getChatMessages, subscribeToMessages } from "../services/messages.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { DemoConversation, ChatMessage } from "../data/activities";
import { APP_NAME } from "../constants/app";

interface ChatViewProps {
  conversation: DemoConversation;
  onBack: () => void;
  onSendMessage: (conversationId: string, content: string) => void;
  onDelete?: (conversationId: string) => void;
  /** When true, renders accept/decline UI instead of the message input */      
  isRequest?: boolean;
  onAccept?: () => Promise<void> | void;
  onDecline?: () => Promise<void> | void;
}

export function ChatView({ conversation, onBack, onSendMessage, onDelete, isRequest, onAccept, onDecline }: ChatViewProps) {
  const { profile, isDemo } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(conversation.messages || []);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If demo mode, just use passed messages
    if (isDemo || isRequest || !profile) {
      setMessages(conversation.messages || []);
      return;
    }

    let sub: { unsubscribe: () => void } | null = null;
    let cancelled = false;
    getChatMessages(conversation.id, profile.id).then((initialMsgs) => {
      // Unmounted before the fetch resolved — don't start a poller nobody stops.
      if (cancelled) return;
      setMessages(initialMsgs);
      sub = subscribeToMessages(conversation.id, profile.id, (newMsg) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          const filtered = prev.filter(m => !(m.id.startsWith("temp-") && m.content === newMsg.content));
          return [...filtered, newMsg];
        });
      });
    });

    return () => {
      cancelled = true;
      if (sub) sub.unsubscribe();
    };
  }, [conversation.id, isDemo, isRequest, profile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    // Optimistic message — shown immediately, reconciled against the real
    // row that arrives via subscribeToMessages (or, in demo mode, this is
    // the only copy since ChatsScreen's demoConvos update doesn't flow back
    // down into this component's local `messages` state).
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: profile?.id ?? "me",
      senderName: "You",
      senderInitials: profile?.initials || "?",
      senderColor: profile?.color || "#007AFF",
      content: text,
      timestamp: "Just now",
      isMe: true,
      isSystem: false,
    };
    setMessages(prev => [...prev, tempMsg]);

    onSendMessage(conversation.id, text);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    await onAccept?.();
    setAccepting(false);
  };

  const handleDecline = async () => {
    setDeclining(true);
    await onDecline?.();
    setDeclining(false);
  };

  return (
    // Full-screen overlay: ChatsScreen renders this in place of the list, but
    // Layout still renders its fixed BottomNav underneath in normal flow, and
    // this component's parent chain has no fixed height for h-full/h-screen
    // to size against. Pinning to the viewport with fixed inset-0 (above
    // BottomNav's z-50) is what makes the sticky input bar actually stay
    // visible instead of landing underneath the nav on initial render.
    <div className="fixed inset-0 z-[80] flex justify-center bg-surface">
      <div className="flex flex-col h-full w-full max-w-[430px] sm:max-w-lg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface border-b border-outline-variant/50 px-4 pt-[48px] pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-on-surface/8 active:bg-on-surface/12 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6 text-on-surface" />
        </button>

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium text-sm"
          style={{ backgroundColor: conversation.color }}
        >
          {conversation.type === "group" ? (
            <Users className="w-5 h-5" />
          ) : (
            conversation.initials
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-title-md font-medium text-on-surface truncate">{conversation.name}</h2>
          {isRequest ? (
            <p className="text-label-sm text-on-surface-variant">Message request</p>
          ) : conversation.type === "group" ? (
            <p className="text-label-sm text-on-surface-variant">Group</p>
          ) : null}
        </div>

        {!isRequest && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-on-surface/8 active:bg-on-surface/12 transition-colors flex-shrink-0"
                aria-label="More options"
              >
                <MoreHorizontal className="w-5 h-5 text-on-surface-variant" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="gap-2"
                onClick={() => setMuted((m) => !m)}
              >
                <BellOff className="w-4 h-4" />
                {muted ? "Unmute notifications" : "Mute notifications"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-error focus:text-error focus:bg-error/8 gap-2"
                onClick={() => {
                  if (onDelete) onDelete(conversation.id);
                  onBack();
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete conversation
              </DropdownMenuItem>
              {conversation.type === "direct" && (
                <DropdownMenuItem className="text-error focus:text-error focus:bg-error/8 gap-2">
                  <Ban className="w-4 h-4" />
                  Block user
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isRequest && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-medium"
              style={{ backgroundColor: conversation.color }}
            >
              {conversation.initials}
            </div>
            <p className="text-title-md font-medium text-on-surface">{conversation.name}</p>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full">
              <MessageCircle className="w-3.5 h-3.5 text-on-surface-variant" /> 
              <p className="text-label-md text-on-surface-variant">Wants to message you on {APP_NAME}</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar or request accept/decline */}
      {isRequest ? (
        <div className="sticky bottom-0 bg-surface border-t border-outline-variant/50 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <p className="text-body-sm text-on-surface-variant text-center mb-3">
            Accept to start chatting with {conversation.name}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={declining || accepting}
              className="flex-1 h-12 border border-outline text-label-lg font-medium text-on-surface rounded-full flex items-center justify-center hover:bg-on-surface/8 active:bg-on-surface/12 transition-all disabled:opacity-50"
            >
              {declining ? "Declining…" : "Decline"}
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting || declining}
              className="flex-1 h-12 bg-primary text-on-primary text-label-lg font-medium rounded-full flex items-center justify-center hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {accepting ? "Accepting…" : "Accept"}
            </button>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-0 bg-surface border-t border-outline-variant/50 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 h-11 px-4 rounded-full bg-surface-container border border-outline-variant/60 text-body-md text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Send message"
          >
            <Send className="w-5 h-5 text-on-primary" />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[85%] bg-surface-container rounded-2xl px-4 py-2 text-center">
          <p className="text-body-sm text-on-surface-variant">{msg.content}</p>
        </div>
      </div>
    );
  }

  if (msg.isMe) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="bg-primary rounded-2xl rounded-br-sm px-4 py-2.5">
            <p className="text-body-md text-on-primary">{msg.content}</p>
          </div>
          <p className="text-label-sm text-on-surface-variant text-right mt-1 px-1">{msg.timestamp}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-medium"
        style={{ backgroundColor: msg.senderColor }}
      >
        {msg.senderInitials}
      </div>
      <div className="max-w-[75%]">
        <p className="text-label-sm text-on-surface-variant mb-1 px-1">{msg.senderName}</p>
        <div className="bg-surface-container-high rounded-2xl rounded-bl-sm px-4 py-2.5">
          <p className="text-body-md text-on-surface">{msg.content}</p>
        </div>
        <p className="text-label-sm text-on-surface-variant mt-1 px-1">{msg.timestamp}</p>
      </div>
    </div>
  );
}
