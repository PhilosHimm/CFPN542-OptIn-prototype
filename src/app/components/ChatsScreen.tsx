import { useState } from "react";
import { Search } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const directMessages = [
  {
    id: 1,
    name: "Marcus Johnson",
    avatar: "https://images.unsplash.com/photo-1590156552211-69280532a54a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGF0aGxldGljJTIwbWFuJTIwcG9ydHJhaXQlMjBzbWlsaW5nfGVufDF8fHx8MTc3MTYyODEyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    message: "Hey, are you coming to the game this Sunday?",
    time: "2m ago",
    unread: true,
  },
  {
    id: 2,
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1759476531403-b1f88092f992?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHdvbWFuJTIwYXRobGV0ZSUyMHBvcnRyYWl0JTIwb3V0ZG9vcnxlbnwxfHx8fDE3NzE2MjgxMjd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    message: "I reserved the court for 7pm 🏐",
    time: "15m ago",
    unread: true,
  },
  {
    id: 3,
    name: "David Okafor",
    avatar: "https://images.unsplash.com/photo-1595956936239-4cad0fa009e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllbmRseSUyMG1hbiUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBkaXZlcnNlfGVufDF8fHx8MTc3MTYyODEzMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    message: "Good game yesterday! Same time next week?",
    time: "1h ago",
    unread: false,
  },
];

const groupMessages = [
  {
    id: 1,
    name: "Sunday Soccer Crew",
    avatar: "https://images.unsplash.com/photo-1546957221-37816b007052?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNyZWF0aW9uYWwlMjBzb2NjZXIlMjB0ZWFtJTIwZ3JvdXAlMjBwaG90b3xlbnwxfHx8fDE3NzE2MjgxMjh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    message: "Marcus: I'll bring the extra jerseys",
    time: "5m ago",
    unread: true,
  },
  {
    id: 2,
    name: "Pickup Hoops",
    avatar: "https://images.unsplash.com/photo-1765605898805-86923208c52b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwY291cnQlMjBvdXRkb29yJTIwcmVjcmVhdGlvbnxlbnwxfHx8fDE3NzE2MjgxMjh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    message: "Sarah: Who needs a ride to the court?",
    time: "30m ago",
    unread: false,
  },
];

export function ChatsScreen() {
  const [activeTab, setActiveTab] = useState<"direct" | "groups">("direct");
  const messages = activeTab === "direct" ? directMessages : groupMessages;

  return (
    <div className="flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-[#FFFBFE] px-4 pt-[48px] pb-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[22px] font-medium text-[#1C1B1F]">Messages</h1>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F5F5F5]">
            <Search className="w-5 h-5 text-[#49454F]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[rgba(0,0,0,0.08)]">
          <button
            onClick={() => setActiveTab("direct")}
            className={`flex-1 pb-3 text-[14px] font-medium relative transition-colors ${
              activeTab === "direct" ? "text-[#2D7A3A]" : "text-[#49454F]"
            }`}
          >
            Direct
            {activeTab === "direct" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-[#2D7A3A] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 pb-3 text-[14px] font-medium relative transition-colors ${
              activeTab === "groups" ? "text-[#2D7A3A]" : "text-[#49454F]"
            }`}
          >
            Groups
            {activeTab === "groups" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-[#2D7A3A] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex flex-col">
        {messages.map((msg) => (
          <button
            key={msg.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F5] transition-colors text-left"
          >
            {/* Avatar */}
            <div className="w-[48px] h-[48px] rounded-full overflow-hidden flex-shrink-0">
              <ImageWithFallback
                src={msg.avatar}
                alt={msg.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#1C1B1F] truncate">
                  {msg.name}
                </span>
                <span className="text-[12px] text-[#49454F] flex-shrink-0 ml-2">{msg.time}</span>
              </div>
              <p className="text-[13px] text-[#49454F] truncate mt-0.5">{msg.message}</p>
            </div>

            {/* Unread dot */}
            {msg.unread && (
              <div className="w-[10px] h-[10px] rounded-full bg-[#2D7A3A] flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
