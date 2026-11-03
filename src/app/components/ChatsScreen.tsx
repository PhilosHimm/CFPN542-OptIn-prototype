import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { Plus, MessageCircle, Search as SearchIcon, Check, Users, ChevronRight, Clock3, MoreVertical, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { useAuth } from "../contexts/AuthContext";
import { searchProfiles, getProfilesByIds } from "../services/profiles.service";
import { players as mockPlayers } from "../data/activities";
import {
  acceptMessageRequest,
  declineMessageRequest,
  getFriendIds,
  getIncomingMessageRequests,
  getOutgoingMessageRequestUserIds,
  sendMessageRequest,
  type MessageRequestItem,
} from "../services/friendships.service";
import { demoConversations, type DemoConversation, type ChatMessage } from "../data/activities";
import { getDirectMessages, getGroupMessages, sendMessage as sendServiceMessage, createConversation as createServiceConv, leaveConversation } from "../services/messages.service";
import { poll } from "@/lib/db";
import { toast } from "sonner";
import { ChatView } from "./ChatView";

type UserOption = {
  id: string;
  name: string;
  avatar?: string;
  username: string;
  color?: string;
};

type RelationshipStatus = "friend" | "incoming" | "outgoing" | "none" | "self";

type ChatSession = {
  id: string;
  isGroup: boolean;
  name: string;
  initials: string;
  color: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  participants: string[];
  messages: ChatMessage[];
  unread: number;
};

function sessionToConvo(session: ChatSession): DemoConversation {
  return {
    id: session.id,
    type: session.isGroup ? "group" : "direct",
    name: session.name,
    initials: session.initials,
    color: session.color,
    lastMessage: session.lastMessage,
    lastMessageTime: session.timestamp,
    unread: session.unread,
    messages: session.messages,
  };
}

function requestToConvo(request: MessageRequestItem): DemoConversation {
  return {
    id: request.id,
    type: "direct",
    name: request.requesterName,
    initials: request.requesterName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    color: "#6B7280",
    lastMessage: "Wants to message you",
    lastMessageTime: "",
    unread: 1,
    messages: [],
  };
}

export function ChatsScreen() {
  const location = useLocation();
  const { profile, isDemo } = useAuth();
  const initialTab = (location.state as { tab?: string } | null)?.tab === "groups" ? "groups" : "direct";
  const [activeTab, setActiveTab] = useState<"direct" | "groups">(initialTab);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Demo mode: mutable copy of conversations so sending messages works
  const [demoConvos, setDemoConvos] = useState<DemoConversation[]>(demoConversations);

// Live mode: persistent chat sessions
  const [chats, setChats] = useState<ChatSession[]>([]);

  const loadChats = async () => {
    if (isDemo || !profile?.id) return;
    await Promise.all([
      getDirectMessages(profile.id),
      getGroupMessages(profile.id)
    ]).then(([direct, group]) => {
      const liveChats = [...direct, ...group].map((m) => ({
        id: m.id,
        isGroup: m.type === "group",
        name: m.name,
        initials: m.initials,
        color: m.color,
        lastMessage: m.lastMessage,
        timestamp: m.timestamp,
        participants: [],
        messages: [],
        unread: m.unread,
      }));
      // Keep any messages already loaded into open sessions; the list itself
      // (names, previews, unread counts, order) comes from the server.
      setChats((prev) => liveChats.map((c) => ({ ...c, messages: prev.find((p) => p.id === c.id)?.messages ?? [] })));
    });
  };

  // Load conversations, then poll so new chats, previews and unread counts
  // from other people show up without a reload (there is no realtime).
  useEffect(() => {
    if (isDemo || !profile?.id) return;
    return poll(loadChats, 10_000);
  }, [isDemo, profile?.id]);

  // Create chat sheet state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsersList, setSelectedUsersList] = useState<UserOption[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState<UserOption[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MessageRequestItem[]>([]);
  const [outgoingRequestIds, setOutgoingRequestIds] = useState<string[]>([]);
  const [composerFeedback, setComposerFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);

  // Load friend profiles as suggested users in live mode
  const [suggestedUsers, setSuggestedUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    if (isDemo || !profile?.id || friendIds.length === 0) return;
    // Fetch friend profiles for suggestions when no search query
    getProfilesByIds(friendIds.slice(0, 10)).then((results) => {
      setSuggestedUsers(
        results.map((r) => ({
          id: r.id,
          name: r.name,
          avatar: r.avatar_url ?? undefined,
          color: r.color,
          username: r.username ? `@${r.username}` : `@${r.name.toLowerCase().replace(/\s+/g, "")}`,
        }))
      );
    });
  }, [friendIds, isDemo, profile?.id]);

  // Demo mode: filter mock players by query. Live mode: use database results or suggested friends.
  const usersToDisplay: UserOption[] = isDemo
    ? mockPlayers
        .filter((p) => p.id !== profile?.id)
        .filter(
          (p) =>
            !searchQuery ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10)
        .map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          username: `@${p.name.toLowerCase().replace(/\s+/g, "_")}`,
        }))
    : searchQuery.trim() ? searchedUsers : suggestedUsers;

  const getRelationshipStatus = (userId: string): RelationshipStatus => {
    if (!profile) return "none";
    if (userId === profile.id) return "self";
    if (friendIds.includes(userId)) return "friend";
    if (incomingRequests.some((request) => request.requesterId === userId)) return "incoming";
    if (outgoingRequestIds.includes(userId)) return "outgoing";
    return "none";
  };

  const isFriend = (userId: string) => getRelationshipStatus(userId) === "friend";

  const loadRelationships = async () => {
    if (!profile) return;
    const [friends, incoming, outgoing] = await Promise.all([
      getFriendIds(profile.id),
      getIncomingMessageRequests(profile.id),
      getOutgoingMessageRequestUserIds(profile.id),
    ]);
    setFriendIds(friends);
    setIncomingRequests(incoming);
    setOutgoingRequestIds(outgoing);
  };

  useEffect(() => {
    loadRelationships();
  }, [profile?.id]);

  // Auto-search the database in live mode with debounce
  useEffect(() => {
    if (isDemo) return;
    setComposerFeedback(null);
    if (!searchQuery.trim()) {
      setSearchedUsers([]);
            return;
    }
    setIsSearchingUsers(true);
    const timer = setTimeout(async () => {
      const results = await searchProfiles(searchQuery.trim(), profile?.id);
      setSearchedUsers(
        results.map((r) => ({
          id: r.id,
          name: r.name,
          avatar: r.avatar_url ?? undefined,
          color: r.color,
          username: r.username
            ? `@${r.username}`
            : `@${r.name.toLowerCase().replace(/\s+/g, "")}`,
        }))
      );

      setIsSearchingUsers(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isDemo, profile?.id]);

  // Reset sheet state on close
  useEffect(() => {
    if (!isSheetOpen) {
      setSelectedUsersList([]);
      setSearchQuery("");
      setSearchedUsers([]);
            setComposerFeedback(null);
    }
  }, [isSheetOpen]);

  const toggleUserSelection = (user: UserOption) => {
    const status = getRelationshipStatus(user.id);
    if (status === "self" || status === "incoming" || status === "outgoing") return;
    setComposerFeedback(null);
    setSelectedUsersList((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const startChat = async () => {
    if (selectedUsersList.length === 0 || !profile || isSubmitting) return;
    setIsSubmitting(true);
    setComposerFeedback(null);

    const isGroup = selectedUsersList.length > 1;
    const selectedChatUsers = selectedUsersList;
    if (selectedChatUsers.length === 0) { setIsSubmitting(false); return; }

    const hasNonFriendInSelection = selectedChatUsers.some((user) => !isFriend(user.id));
    if (isGroup && hasNonFriendInSelection) {
      setComposerFeedback("Group chats can only include friends. Send requests first.");
      setIsSubmitting(false);
      return;
    }

    if (!isGroup && !isFriend(selectedChatUsers[0].id)) {
      const result = await sendMessageRequest(profile.id, selectedChatUsers[0].id);
      if (result.status === "sent") setComposerFeedback(`Message request sent to ${selectedChatUsers[0].name}.`);
      else if (result.status === "accepted") {
        // They had already sent us a request; it was accepted instead.
        setComposerFeedback(`${selectedChatUsers[0].name} had already asked you. You're now friends.`);
        loadChats();
      }
      else if (result.status === "already_pending") setComposerFeedback("A message request is already pending.");
      else if (result.status === "already_friends") setComposerFeedback("You are already friends. Try again to start a chat.");
      else if (result.status === "invalid") setComposerFeedback("Select a valid user.");
      else setComposerFeedback(result.error ?? "Unable to send message request.");
      await loadRelationships();
      setSelectedUsersList([]);
      setIsSubmitting(false);
      return;
    }

    const chatName = isGroup
      ? selectedChatUsers.map((u) => u.name.split(" ")[0]).join(", ")
      : selectedChatUsers[0].name;

    if (isDemo) {
      const newId = Date.now().toString();
      const newConvo: DemoConversation = {
        id: newId,
        type: isGroup ? "group" : "direct",
        name: chatName,
        initials: chatName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
        color: "#007AFF",
        lastMessage: "Chat started",
        lastMessageTime: "Just now",
        unread: 0,
        messages: [],
      };
      setDemoConvos((prev) => [newConvo, ...prev]);
      setActiveChatId(newId);
    } else {
      const participantIds = [profile.id, ...selectedChatUsers.map((u) => u.id)];
      createServiceConv(isGroup, chatName, participantIds, profile.id).then(({ id: newId, error }) => {
          if (newId) {
            const newSession: ChatSession = {
              id: newId,
              isGroup,
              name: chatName,
              initials: chatName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
              color: isGroup ? "#007AFF" : (selectedChatUsers[0].color ?? "#007AFF"),
              avatar: isGroup ? "" : (selectedChatUsers[0].avatar ?? ""), 
              lastMessage: "Chat created",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              participants: participantIds,
              messages: [],
              unread: 0,
            };
            // An existing 1:1 chat is reused rather than duplicated.
            setChats((prev) => (prev.some((c) => c.id === newId) ? prev : [newSession, ...prev]));
            setActiveChatId(newId);
          } else {
            toast.error(error ?? "Failed to start chat.");
          }
        });
    }

    setIsSheetOpen(false);
    setSelectedUsersList([]);
    setSearchQuery("");
    setComposerFeedback(null);
    setActiveTab(isGroup ? "groups" : "direct");
    setIsSubmitting(false);
  };

  const handleAcceptRequest = async (request: MessageRequestItem) => {
    if (!profile || requestActionId) return;
    setRequestActionId(request.id);
    const { error, conversationId } = await acceptMessageRequest(request.id, profile.id);
    if (error) {
      toast.error(error);
    } else if (conversationId) {
      // Use the real conversation id: a Date.now() placeholder meant messages
      // sent from this chat went to a conversation that didn't exist.
      const newSession: ChatSession = {
        id: conversationId,
        isGroup: false,
        name: request.requesterName,
        initials: request.requesterName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
        color: "#6B7280",
        avatar: request.requesterAvatar,
        lastMessage: "You accepted the message request",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        participants: [request.requesterId],
        messages: [],
        unread: 0,
      };
      setChats((prev) => (prev.some((c) => c.id === conversationId) ? prev : [newSession, ...prev]));
      loadChats();
    }
    await loadRelationships();
    setRequestActionId(null);
  };

  const handleDeclineRequest = async (request: MessageRequestItem) => {
    if (!profile || requestActionId) return;
    setRequestActionId(request.id);
    await declineMessageRequest(request.id, profile.id);
    await loadRelationships();
    setRequestActionId(null);
  };

  // Send a message in the active conversation (works for both demo and live mode)
  const handleSendMessage = async (conversationId: string, content: string) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: profile?.id ?? "me",
      senderName: profile?.name || "You",
      senderInitials: profile?.initials || "?",
      senderColor: profile?.color || "#007AFF",
      content,
      timestamp: now,
      isMe: true,
    };
    if (isDemo) {
      setDemoConvos((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, newMsg], lastMessage: content, lastMessageTime: "Just now" }
            : c
        )
      );
    } else {
      // Optimistic UI for chat list
      setChats((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, newMsg], lastMessage: content, timestamp: "Just now" }
            : c
        )
      );
      if (profile?.id) {
        const { error } = await sendServiceMessage(conversationId, profile.id, content);
        if (error) toast.error(`Message not sent: ${error}`);
      }
    }
  };

  // Show chat view when a conversation is open
  if (activeChatId) {
    if (isDemo) {
      const convo = demoConvos.find((c) => c.id === activeChatId);
      if (convo) {
        return (
          <ChatView
            conversation={convo}
            onBack={() => setActiveChatId(null)}
            onSendMessage={handleSendMessage}
            onDelete={(id) => {
              setDemoConvos((prev) => prev.filter((c) => c.id !== id));
              setActiveChatId(null);
            }}
          />
        );
      }
    } else {
      // Live mode: check regular chats first
      const chat = chats.find((c) => c.id === activeChatId);
      if (chat) {
        return (
          <ChatView
            conversation={sessionToConvo(chat)}
            onBack={() => setActiveChatId(null)}
            onSendMessage={handleSendMessage}
            onDelete={async (id) => {
              // Leave on the server too; removing it only locally made it
              // reappear on the next load.
              if (profile?.id) {
                const { error } = await leaveConversation(id, profile.id);
                if (error) { toast.error(error); return; }
              }
              setChats((prev) => prev.filter((c) => c.id !== id));
              setActiveChatId(null);
            }}
          />
        );
      }
      // Live mode: check incoming requests
      const request = incomingRequests.find((r) => r.id === activeChatId);
      if (request) {
        return (
          <ChatView
            conversation={requestToConvo(request)}
            onBack={() => setActiveChatId(null)}
            onSendMessage={() => {}}
            isRequest
            onAccept={async () => {
              await handleAcceptRequest(request);
              setActiveChatId(null);
            }}
            onDecline={async () => {
              await handleDeclineRequest(request);
              setActiveChatId(null);
            }}
          />
        );
      }
    }
  }

  // Demo conversations split by type
  const demoDirects = demoConvos.filter((c) => c.type === "direct");
  const demoGroups = demoConvos.filter((c) => c.type === "group");
  const currentDemoConvos = activeTab === "direct" ? demoDirects : demoGroups;

  // Live-mode chats split by type
  const liveDirects = chats.filter((c) => !c.isGroup);
  const liveGroups = chats.filter((c) => c.isGroup);
  const currentChats = activeTab === "groups" ? liveGroups : liveDirects;

  const totalUnread = demoConvos.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-surface px-4 pt-[48px] pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-title-lg font-medium text-on-surface">Messages</h1>
            {isDemo && totalUnread > 0 && (
              <span className="bg-primary text-on-primary text-label-sm font-medium px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="w-10 h-10 rounded-md3-full flex items-center justify-center hover:bg-on-surface/8 active:bg-on-surface/12 transition-colors min-w-[48px] min-h-[48px]">
                <Plus className="w-6 h-6 text-on-surface-variant" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[28px] px-0 flex flex-col gap-0 max-w-[600px] mx-auto sm:border-x sm:border-outline-variant">
              <div className="px-4 pb-4">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-title-lg text-left">New Message</SheetTitle>
                </SheetHeader>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/60" />
                  <Input
                    placeholder="Search users..."
                    className="pl-10 h-12 bg-surface-container rounded-md3-large border-none ring-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-surface"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 px-4">
                {selectedUsersList.length > 0 && (
                  <div className="flex gap-2 pb-4 overflow-x-auto scrollbar-hide flex-nowrap mb-2">
                    {selectedUsersList.map((u) => (
                      <div key={u.id} className="relative inline-block" onClick={() => toggleUserSelection(u)}>
                        <Avatar className="w-14 h-14 border-2 border-surface">
                          <AvatarImage src={u.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">{u.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute top-0 right-0 bg-error rounded-full p-0.5 w-5 h-5 flex items-center justify-center cursor-pointer border-2 border-surface">
                          <Plus className="w-3 h-3 text-white rotate-45" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {composerFeedback && (
                  <div className="mb-4 rounded-md3-large border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                    {composerFeedback}
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="text-label-md font-medium text-on-surface-variant mb-2 ml-1 uppercase tracking-wider">
                    {searchQuery ? "Search Results" : "Suggested"}
                  </span>
                  {usersToDisplay.length > 0 ? (
                    usersToDisplay.map((user) => {
                      const isSelected = selectedUsersList.some((u) => u.id === user.id);
                      const relationship = getRelationshipStatus(user.id);
                      const isBlocked = relationship === "incoming" || relationship === "outgoing" || relationship === "self";
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-3 rounded-md3-large transition-colors ${
                            isBlocked ? "opacity-80" : "hover:bg-surface-container-low cursor-pointer active:bg-surface-container"
                          }`}
                          onClick={() => toggleUserSelection(user)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-body-lg font-medium text-on-surface leading-tight">{user.name}</span>
                              <span className="text-body-sm text-on-surface-variant">{user.username}</span>
                              {relationship === "friend" && <span className="text-label-sm text-primary">Friend</span>}
                              {relationship === "outgoing" && <span className="text-label-sm text-on-surface-variant">Request sent</span>}
                              {relationship === "incoming" && <span className="text-label-sm text-on-surface-variant">Respond in requests</span>}
                            </div>
                          </div>
                          {relationship === "outgoing" ? (
                            <div className="flex items-center gap-1 text-on-surface-variant">
                              <Clock3 className="w-4 h-4" />
                              <span className="text-label-sm">Pending</span>
                            </div>
                          ) : relationship === "incoming" ? (
                            <span className="text-label-sm text-on-surface-variant">Request</span>
                          ) : (
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "border-outline-variant"}`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-on-primary" />}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 flex flex-col items-center gap-3">
                      <p className="text-body-md text-on-surface-variant">
                        {isSearchingUsers
                          ? "Searching..."
                          : searchQuery
                          ? "No users found"
                          : isDemo
                          ? "No users found"
                          : "Search to find users"}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {selectedUsersList.length > 0 && (
                <div className="p-4 bg-surface border-t border-outline-variant flex-shrink-0">
                  <Button className="w-full h-12 rounded-md3-full text-label-lg font-medium shadow-md3-1" onClick={startChat} disabled={isSubmitting}>
                    {selectedUsersList.length > 1 ? (
                      <><Users className="w-5 h-5 mr-2" />{isSubmitting ? "Creating Group Chat..." : "Create Group Chat"}</>
                    ) : selectedUsersList.length === 1 && !isFriend(selectedUsersList[0].id) ? (
                      <><MessageCircle className="w-5 h-5 mr-2" />{isSubmitting ? "Sending Request..." : "Send Message Request"}</>
                    ) : (
                      <><MessageCircle className="w-5 h-5 mr-2" />{isSubmitting ? "Starting Chat..." : "Start Chat"}</>
                    )}
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant">
          <button
            onClick={() => setActiveTab("direct")}
            className={`flex-1 pb-3 text-label-lg font-medium relative transition-colors ${activeTab === "direct" ? "text-primary" : "text-on-surface-variant"}`}
          >
            Direct
            {(() => {
              const count = isDemo
                ? demoDirects.reduce((s, c) => s + c.unread, 0)
                : incomingRequests.length + liveDirects.reduce((s, c) => s + c.unread, 0);
              return count > 0 ? (
                <span className="ml-1.5 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              ) : null;
            })()}
            {activeTab === "direct" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-primary rounded-md3-full" />}
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 pb-3 text-label-lg font-medium relative transition-colors ${activeTab === "groups" ? "text-primary" : "text-on-surface-variant"}`}
          >
            Groups
            {(() => {
              const count = isDemo
                ? demoGroups.reduce((s, c) => s + c.unread, 0)
                : liveGroups.reduce((s, c) => s + c.unread, 0);
              return count > 0 ? (
                <span className="ml-1.5 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              ) : null;
            })()}
            {activeTab === "groups" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-primary rounded-md3-full" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Inline request items — shown at the top of the Direct tab in live mode */}
        {!isDemo && activeTab === "direct" && incomingRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low cursor-pointer transition-colors active:bg-surface-container"
            onClick={() => setActiveChatId(request.id)}
          >
            <div className="relative flex-shrink-0">
              <Avatar className="w-14 h-14">
                <AvatarImage src={request.requesterAvatar} />
                <AvatarFallback className="bg-surface-container-high text-on-surface-variant font-medium text-title-md">
                  {request.requesterName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {/* Blue dot indicating unread/pending */}
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full border-2 border-surface" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="text-body-lg font-semibold text-on-surface truncate pr-2">{request.requesterName}</h3>
                <span className="text-label-sm text-primary font-medium flex-shrink-0">Request</span>
              </div>
              <p className="text-body-md text-on-surface-variant truncate">Wants to message you</p>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/40 flex-shrink-0" />
          </div>
        ))}

        {/* Demo conversation list */}
        {isDemo && currentDemoConvos.length > 0 && (
          <div className="flex flex-col">
            {currentDemoConvos.map((convo) => (
              <div
                key={convo.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low cursor-pointer transition-colors active:bg-surface-container"
                onClick={() => {
                  setDemoConvos((prev) => prev.map((c) => c.id === convo.id ? { ...c, unread: 0 } : c));
                  setActiveChatId(convo.id);
                }}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: convo.color }}
                  >
                    {convo.type === "group" ? <Users className="w-6 h-6" /> : convo.initials}
                  </div>
                  {convo.unread > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-on-primary">{convo.unread}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-body-lg truncate pr-2 ${convo.unread > 0 ? "font-semibold text-on-surface" : "font-medium text-on-surface"}`}>
                      {convo.name}
                    </h3>
                    <span className={`text-label-sm flex-shrink-0 ${convo.unread > 0 ? "text-primary font-medium" : "text-on-surface-variant"}`}>
                      {convo.lastMessageTime}
                    </span>
                  </div>
                  <p className={`text-body-md truncate ${convo.unread > 0 ? "text-on-surface font-medium" : "text-on-surface-variant"}`}>
                    {convo.lastMessage}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-on-surface/8 text-on-surface-variant flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-error focus:text-error focus:bg-error/8 gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDemoConvos((prev) => prev.filter((c) => c.id !== convo.id));
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}

        {/* Live mode chat list */}
        {!isDemo && currentChats.length > 0 && (
          <div className="flex flex-col">
            {currentChats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low cursor-pointer transition-colors active:bg-surface-container"
                onClick={() => {
                  setChats((prev) => prev.map((c) => c.id === chat.id ? { ...c, unread: 0 } : c));
                  setActiveChatId(chat.id);
                }}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: chat.color }}
                  >
                    {chat.isGroup ? <Users className="w-6 h-6" /> : chat.initials}
                  </div>
                  {chat.unread > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-on-primary">{chat.unread}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-body-lg truncate pr-2 ${chat.unread > 0 ? "font-semibold text-on-surface" : "font-medium text-on-surface"}`}>{chat.name}</h3>
                    <span className={`text-label-sm flex-shrink-0 ${chat.unread > 0 ? "text-primary font-medium" : "text-on-surface-variant"}`}>{chat.timestamp}</span>
                  </div>
                  <p className={`text-body-md truncate ${chat.unread > 0 ? "text-on-surface font-medium" : "text-on-surface-variant"}`}>{chat.lastMessage}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-on-surface/8 text-on-surface-variant flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-error focus:text-error focus:bg-error/8 gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChats((prev) => prev.filter((c) => c.id !== chat.id));
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {((isDemo && currentDemoConvos.length === 0) ||
          (!isDemo && currentChats.length === 0 && (activeTab !== "direct" || incomingRequests.length === 0))) && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 rounded-md3-full bg-surface-container flex items-center justify-center mb-3">
              <MessageCircle className="w-7 h-7 text-on-surface-variant" />
            </div>
            <p className="text-body-lg font-medium text-on-surface mb-1">
              No {activeTab === "direct" ? "messages" : "group chats"} yet
            </p>
            <p className="text-body-md text-on-surface-variant text-center">
              {activeTab === "direct"
                ? "Messages with other players will appear here."
                : "Join or create a group to start chatting."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
