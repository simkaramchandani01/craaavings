import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Plus, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AppSidebar from "@/components/AppSidebar";
import CreateCommunityDialog from "@/components/CreateCommunityDialog";
import type { Database } from "@/integrations/supabase/types";

type Community = Database["public"]["Tables"]["communities"]["Row"];
type CommunityWithMembers = Community & {
  member_count?: number;
};

const Communities = () => {
  const [user, setUser] = useState<any>(null);
  const [communities, setCommunities] = useState<CommunityWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
      // Get communities user is a member of
      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);

      const joinedIds = (memberships || []).map((m) => m.community_id);

      // Get all public communities that user hasn't joined
      const { data: communitiesData, error: communitiesError } = await supabase
        .from("communities")
        .select("*")
        .eq("is_private", false);

      if (communitiesError) throw communitiesError;

      // Filter to only show communities user hasn't joined
      const notJoinedCommunities = (communitiesData || []).filter(
        (c) => !joinedIds.includes(c.id)
      );

      // Get member counts
      const communitiesWithData = await Promise.all(
        notJoinedCommunities.map(async (community) => {
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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Browse Communities</h1>
            <p className="text-muted-foreground">
              Discover new communities to join
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Community
          </Button>
        </div>

        {communities.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">No new communities</h3>
            <p className="text-muted-foreground">
              You've joined all available communities!
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community) => (
              <Card key={community.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{community.name}</h3>
                      {community.is_private && <Lock className="w-4 h-4 text-muted-foreground" />}
                    </div>
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

                  <Button size="sm" onClick={() => handleJoinCommunity(community.id)}>
                    Join
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <CreateCommunityDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCommunityCreated={() => user && loadCommunities(user.id)}
        />
      </div>
    </div>
  );
};

export default Communities;
