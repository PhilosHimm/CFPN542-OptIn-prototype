import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, UserPlus, X, Check, UserMinus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { 
  getFriendIds, 
  getIncomingMessageRequests, 
  sendMessageRequest, 
  acceptMessageRequest, 
  declineMessageRequest,
  removeFriend
} from "../services/friendships.service";
import { getProfilesByIds, searchProfiles, type ProfileSearchResult } from "../services/profiles.service";
import { UserAvatar } from "./UserAvatar";

interface FriendsListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FriendsListDialog({ open, onOpenChange }: FriendsListDialogProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"friends" | "search">("friends");
  
  const [friends, setFriends] = useState<ProfileSearchResult[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && profile?.id) {
      loadFriendsAndRequests();
    }
  }, [open, profile?.id]);

  const loadFriendsAndRequests = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const friendIds = await getFriendIds(profile.id);
      const friendsData = await getProfilesByIds(friendIds);
      setFriends(friendsData);

      const incomingRequests = await getIncomingMessageRequests(profile.id);
      setRequests(incomingRequests);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !profile?.id) return;
    
    setLoading(true);
    try {
      const results = await searchProfiles(searchQuery, profile.id);
      // Filter out existing friends
      const friendIds = friends.map(f => f.id);
      setSearchResults(results.filter(r => !friendIds.includes(r.id)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    if (!profile?.id) return;
    await sendMessageRequest(profile.id, userId);
    // Optionally show a toast
    setSearchResults(prev => prev.filter(r => r.id !== userId));
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!profile?.id) return;
    await acceptMessageRequest(requestId, profile.id);
    loadFriendsAndRequests();
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!profile?.id) return;
    await declineMessageRequest(requestId, profile.id);
    loadFriendsAndRequests();
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!profile?.id) return;
    await removeFriend(profile.id, friendId);
    loadFriendsAndRequests();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] w-[90vw] rounded-3xl p-6 flex flex-col max-h-[85vh]">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-title-lg text-on-surface">Friends List</DialogTitle>
        </DialogHeader>

        <div className="flex bg-surface-container-low rounded-xl p-1 mb-4">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-2 text-label-md font-medium rounded-lg transition-colors ${
              activeTab === "friends" ? "bg-surface shadow-sm text-on-surface" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            My Friends
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-2 text-label-md font-medium rounded-lg transition-colors ${
              activeTab === "search" ? "bg-surface shadow-sm text-on-surface" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Find Friends
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hidden-scrollbar flex flex-col gap-4">
          {activeTab === "friends" ? (
            <>
              {requests.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  <h3 className="text-label-md font-semibold text-on-surface-variant uppercase uppercase-tracking">
                    Friend Requests
                  </h3>
                  {requests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <UserAvatar name={req.requesterName} avatarUrl={req.requesterAvatar} />
                        </div>
                        <span className="text-body-md font-medium text-on-surface">{req.requesterName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAcceptRequest(req.id)}
                          className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary rounded-full bg-primary/5"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeclineRequest(req.id)}
                          className="h-8 w-8 text-error hover:bg-error/10 hover:text-error rounded-full bg-error/5"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <h3 className="text-label-md font-semibold text-on-surface-variant uppercase uppercase-tracking">
                  All Friends
                </h3>
                {friends.length > 0 ? (
                  friends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <UserAvatar name={friend.name} avatarUrl={friend.avatar_url} color={friend.color} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-body-md font-medium text-on-surface">{friend.name}</span>
                          {friend.username && <span className="text-label-sm text-on-surface-variant">@{friend.username}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="h-8 w-8 text-error hover:bg-error/10 hover:text-error rounded-full"
                        title="Remove friend"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-on-surface-variant text-body-md">
                    You don't have any friends yet.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4 h-full">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or username..." 
                    className="pl-9 bg-surface-container-lowest border-outline-variant/50 h-10 rounded-xl"
                  />
                </div>
                <Button type="submit" disabled={loading || !searchQuery.trim()} className="h-10 rounded-xl bg-primary text-on-primary hover:bg-primary/90">
                  Search
                </Button>
              </form>

              <div className="flex flex-col gap-2 flex-1">
                {searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div key={result.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                       <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <UserAvatar name={result.name} avatarUrl={result.avatar_url} color={result.color} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-body-md font-medium text-on-surface">{result.name}</span>
                          {result.username && <span className="text-label-sm text-on-surface-variant">@{result.username}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAddFriend(result.id)}
                        className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary rounded-full bg-primary/5"
                        title="Add friend"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : searchQuery && !loading ? (
                  <div className="py-8 text-center text-on-surface-variant text-body-md">
                    No users found matching "{searchQuery}".
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
