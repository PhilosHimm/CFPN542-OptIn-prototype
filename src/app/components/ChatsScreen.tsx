import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Plus, MessageCircle, Search as SearchIcon, Check, Users, ChevronRight } from "lucide-react";
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

const MOCK_USERS = [
  { id: "1", name: "Alex Johnson", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d", username: "@alexj" },
  { id: "2", name: "Sarah Smith", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d", username: "@sarahs" },
  { id: "3", name: "Mike Davis", avatar: "https://i.pravatar.cc/150?u=a04258114e29026702d", username: "@miked" },
  { id: "4", name: "Emily Chen", avatar: "https://i.pravatar.cc/150?u=a048581f4e29026701d", username: "@emilyc" },
  { id: "5", name: "David Wilson", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026703d", username: "@davidw" },
];

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
  const navigate = useNavigate();
  const initialTab = (location.state as { tab?: string } | null)?.tab === "groups" ? "groups" : "direct";
  const [activeTab, setActiveTab] = useState<"direct" | "groups">(initialTab);
  
  // Persistent chat sessions
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("optin_mock_chats");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("optin_mock_chats", JSON.stringify(chats));
  }, [chats]);
  
  // Create chat sheet state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const filteredUsers = MOCK_USERS.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const startChat = () => {
    if (selectedUsers.length === 0) return;

    const isGroup = selectedUsers.length > 1;
    const selectedMockUsers = MOCK_USERS.filter(u => selectedUsers.includes(u.id));
    
    let chatName = "";
    let chatAvatar = "";
    
    if (isGroup) {
      chatName = selectedMockUsers.map(u => u.name.split(' ')[0]).join(', ');
      // You can add a default group avatar if desired
    } else {
      chatName = selectedMockUsers[0].name;
      chatAvatar = selectedMockUsers[0].avatar;
    }

    const newSession: ChatSession = {
      id: Date.now().toString(),
      isGroup,
      name: chatName,
      avatar: chatAvatar,
      lastMessage: "Chat created",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      participants: selectedUsers,
    };

    setChats((prev) => [newSession, ...prev]);
    setIsSheetOpen(false);
    setSelectedUsers([]);
    setSearchQuery("");
    setActiveTab(isGroup ? "groups" : "direct");
  };

  const currentChats = chats.filter(c => (activeTab === "groups" ? c.isGroup : !c.isGroup));

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-surface px-4 pt-[48px] pb-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-title-lg font-medium text-on-surface">Messages</h1>
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
                    {selectedUsers.map(id => {
                      const u = MOCK_USERS.find(x => x.id === id);
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
                      )
                    })}
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="text-label-md font-medium text-on-surface-variant mb-2 ml-1 uppercase tracking-wider">
                    {searchQuery ? "Search Results" : "Suggested"}
                  </span>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const isSelected = selectedUsers.includes(user.id);
                      return (
                        <div 
                          key={user.id} 
                          className="flex items-center justify-between p-3 rounded-md3-large hover:bg-surface-container-low cursor-pointer transition-colors active:bg-surface-container"
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
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-outline-variant'} `}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-on-primary" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
             <div className="py-10 flex flex-col items-center">
                  <p className="text-body-md text-on-surface-variant">No users found</p>
                </div>
                  )}
                </div>
              </ScrollArea>
              
              {selectedUsers.length > 0 && (
                <div className="p-4 bg-surface border-t border-outline-variant flex-shrink-0">
                  <Button 
                    className="w-full h-12 rounded-md3-full text-label-lg font-medium shadow-md3-1"
                    onClick={startChat}
                  >
                    {selectedUsers.length > 1 ? (
                      <>
                        <Users className="w-5 h-5 mr-2" />
                        Create Group Chat
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Start Chat
                      </>
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
            className={`flex-1 pb-3 text-label-lg font-medium relative transition-colors ${
              activeTab === "direct" ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            Direct
            {activeTab === "direct" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-primary rounded-md3-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 pb-3 text-label-lg font-medium relative transition-colors ${
              activeTab === "groups" ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            Groups
            {activeTab === "groups" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-primary rounded-md3-full" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {currentChats.length > 0 ? (
          <div className="flex flex-col">
            {currentChats.map((chat) => (
              <div 
                key={chat.id} 
                className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low cursor-pointer transition-colors active:bg-surface-container"
                onClick={() => console.log("Open chat", chat.id)}
              >
                <Avatar className="w-14 h-14 border border-outline-variant/30 font-medium">
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
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 h-full">
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
