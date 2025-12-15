import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Clock, Utensils, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import RecipeComments from "./RecipeComments";
import StarRating from "./StarRating";
import ShareRecipeToFriend from "./ShareRecipeToFriend";
import type { Database } from "@/integrations/supabase/types";

type Recipe = Database["public"]["Tables"]["shared_recipes"]["Row"] & {
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

interface RecipeCardProps {
  recipe: Recipe;
  onLike: () => void;
}

const RecipeCard = ({ recipe, onLike }: RecipeCardProps) => {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [currentRating, setCurrentRating] = useState(recipe.user_rating || 0);
  const [averageRating, setAverageRating] = useState(recipe.average_rating || 0);
  const [isRating, setIsRating] = useState(false);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleLike = async () => {
    setIsLiking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (recipe.user_has_liked) {
        // Unlike
        await supabase
          .from("recipe_likes")
          .delete()
          .eq("recipe_id", recipe.id)
          .eq("user_id", user.id);
      } else {
        // Like
        await supabase.from("recipe_likes").insert({
          recipe_id: recipe.id,
          user_id: user.id,
        });
      }

      onLike();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleRate = async (rating: number) => {
    setIsRating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("recipe_ratings")
        .upsert(
          { recipe_id: recipe.id, user_id: user.id, rating },
          { onConflict: "recipe_id,user_id" }
        );

      if (error) throw error;

      setCurrentRating(rating);

      const { data: ratings } = await supabase
        .from("recipe_ratings")
        .select("rating")
        .eq("recipe_id", recipe.id);

      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        setAverageRating(avg);
      }

      toast({ title: "Rated!", description: `You rated this recipe ${rating} stars` });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRating(false);
    }
  };

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarImage src={recipe.profiles.avatar_url || undefined} />
            <AvatarFallback>
              {recipe.profiles.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{recipe.profiles.username}</p>
            <p className="text-sm text-muted-foreground">
              {formatTimestamp(recipe.created_at)}
            </p>
          </div>
        </div>

        {/* Image */}
        {recipe.image_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Title and Description */}
        <h3 className="text-2xl font-bold mb-2">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-muted-foreground mb-4">{recipe.description}</p>
        )}

        {/* Meta Info */}
        <div className="flex gap-2 flex-wrap mb-4">
          {recipe.difficulty && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Utensils className="w-3 h-3" />
              {recipe.difficulty}
            </Badge>
          )}
          {recipe.cook_time && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {recipe.cook_time}
            </Badge>
          )}
          {recipe.servings && (
            <Badge variant="secondary">Serves {recipe.servings}</Badge>
          )}
          {recipe.tags?.map((tag, index) => (
            <Badge key={index} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your rating:</span>
            <StarRating
              rating={currentRating}
              onRate={handleRate}
              size="sm"
            />
          </div>
          {averageRating > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Avg:</span>
              <StarRating rating={Math.round(averageRating)} readonly size="sm" />
              <span>({averageRating.toFixed(1)})</span>
            </div>
          )}
        </div>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
              Ingredients:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {ingredients.map((ingredient: string, index: number) => (
                <li key={index} className="text-foreground/80">
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {instructions.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
              Instructions:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {instructions.map((step: string, index: number) => (
                <li key={index} className="text-foreground/80">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className={recipe.user_has_liked ? "text-red-500" : ""}
          >
            <Heart
              className={`w-4 h-4 mr-2 ${recipe.user_has_liked ? "fill-current" : ""}`}
            />
            {recipe.likes_count || 0}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {recipe.comments_count || 0}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && <RecipeComments recipeId={recipe.id} />}

        {/* Share to Friend Dialog */}
        <ShareRecipeToFriend
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          recipeId={recipe.id}
          recipeTitle={recipe.title}
        />
      </div>
    </Card>
  );
};

export default RecipeCard;
