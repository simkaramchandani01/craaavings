import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, ArrowLeft, Bookmark } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AppSidebar from "@/components/AppSidebar";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  recipe_id: string | null;
  is_read: boolean;
  created_at: string;
  recipe?: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
  } | null;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
};

const Chat = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [friend, setFriend] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      if (friendId) {
        await loadFriend(friendId);
        await loadMessages(session.user.id, friendId);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [friendId, navigate]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!user || !friendId) return;

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === friendId) ||
            (newMsg.sender_id === friendId && newMsg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, friendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadFriend = async (id: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", id)
      .single();

    if (error) {
      toast({ title: "Error loading friend", variant: "destructive" });
      return;
    }

    setFriend(data);
  };

  const loadMessages = async (userId: string, otherId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          recipe:recipe_id (id, title, description, image_url)
        `)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", otherId)
        .eq("receiver_id", userId);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !friendId || !newMessage.trim()) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: friendId,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveRecipe = async (recipeId: string) => {
    if (!user) return;

    try {
      // Get the recipe details
      const { data: recipe, error: fetchError } = await supabase
        .from("shared_recipes")
        .select("*")
        .eq("id", recipeId)
        .single();

      if (fetchError) throw fetchError;

      // Save to user's saved recipes
      const { error } = await supabase.from("saved_recipes").insert({
        user_id: user.id,
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        difficulty: recipe.difficulty,
        cook_time: recipe.cook_time,
      });

      if (error) throw error;

      toast({ title: "Recipe saved!", description: "Added to your saved items" });
    } catch (error: any) {
      toast({
        title: "Error saving recipe",
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
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="border-b p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/friends")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {friend && (
            <>
              <Avatar>
                <AvatarImage src={friend.avatar_url || undefined} />
                <AvatarFallback>{friend.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{friend.username}</span>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] ${
                  msg.sender_id === user?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                } rounded-lg p-3`}
              >
                {msg.content && <p>{msg.content}</p>}
                {msg.recipe && (
                  <Card className="mt-2 p-3 bg-background/50">
                    {msg.recipe.image_url && (
                      <img
                        src={msg.recipe.image_url}
                        alt={msg.recipe.title}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    <p className="font-semibold text-foreground">{msg.recipe.title}</p>
                    {msg.recipe.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {msg.recipe.description}
                      </p>
                    )}
                    {msg.sender_id !== user?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => handleSaveRecipe(msg.recipe!.id)}
                      >
                        <Bookmark className="w-4 h-4 mr-2" />
                        Save Recipe
                      </Button>
                    )}
                  </Card>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4 flex gap-3">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
