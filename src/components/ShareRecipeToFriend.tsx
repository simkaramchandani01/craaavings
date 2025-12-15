import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Friend = {
  id: string;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
};

interface ShareRecipeToFriendProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string;
  recipeTitle: string;
}

const ShareRecipeToFriend = ({
  open,
  onOpenChange,
  recipeId,
  recipeTitle,
}: ShareRecipeToFriendProps) => {
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open]);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (error) throw error;

      const friendsWithProfiles = await Promise.all(
        (friendships || []).map(async (f) => {
          const friendUserId = f.user_id === user.id ? f.friend_id : f.user_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", friendUserId)
            .single();

          return { id: f.id, profile: profile! };
        })
      );

      setFriends(friendsWithProfiles);
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

  const handleSendRecipe = async (friendId: string) => {
    setSendingTo(friendId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: friendId,
        content: `Check out this recipe: ${recipeTitle}`,
        recipe_id: recipeId,
      });

      if (error) throw error;

      toast({
        title: "Recipe shared!",
        description: "Recipe sent to your friend",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error sharing recipe",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Recipe with Friend</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : friends.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No friends yet. Add friends to share recipes with them!
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
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
                  onClick={() => handleSendRecipe(friend.profile.id)}
                  disabled={sendingTo === friend.profile.id}
                >
                  {sendingTo === friend.profile.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareRecipeToFriend;
