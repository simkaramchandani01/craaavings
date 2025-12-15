import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AppSidebar from "@/components/AppSidebar";
import type { Database } from "@/integrations/supabase/types";

type Community = Database["public"]["Tables"]["communities"]["Row"];
type CommunityWithMembers = Community & {
  member_count?: number;
};

const MyCommunities = () => {
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
      await loadMyCommunities(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadMyCommunities(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadMyCommunities = async (userId: string) => {
    setIsLoading(true);
    try {
      // Get communities user is a member of
      const { data: memberships, error: memberError } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setCommunities([]);
        setIsLoading(false);
        return;
      }

      const communityIds = memberships.map((m) => m.community_id);

      const { data: communitiesData, error: communitiesError } = await supabase
        .from("communities")
        .select("*")
        .in("id", communityIds);

      if (communitiesError) throw communitiesError;

      // Get member counts
      const communitiesWithData = await Promise.all(
        (communitiesData || []).map(async (community) => {
          const { count } = await supabase
            .from("community_members")
            .select("*", { count: "exact", head: true })
            .eq("community_id", community.id);

          return {
            ...community,
            member_count: count || 0,
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

      await loadMyCommunities(user.id);
    } catch (error: any) {
      toast({
        title: "Failed to leave community",
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Communities</h1>
          <p className="text-muted-foreground">
            Communities you've joined
          </p>
        </div>

        {communities.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">No communities yet</h3>
            <p className="text-muted-foreground mb-4">
              Browse and join communities to see them here!
            </p>
            <Button onClick={() => navigate("/communities")}>
              Browse Communities
            </Button>
          </Card>
        ) : (
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
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCommunities;
