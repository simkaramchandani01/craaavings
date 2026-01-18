import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, Check, X, MessageCircle, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AppSidebar from "@/components/AppSidebar";
import UserPreviewCard from "@/components/UserPreviewCard";

type Friend = {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
};

interface UserPreview {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  stats: {
    recipesSaved: number;
    communitiesJoined: number;
    friendsCount: number;
  };
}

const Friends = () => {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userPreview, setUserPreview] = useState<UserPreview | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadFriends(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadFriends(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadFriends = async (userId: string) => {
    setIsLoading(true);
    try {
      // Get accepted friendships where user is either sender or receiver
      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq("status", "accepted");

      if (error) throw error;

      // Get profiles for friends
      const friendsWithProfiles = await Promise.all(
        (friendships || []).map(async (f) => {
          const friendUserId = f.user_id === userId ? f.friend_id : f.user_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", friendUserId)
            .single();

          return { ...f, profile: profile! };
        })
      );

      setFriends(friendsWithProfiles);

      // Get pending requests (where user is the friend_id)
      const { data: pending, error: pendingError } = await supabase
        .from("friendships")
        .select("*")
        .eq("friend_id", userId)
        .eq("status", "pending");

      if (pendingError) throw pendingError;

      const pendingWithProfiles = await Promise.all(
        (pending || []).map(async (f) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", f.user_id)
            .single();

          return { ...f, profile: profile! };
        })
      );

      setPendingRequests(pendingWithProfiles);
    } catch (error: any) {
      toast({
        title: "Error loading friends",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchUsername.trim()) {
      setUserPreview(null);
      return;
    }

    setIsSearching(true);
    try {
      // Find user by username
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, is_private")
        .eq("username", searchUsername.trim())
        .single();

      if (error || !profile) {
        setUserPreview(null);
        toast({
          title: "User not found",
          description: "No user with that username exists",
          variant: "destructive",
        });
        return;
      }

      if (profile.id === user?.id) {
        setUserPreview(null);
        toast({
          title: "That's you!",
          description: "You can't add yourself as a friend",
          variant: "destructive",
        });
        return;
      }

      // Get stats for the user
      const { count: savedCount } = await supabase
        .from("saved_recipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id);

      const { count: communitiesCount } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id);

      const { count: friendsCount } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
        .eq("status", "accepted");

      setUserPreview({
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_private: profile.is_private,
        stats: {
          recipesSaved: savedCount || 0,
          communitiesJoined: communitiesCount || 0,
          friendsCount: friendsCount || 0,
        },
      });
    } catch (error: any) {
      toast({
        title: "Error searching user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async () => {
    if (!user || !userPreview) return;

    setIsAdding(true);
    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from("friendships")
        .select("*")
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userPreview.id}),and(user_id.eq.${userPreview.id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        throw new Error("Friend request already exists");
      }

      // Create friendship request
      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: userPreview.id,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Friend request sent!",
        description: `Request sent to ${userPreview.username}`,
      });

      setSearchUsername("");
      setUserPreview(null);
    } catch (error: any) {
      toast({
        title: "Error adding friend",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;

      toast({ title: "Friend request accepted!" });
      if (user) await loadFriends(user.id);
    } catch (error: any) {
      toast({
        title: "Error accepting request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "declined" })
        .eq("id", friendshipId);

      if (error) throw error;

      toast({ title: "Friend request declined" });
      if (user) await loadFriends(user.id);
    } catch (error: any) {
      toast({
        title: "Error declining request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Friends</h1>
        <p className="text-muted-foreground mb-8">
          Add friends by username and share recipes with them
        </p>

        {/* Add Friend */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add Friend</h2>
          <div className="flex gap-3">
            <Input
              placeholder="Enter username..."
              value={searchUsername}
              onChange={(e) => {
                setSearchUsername(e.target.value);
                setUserPreview(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
            />
            <Button 
              variant="secondary" 
              onClick={handleSearchUser} 
              disabled={isSearching || !searchUsername.trim()}
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* User Preview */}
          {userPreview && (
            <div className="mt-4">
              <UserPreviewCard
                username={userPreview.username}
                avatarUrl={userPreview.avatar_url}
                bio={userPreview.bio}
                isPrivate={userPreview.is_private}
                stats={userPreview.stats}
              />
              <div className="flex gap-3 mt-4">
                <Button onClick={handleAddFriend} disabled={isAdding}>
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Friend Request
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/profile/${userPreview.id}`)}
                >
                  View Profile
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pending Requests</h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="p-4 flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                    onClick={() => navigate(`/profile/${request.profile.id}`)}
                  >
                    <Avatar>
                      <AvatarImage src={request.profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {request.profile.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{request.profile.username}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAcceptRequest(request.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeclineRequest(request.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Friends</h2>
          {friends.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No friends yet. Add someone by their username!</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {friends.map((friend) => (
                <Card key={friend.id} className="p-4 flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                    onClick={() => navigate(`/profile/${friend.profile.id}`)}
                  >
                    <Avatar>
                      <AvatarImage src={friend.profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {friend.profile.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{friend.profile.username}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/chat/${friend.profile.id}`)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Friends;
