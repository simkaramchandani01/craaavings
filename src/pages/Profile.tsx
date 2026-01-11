import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, BookOpen, Users, FileText, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AppSidebar from "@/components/AppSidebar";
import RecipeComments from "@/components/RecipeComments";

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  created_at: string;
}

interface ProfileStats {
  recipesSaved: number;
  communitiesJoined: number;
  postsCount: number;
}

interface SharedRecipe {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
  community_id: string;
}

interface MutualCommunity {
  id: string;
  name: string;
  slug: string;
}

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ recipesSaved: 0, communitiesJoined: 0, postsCount: 0 });
  const [recipes, setRecipes] = useState<SharedRecipe[]>([]);
  const [mutualCommunities, setMutualCommunities] = useState<MutualCommunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canViewGallery, setCanViewGallery] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUser(session.user);
      await loadProfile(session.user.id);
    };

    checkAuth();
  }, [userId, navigate]);

  const loadProfile = async (currentUserId: string) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, is_private, created_at")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const isOwnProfile = currentUserId === userId;

      // Check friendship status if not own profile
      if (!isOwnProfile) {
        const { data: friendship } = await supabase
          .from("friendships")
          .select("status")
          .or(`and(user_id.eq.${currentUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUserId})`)
          .eq("status", "accepted")
          .maybeSingle();

        setIsFriend(!!friendship);

        // Determine if can view gallery
        // Can view if: own profile, profile is public, or is accepted friend
        setCanViewGallery(!profileData.is_private || !!friendship);
      } else {
        setCanViewGallery(true);
      }

      // Get stats
      const { count: savedCount } = await supabase
        .from("saved_recipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: communitiesCount } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: postsCount } = await supabase
        .from("shared_recipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      setStats({
        recipesSaved: savedCount || 0,
        communitiesJoined: communitiesCount || 0,
        postsCount: postsCount || 0,
      });

      // Get mutual communities (only if viewing someone else's profile)
      if (!isOwnProfile) {
        // Get current user's communities
        const { data: myMemberships } = await supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", currentUserId);

        // Get target user's communities
        const { data: theirMemberships } = await supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", userId);

        if (myMemberships && theirMemberships) {
          const myIds = new Set(myMemberships.map(m => m.community_id));
          const mutualIds = theirMemberships
            .filter(m => myIds.has(m.community_id))
            .map(m => m.community_id);

          if (mutualIds.length > 0) {
            const { data: communities } = await supabase
              .from("communities")
              .select("id, name, slug")
              .in("id", mutualIds);

            setMutualCommunities(communities || []);
          }
        }

        // Get recipes from mutual communities only
        if (mutualCommunities.length > 0 || canViewGallery) {
          const mutualCommunityIds = mutualCommunities.map(c => c.id);
          
          let query = supabase
            .from("shared_recipes")
            .select("id, title, image_url, created_at, community_id")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

          // If not can view full gallery, filter by mutual communities
          if (!canViewGallery && mutualCommunityIds.length > 0) {
            query = query.in("community_id", mutualCommunityIds);
          }

          const { data: recipesData } = await query;
          setRecipes(recipesData || []);
        }
      } else {
        // Own profile - get all recipes
        const { data: recipesData } = await supabase
          .from("shared_recipes")
          .select("id, title, image_url, created_at, community_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        setRecipes(recipesData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">User not found</h2>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {profile.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h1 className="text-3xl font-bold">{profile.username}</h1>
                {profile.is_private && (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mb-4">
                <Calendar className="w-4 h-4" />
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>

              {profile.bio && (
                <p className="text-muted-foreground mb-4">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex gap-6 justify-center md:justify-start">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{stats.recipesSaved}</span>
                  <span className="text-muted-foreground text-sm">Saved</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{stats.communitiesJoined}</span>
                  <span className="text-muted-foreground text-sm">Communities</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{stats.postsCount}</span>
                  <span className="text-muted-foreground text-sm">Posts</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Mutual Communities (only shown for other users) */}
        {currentUser?.id !== userId && mutualCommunities.length > 0 && (
          <Card className="p-4 mb-8">
            <h3 className="font-semibold mb-3">Mutual Communities</h3>
            <div className="flex flex-wrap gap-2">
              {mutualCommunities.map((community) => (
                <Badge
                  key={community.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => navigate(`/community/${community.slug}`)}
                >
                  {community.name}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Recipe Gallery */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recipes</h2>
          
          {!canViewGallery && profile.is_private ? (
            <Card className="p-12 text-center">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Private Profile</h3>
              <p className="text-muted-foreground">
                {isFriend 
                  ? "You can only see posts from mutual communities."
                  : "Add this user as a friend to see their recipes."}
              </p>
            </Card>
          ) : recipes.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No recipes posted yet.</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="aspect-square relative rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => setSelectedRecipe(selectedRecipe === recipe.id ? null : recipe.id)}
                  >
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <p className="text-sm font-medium truncate">{recipe.title}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comments section for selected recipe */}
              {selectedRecipe && (
                <Card className="mt-6 p-4">
                  <h3 className="font-semibold mb-4">
                    Comments on "{recipes.find(r => r.id === selectedRecipe)?.title}"
                  </h3>
                  <RecipeComments recipeId={selectedRecipe} />
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
