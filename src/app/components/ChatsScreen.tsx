import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { Plus, MessageCircle, Search as SearchIcon, Check, Users, ChevronRight, Clock3 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { useAuth } from "../contexts/AuthContext";
import { searchProfiles } from "../services/profiles.service";
import {
  acceptMessageRequest,
  declineMessageRequest,
  getFriendIds,
  getIncomingMessageRequests,
  getOutgoingMessageRequestUserIds,
  sendMessageRequest,
  type MessageRequestItem,
} from "../services/friendships.service";
import { demoConversations, type DemoConversation } from "../data/games";
import { ChatView } from "./ChatView";

const MOCK_USERS = [
  { id: "1", name: "Alex Johnson", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d", username: "@alexj" },
  { id: "2", name: "Sarah Smith", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d", username: "@sarahs" },
  { id: "3", name: "Mike Davis", avatar: "https://i.pravatar.cc/150?u=a04258114e29026702d", username: "@miked" },
  { id: "4", name: "Emily Chen", avatar: "https://i.pravatar.cc/150?u=a048581f4e29026701d", username: "@emilyc" },
  { id: "5", name: "David Wilson", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026703d", username: "@davidw" },
];

type UserOption = {
  id: string;
  name: string;
  avatar?: string;
  username: string;
};

type RelationshipStatus = "friend" | "incoming" | "outgoing" | "none" | "self";

type ChatSession = {
  id: string;
  isGroup: boolean;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  participants: string[];
};

export function ChatsScreen() {
  const location = useLocation();
  const { profile, isDemo } = useAuth();
  const initialTab = (location.state as { tab?: string } | null)?.tab === "groups" ? "groups" : "direct";
  const [activeTab, setActiveTab] = useState<"direct" | "groups">(initialTab);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Demo mode: mutable copy of conversations so sending messages works
  const [demoConvos, setDemoConvos] = useState<DemoConversation[]>(demoConversations);

  // Live mode: persistent chat sessions
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("optin_mock_chats");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!isDemo) {
      localStorage.setItem("optin_mock_chats", JSON.stringify(chats));
    }
  }, [chats, isDemo]);

  // Create chat sheet state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState<UserOption[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MessageRequestItem[]>([]);
  const [outgoingRequestIds, setOutgoingRequestIds] = useState<string[]>([]);
  const [composerFeedback, setComposerFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);

  const filteredUsers = MOCK_USERS.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allUsers: UserOption[] = [...MOCK_USERS, ...searchedUsers].filter(
    (user, index, arr) => arr.findIndex((u) => u.id === user.id) === index
  );

  const usersToDisplay = filteredUsers.length > 0 ? filteredUsers : searchedUsers;

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

  useEffect(() => {
    setSearchedUsers([]);
    setHasSearched(false);
    setComposerFeedback(null);
  }, [searchQuery]);

  const handleSearchAllUsers = async () => {
    const query = searchQuery.trim();
    if (!query || isSearchingUsers) return;
    setIsSearchingUsers(true);
    const results = await searchProfiles(query, profile?.id);
    const mappedUsers: UserOption[] = results
      .map((user) => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar_url ?? undefined,
        username: user.email?.includes("@") ? `@${user.email.split("@")[0]}` : `@${user.name.toLowerCase().replace(/\s+/g, "")}`,
      }))
      .filter((user) => !MOCK_USERS.some((mockUser) => mockUser.id === user.id));
    setSearchedUsers(mappedUsers);
    setHasSearched(true);
    setIsSearchingUsers(false);
  };

  const toggleUserSelection = (userId: string) => {
    const status = getRelationshipStatus(userId);
    if (status === "self" || status === "incoming" || status === "outgoing") return;
    setComposerFeedback(null);
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const startChat = async () => {
    if (selectedUsers.length === 0 || !profile || isSubmitting) return;
    setIsSubmitting(true);
    setComposerFeedback(null);

    const isGroup = selectedUsers.length > 1;
    const selectedChatUsers = allUsers.filter((u) => selectedUsers.includes(u.id));
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
      else if (result.status === "already_pending") setComposerFeedback("A message request is already pending.");
      else if (result.status === "already_friends") setComposerFeedback("You are already friends. Try again to start a chat.");
      else if (result.status === "invalid") setComposerFeedback("Select a valid user.");
      else setComposerFeedback(result.error ?? "Unable to send message request.");
      await loadRelationships();
      setSelectedUsers([]);
      setIsSubmitting(false);
      return;
    }

    const chatName = isGroup
      ? selectedChatUsers.map((u) => u.name.split(" ")[0]).join(", ")
      : selectedChatUsers[0].name;

    const newId = Date.now().toString();

    if (isDemo) {
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
      const newSession: ChatSession = {
        id: newId,
        isGroup,
        name: chatName,
        avatar: isGroup ? "" : (selectedChatUsers[0].avatar ?? ""),
        lastMessage: "Chat created",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        participants: selectedUsers,
      };
      setChats((prev) => [newSession, ...prev]);
    }

    setIsSheetOpen(false);
    setSelectedUsers([]);
    setSearchQuery("");
    setComposerFeedback(null);
    setActiveTab(isGroup ? "groups" : "direct");
    setIsSubmitting(false);
  };

  const handleAcceptRequest = async (request: MessageRequestItem) => {
    if (!profile || requestActionId) return;
    setRequestActionId(request.id);
    const { error } = await acceptMessageRequest(request.id, profile.id);
    if (!error) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        isGroup: false,
        name: request.requesterName,
        avatar: request.requesterAvatar,
        lastMessage: "You accepted the message request",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        participants: [request.requesterId],
      };
      setChats((prev) => [newSession, ...prev]);
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

  // Send a message in the active conversation
  const handleSendMessage = (conversationId: string, content: string) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg = {
      id: Date.now().toString(),
      senderId: "me",
      senderName: profile?.name || "You",
      senderInitials: profile?.initials || "M",
      senderColor: profile?.color || "#007AFF",
      content,
      timestamp: now,
      isMe: true as const,
    };
    setDemoConvos((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, newMsg], lastMessage: content, lastMessageTime: "Just now" }
          : c
      )
    );
  };

  // Show chat view when a conversation is open
  if (activeChatId) {
    const convo = demoConvos.find((c) => c.id === activeChatId);
    if (convo) {
      return (
        <ChatView
          conversation={convo}
          onBack={() => setActiveChatId(null)}
          onSendMessage={handleSendMessage}
        />
      );
    }
  }

  // Demo conversations split by type
  const demoDirects = demoConvos.filter((c) => c.type === "direct");
  const demoGroups = demoConvos.filter((c) => c.type === "group");
  const currentDemoConvos = activeTab === "direct" ? demoDirects : demoGroups;

  // Live-mode chats split by type
  const currentChats = chats.filter((c) => (activeTab === "groups" ? c.isGroup : !c.isGroup));

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
                {selectedUsers.length > 0 && (
                  <div className="flex gap-2 pb-4 overflow-x-auto scrollbar-hide flex-nowrap mb-2">
                    {selectedUsers.map((id) => {
                      const u = allUsers.find((x) => x.id === id);
                      if (!u) return null;
                      return (
                        <div key={id} className="relative inline-block" onClick={() => toggleUserSelection(id)}>
                          <Avatar className="w-14 h-14 border-2 border-surface">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary">{u.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute top-0 right-0 bg-error rounded-full p-0.5 w-5 h-5 flex items-center justify-center cursor-pointer border-2 border-surface">
                            <Plus className="w-3 h-3 text-white rotate-45" />
                          </div>
                        </div>
                      );
                    })}
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
                      const isSelected = selectedUsers.includes(user.id);
                      const relationship = getRelationshipStatus(user.id);
                      const isBlocked = relationship === "incoming" || relationship === "outgoing" || relationship === "self";
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-3 rounded-md3-large transition-colors ${
                            isBlocked ? "opacity-80" : "hover:bg-surface-container-low cursor-pointer active:bg-surface-container"
                          }`}
                          onClick={() => toggleUserSelection(user.id)}
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
                        {searchQuery ? (hasSearched ? "No users found" : "No users found locally") : "No users found"}
                      </p>
                      {searchQuery && !hasSearched && (
                        <Button type="button" variant="outline" className="rounded-md3-full" onClick={handleSearchAllUsers} disabled={isSearchingUsers}>
                          {isSearchingUsers ? "Searching..." : "Search all users"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {selectedUsers.length > 0 && (
                <div className="p-4 bg-surface border-t border-outline-variant flex-shrink-0">
                  <Button className="w-full h-12 rounded-md3-full text-label-lg font-medium shadow-md3-1" onClick={startChat} disabled={isSubmitting}>
                    {selectedUsers.length > 1 ? (
                      <><Users className="w-5 h-5 mr-2" />{isSubmitting ? "Creating Group Chat..." : "Create Group Chat"}</>
                    ) : selectedUsers.length === 1 && !isFriend(selectedUsers[0]) ? (
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
            {isDemo && demoDirects.reduce((s, c) => s + c.unread, 0) > 0 && (
              <span className="ml-1.5 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {demoDirects.reduce((s, c) => s + c.unread, 0)}
              </span>
            )}
            {activeTab === "direct" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-primary rounded-md3-full" />}
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 pb-3 text-label-lg font-medium relative transition-colors ${activeTab === "groups" ? "text-primary" : "text-on-surface-variant"}`}
          >
            Groups
            {isDemo && demoGroups.reduce((s, c) => s + c.unread, 0) > 0 && (
              <span className="ml-1.5 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {demoGroups.reduce((s, c) => s + c.unread, 0)}
              </span>
            )}
            {activeTab === "groups" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-primary rounded-md3-full" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Incoming message requests (live mode only) */}
        {!isDemo && activeTab === "direct" && incomingRequests.length > 0 && (
          <div className="px-4 pt-4">
            <div className="rounded-md3-large border border-outline-variant/80 bg-surface-container-low p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-label-lg font-medium text-on-surface">Message requests</p>
                <span className="text-label-sm text-on-surface-variant">{incomingRequests.length}</span>
              </div>
              <div className="space-y-2">
                {incomingRequests.map((request) => (
                  <div key={request.id} className="flex items-center gap-3 rounded-md3-medium bg-surface p-2">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.requesterAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">{request.requesterName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-medium text-on-surface truncate">{request.requesterName}</p>
                      <p className="text-label-sm text-on-surface-variant">Wants to message you</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="h-8 px-3 rounded-md3-full" onClick={() => handleDeclineRequest(request)} disabled={requestActionId === request.id}>Decline</Button>
                      <Button type="button" className="h-8 px-3 rounded-md3-full" onClick={() => handleAcceptRequest(request)} disabled={requestActionId === request.id}>Accept</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
                <ChevronRight className="w-5 h-5 text-on-surface-variant/40 flex-shrink-0" />
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
                onClick={() => console.log("Open chat", chat.id)}
              >
                <Avatar className="w-14 h-14 border border-outline-variant/30 font-medium flex-shrink-0">
                  {chat.avatar ? (
                    <AvatarImage src={chat.avatar} />
                  ) : (
                    <AvatarFallback className={chat.isGroup ? "bg-tertiary-container text-on-tertiary-container" : "bg-primary-container text-on-primary-container"}>
                      {chat.isGroup ? <Users className="w-6 h-6" /> : chat.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-body-lg font-medium text-on-surface truncate pr-2">{chat.name}</h3>
                    <span className="text-label-sm text-on-surface-variant flex-shrink-0">{chat.timestamp}</span>
                  </div>
                  <p className="text-body-md text-on-surface-variant truncate">{chat.lastMessage}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-on-surface-variant/40" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {((isDemo && currentDemoConvos.length === 0) || (!isDemo && currentChats.length === 0)) && (
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
