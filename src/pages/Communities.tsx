import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, LogOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Community = Database["public"]["Tables"]["communities"]["Row"];
type CommunityWithMembers = Community & {
  member_count?: number;
  is_member?: boolean;
};

const Communities = () => {
  const [user, setUser] = useState<any>(null);
  const [communities, setCommunities] = useState<CommunityWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      await loadCommunities(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadCommunities(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadCommunities = async (userId: string) => {
    setIsLoading(true);
    try {
      // Get all communities with member counts
      const { data: communitiesData, error: communitiesError } = await supabase
        .from("communities")
        .select("*");

      if (communitiesError) throw communitiesError;

      // Get member counts and check if user is a member
      const communitiesWithData = await Promise.all(
        (communitiesData || []).map(async (community) => {
          const { count } = await supabase
            .from("community_members")
            .select("*", { count: "exact", head: true })
            .eq("community_id", community.id);

          const { data: memberData } = await supabase
            .from("community_members")
            .select("*")
            .eq("community_id", community.id)
            .eq("user_id", userId)
            .maybeSingle();

          return {
            ...community,
            member_count: count || 0,
            is_member: !!memberData,
          };
        })
      );

      setCommunities(communitiesWithData);
    } catch (error: any) {
      toast({
        title: "Error loading communities",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("community_members").insert({
        community_id: communityId,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Joined community!",
        description: "You can now share recipes and participate in discussions.",
      });

      await loadCommunities(user.id);
    } catch (error: any) {
      toast({
        title: "Failed to join community",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Left community",
        description: "You've successfully left this community.",
      });

      await loadCommunities(user.id);
    } catch (error: any) {
      toast({
        title: "Failed to leave community",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Craving Communities</h1>
            <p className="text-muted-foreground">
              Join communities, share recipes, and connect with fellow food lovers
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <Card key={community.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{community.name}</h3>
                  <Badge variant="secondary" className="mb-3">
                    {community.category}
                  </Badge>
                </div>
              </div>

              <p className="text-muted-foreground mb-4 line-clamp-2">
                {community.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{community.member_count} members</span>
                </div>

                {community.is_member ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/community/${community.slug}`)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLeaveCommunity(community.id)}
                    >
                      Leave
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => handleJoinCommunity(community.id)}>
                    Join
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Communities;
