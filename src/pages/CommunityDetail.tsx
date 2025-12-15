import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import RecipeCard from "@/components/RecipeCard";
import ShareRecipeDialog from "@/components/ShareRecipeDialog";
import AppSidebar from "@/components/AppSidebar";
import type { Database } from "@/integrations/supabase/types";

type Community = Database["public"]["Tables"]["communities"]["Row"];
type SharedRecipe = Database["public"]["Tables"]["shared_recipes"]["Row"] & {
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
  average_rating?: number;
  user_rating?: number;
};

const CommunityDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [recipes, setRecipes] = useState<SharedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadCommunity(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadCommunity(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [slug, navigate]);

  const loadCommunity = async (userId: string) => {
    if (!slug) return;

    setIsLoading(true);
    try {
      // Get community
      const { data: communityData, error: communityError } = await supabase
        .from("communities")
        .select("*")
        .eq("slug", slug)
        .single();

      if (communityError) throw communityError;
      setCommunity(communityData);

      // Get recipes with profile data
      const { data: recipesData, error: recipesError } = await supabase
        .from("shared_recipes")
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq("community_id", communityData.id)
        .order("created_at", { ascending: false });

      if (recipesError) throw recipesError;

      // Get likes, comments, and ratings
      const recipesWithData = await Promise.all(
        (recipesData || []).map(async (recipe) => {
          const { count: likesCount } = await supabase
            .from("recipe_likes")
            .select("*", { count: "exact", head: true })
            .eq("recipe_id", recipe.id);

          const { count: commentsCount } = await supabase
            .from("recipe_comments")
            .select("*", { count: "exact", head: true })
            .eq("recipe_id", recipe.id);

          const { data: likeData } = await supabase
            .from("recipe_likes")
            .select("*")
            .eq("recipe_id", recipe.id)
            .eq("user_id", userId)
            .maybeSingle();

          // Get ratings
          const { data: ratings } = await supabase
            .from("recipe_ratings")
            .select("rating")
            .eq("recipe_id", recipe.id);

          const { data: userRating } = await supabase
            .from("recipe_ratings")
            .select("rating")
            .eq("recipe_id", recipe.id)
            .eq("user_id", userId)
            .maybeSingle();

          const averageRating = ratings && ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : 0;

          return {
            ...recipe,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            user_has_liked: !!likeData,
            average_rating: averageRating,
            user_rating: userRating?.rating || 0,
          };
        })
      );

      setRecipes(recipesWithData as SharedRecipe[]);
    } catch (error: any) {
      toast({
        title: "Error loading community",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeShared = () => {
    if (user) {
      loadCommunity(user.id);
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

  if (!community) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Community not found</h2>
            <p className="text-muted-foreground mb-4">
              This community doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/communities")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Communities
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
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/communities")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Communities
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{community.name}</h1>
              <p className="text-lg text-muted-foreground">{community.description}</p>
            </div>

            <Button onClick={() => setShowShareDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Share Recipe
            </Button>
          </div>
        </div>

        {recipes.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">No recipes yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share a recipe in this community!
            </p>
            <Button onClick={() => setShowShareDialog(true)}>
              Share Your First Recipe
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onLike={() => user && loadCommunity(user.id)}
              />
            ))}
          </div>
        )}

        {community && (
          <ShareRecipeDialog
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
            communityId={community.id}
            onRecipeShared={handleRecipeShared}
          />
        )}
      </div>
    </div>
  );
};

export default CommunityDetail;
