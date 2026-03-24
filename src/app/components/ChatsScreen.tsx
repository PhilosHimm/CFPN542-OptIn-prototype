import { useState } from "react";
import { useLocation } from "react-router";
import { Search, MessageCircle } from "lucide-react";

export function ChatsScreen() {
  const location = useLocation();
  const initialTab = (location.state as { tab?: string } | null)?.tab === "groups" ? "groups" : "direct";
  const [activeTab, setActiveTab] = useState<"direct" | "groups">(initialTab);

  return (
    <div className="flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-surface px-4 pt-[48px] pb-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-title-lg font-medium text-on-surface">Messages</h1>
          <button className="w-10 h-10 rounded-md3-full flex items-center justify-center hover:bg-on-surface/8 active:bg-on-surface/12 transition-colors min-w-[48px] min-h-[48px]">
            <Search className="w-5 h-5 text-on-surface-variant" />
          </button>
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

      {/* Empty State */}
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
    </div>
  );
}
