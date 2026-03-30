import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  SquarePen,
  ArrowLeft,
  Send,
  MoreHorizontal,
  MessageCircle,
  Users2,
  ChevronRight,
  Bell,
  ArrowRight
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getDirectMessages, getGroupMessages, getChatMessages, sendMessage as sendChatMessage, subscribeToMessages, type ChatMessage } from "../services/messages.service";
import type { Message } from "../data/games";

type Tab = "groups" | "direct";

export function Messages() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [openConvo, setOpenConvo] = useState<string | null>(null);
  const [directMsgs, setDirectMsgs] = useState<Message[]>([]);
  const [groupMsgs, setGroupMsgs] = useState<Message[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendCooldown, setSendCooldown] = useState(false);

  useEffect(() => {
    getDirectMessages().then(setDirectMsgs);
    getGroupMessages().then(setGroupMsgs);
  }, []);

  useEffect(() => {
    if (!openConvo || !profile) return;

    let sub: { unsubscribe: () => void } | null = null;

    // Initial fetch
    getChatMessages(openConvo, profile.id).then((initialMsgs) => {
      setChatMessages(initialMsgs);
      
      // Subscribe to real-time updates
      sub = subscribeToMessages(openConvo, profile.id, (newMsg) => {
        setChatMessages((prev) => {
          // Check to prevent actual duplicates
          if (prev.some(m => m.id === newMsg.id)) return prev;
          
          // Remove optimistic message if this is the confirmed real one
          const filtered = prev.filter(m => !(m.id.startsWith("temp-") && m.content === newMsg.content));
          return [...filtered, newMsg];
        });
      });
    });

    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [openConvo, profile]);

  const messages = activeTab === "groups" ? groupMsgs : directMsgs;
  const filtered = messages.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !profile || !openConvo || sendCooldown) return;

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: profile.id,
      senderName: "You",
      senderInitials: profile.initials,
      senderColor: profile.color,
      content: trimmed,
      timestamp: "Just now",
      isMe: true,
      isSystem: false,
    };

    setChatMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");
    setSendCooldown(true);
    setTimeout(() => setSendCooldown(false), 500);

    await sendChatMessage(openConvo, profile.id, trimmed);
  };

  if (openConvo) {
    const convo = messages.find((m) => m.id === openConvo);

    if (!convo) {
      return (
        <div className="flex flex-col h-full bg-[#F2F2F7] items-center justify-center gap-4">
          <MessageCircle className="w-16 h-16 opacity-30" />
          <p className="font-bold uppercase tracking-widest text-xs opacity-30">Conversation not found</p>
          <button
            onClick={() => setOpenConvo(null)}
            className="mt-2 w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-primary active:scale-90 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      );
    }

    const isSendDisabled = sendCooldown || !newMessage.trim();

    return (
      <div className="flex flex-col h-full bg-[#F2F2F7]">
        {/* Chat Header */}
        <header className="glass sticky top-0 z-50 p-4 flex items-center gap-3 border-b border-black/5">
          <button
            onClick={() => setOpenConvo(null)}
            className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-primary active:scale-90 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
              style={{ backgroundColor: convo.color }}
            >
              {convo.initials}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-black/90">{convo.name}</h3>
              <p className="text-[10px] font-medium text-black/55 uppercase tracking-widest">
                {convo.type === "group" ? "8 Members Online" : "Active Now"}
              </p>
            </div>
          </div>
          <button className="w-11 h-11 rounded-full flex items-center justify-center text-black/50">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex justify-center my-4">
            <span className="bg-black/5 px-3 py-1 rounded-full text-[10px] font-bold text-black/50 uppercase tracking-widest">
              Today
            </span>
          </div>

          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {msg.isSystem ? (
                <div className="w-full flex justify-center py-2">
                  <div className="ios-card bg-primary text-white p-4 max-w-[80%] space-y-3 shadow-xl shadow-primary/20">
                    <div className="flex items-center gap-2 border-b border-white/20 pb-2">
                      <Bell className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Game Proposal</span>
                    </div>
                    <p className="text-sm font-bold">{msg.content}</p>
                    <button
                      onClick={() => navigate("/game/game1")}
                      className="w-full bg-white text-primary py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      View Options <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : msg.isMe ? (
                <div className="max-w-[75%] space-y-1">
                  <div className="bg-primary text-white px-4 py-2.5 rounded-[20px] rounded-br-[4px] shadow-lg shadow-primary/10">
                    <p className="text-[15px] font-medium leading-tight">{msg.content}</p>
                  </div>
                  <p className="text-[9px] font-bold text-black/20 text-right uppercase tracking-wider">{msg.timestamp}</p>
                </div>
              ) : (
                <>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mb-4 shadow-sm"
                    style={{ backgroundColor: msg.senderColor }}
                  >
                    {msg.senderInitials}
                  </div>
                  <div className="max-w-[75%] space-y-1">
                    <p className="text-[10px] font-bold text-black/50 ml-1 uppercase tracking-wider">{msg.senderName}</p>
                    <div className="glass px-4 py-2.5 rounded-[20px] rounded-bl-[4px]">
                      <p className="text-[15px] font-medium text-black/80 leading-tight">{msg.content}</p>
                    </div>
                    <p className="text-[9px] font-bold text-black/20 uppercase tracking-wider">{msg.timestamp}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 pb-8 glass border-t border-black/5">
          <div className="flex items-center gap-2 bg-black/5 rounded-[28px] p-1.5 focus-within:bg-white/50 focus-within:ring-1 focus-within:ring-black/5 transition-all">
            <input
              type="text"
              placeholder="Type a message..."
              aria-label="Message input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-[15px] font-medium"
            />
            <button
              onClick={handleSend}
              disabled={isSendDisabled}
              aria-label="Send message"
              className={`w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none ${isSendDisabled ? "opacity-50" : ""}`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-6 pt-4 space-y-5">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black/90">Messages</h1>
            <p className="text-black/55 text-sm font-medium mt-0.5">Stay connected with your teams</p>
          </div>
          <button aria-label="New message" className="w-11 h-11 glass rounded-full flex items-center justify-center text-primary active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none">
            <SquarePen className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Control */}
        <div className="p-1 glass rounded-2xl flex gap-1">
          {(["groups", "direct"] as Tab[]).map((tab) => {
            const isActive = activeTab === tab;
            const groupUnread = groupMsgs.reduce((s: number, m: Message) => s + m.unread, 0);
            const directUnread = directMsgs.reduce((s: number, m: Message) => s + m.unread, 0);
            const unreadCount = tab === "groups" ? groupUnread : directUnread;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-pressed={isActive}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                  isActive ? "bg-white shadow-sm" : "text-black/55"
                }`}
              >
                {tab === "groups" ? <Users2 className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                <span className={`text-[13px] font-bold uppercase tracking-wider ${isActive ? "text-black/90" : ""}`}>
                  {tab === "groups" ? "Groups" : "Direct"}
                </span>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/50 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            aria-label="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 backdrop-blur-md border border-black/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="px-6 space-y-2">
        {filtered.map((msg) => (
          <button
            key={msg.id}
            onClick={() => setOpenConvo(msg.id)}
            className="w-full ios-card !p-3 flex items-center gap-4 active:scale-[0.98] transition-all relative overflow-hidden group"
          >
            {msg.unread > 0 && (
              <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
            )}

            <div className="relative shrink-0">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm"
                style={{ backgroundColor: msg.color }}
              >
                {msg.initials}
              </div>
              {msg.unread > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 border-2 border-white text-[10px] font-black text-white flex items-center justify-center shadow-md">
                  {msg.unread}
                </div>
              )}
            </div>

            <div className="flex-1 text-left min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <h4 className={`text-base tracking-tight ${msg.unread > 0 ? "font-bold text-black" : "font-semibold text-black/80"}`}>
                  {msg.name}
                </h4>
                <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest">{msg.timestamp}</span>
              </div>
              <p className={`text-sm truncate pr-4 ${msg.unread > 0 ? "text-black/60 font-medium" : "text-black/55 font-normal"}`}>
                {msg.isSystemMessage && <span className="text-primary font-bold">New Post: </span>}
                {msg.lastMessage}
              </p>
            </div>

            <ChevronRight className="w-5 h-5 text-black/10 group-active:translate-x-1 transition-transform" />
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="py-20 flex flex-col items-center gap-4 text-center opacity-30">
            <MessageCircle className="w-16 h-16" />
            <p className="font-bold uppercase tracking-widest text-xs">
              {searchQuery
                ? "No conversations found"
                : activeTab === "groups"
                  ? "No group conversations yet. Join a group to start chatting with your teams."
                  : "No direct messages yet. Start a conversation with a friend."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
