import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Users, MoreHorizontal, BellOff, Trash2, Ban } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { DemoConversation, ChatMessage } from "../data/games";

interface ChatViewProps {
  conversation: DemoConversation;
  onBack: () => void;
  onSendMessage: (conversationId: string, content: string) => void;
  onDelete?: (conversationId: string) => void;
}

export function ChatView({ conversation, onBack, onSendMessage, onDelete }: ChatViewProps) {
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
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

  return (
    <div className="flex flex-col h-screen bg-surface">
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
          {conversation.type === "group" && (
            <p className="text-label-sm text-on-surface-variant">Group</p>
          )}
        </div>

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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {conversation.messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
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
