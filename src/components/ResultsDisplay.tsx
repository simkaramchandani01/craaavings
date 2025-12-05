import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, MapPin, Clock, Utensils, DollarSign, Bookmark, Heart, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CravingResult } from "@/pages/Discover";

interface ResultsDisplayProps {
  results: CravingResult;
  userId?: string;
}

const ResultsDisplay = ({ results, userId }: ResultsDisplayProps) => {
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());
  const [savedRestaurants, setSavedRestaurants] = useState<Set<string>>(new Set());
  const [savingRecipe, setSavingRecipe] = useState<string | null>(null);
  const [savingRestaurant, setSavingRestaurant] = useState<string | null>(null);
  const { toast } = useToast();

  const saveRecipe = async (recipe: {
    title: string;
    difficulty: string;
    cookTime: string;
    ingredients: string[];
    instructions: string[];
  }) => {
    if (!userId) {
      toast({ title: "Sign in required", description: "Please sign in to save recipes", variant: "destructive" });
      return;
    }

    setSavingRecipe(recipe.title);
    try {
      const { error } = await supabase.from("saved_recipes").insert({
        user_id: userId,
        title: recipe.title,
        difficulty: recipe.difficulty,
        cook_time: recipe.cookTime,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already saved", description: "This recipe is already in your saved recipes" });
        } else {
          throw error;
        }
      } else {
        setSavedRecipes(prev => new Set(prev).add(recipe.title));
        toast({ title: "Saved!", description: "Recipe added to your saved recipes" });
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast({ title: "Error", description: "Failed to save recipe", variant: "destructive" });
    } finally {
      setSavingRecipe(null);
    }
  };

  const saveRestaurant = async (location: {
    name: string;
    address?: string;
    type: string;
    menuItem?: string;
    price?: string;
    description: string;
  }) => {
    if (!userId) {
      toast({ title: "Sign in required", description: "Please sign in to save restaurants", variant: "destructive" });
      return;
    }

    const key = `${location.name}-${location.menuItem}`;
    setSavingRestaurant(key);
    try {
      const { error } = await supabase.from("favorite_restaurants").insert({
        user_id: userId,
        name: location.name,
        address: location.address,
        type: location.type,
        menu_item: location.menuItem,
        price: location.price,
        description: location.description,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already saved", description: "This restaurant is already in your favorites" });
        } else {
          throw error;
        }
      } else {
        setSavedRestaurants(prev => new Set(prev).add(key));
        toast({ title: "Saved!", description: "Restaurant added to your favorites" });
      }
    } catch (error) {
      console.error("Error saving restaurant:", error);
      toast({ title: "Error", description: "Failed to save restaurant", variant: "destructive" });
    } finally {
      setSavingRestaurant(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 mb-4">
        {results.mode === "cook" ? (
          <>
            <ChefHat className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Recipe Suggestions</h2>
          </>
        ) : (
          <>
            <MapPin className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Nearby Restaurants</h2>
          </>
        )}
      </div>

      {results.recipes && results.recipes.length > 0 && (
        <div className="grid gap-6">
          {results.recipes.map((recipe, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{recipe.title}</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Utensils className="w-3 h-3" />
                      {recipe.difficulty}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {recipe.cookTime}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveRecipe(recipe)}
                  disabled={savingRecipe === recipe.title || savedRecipes.has(recipe.title)}
                >
                  {savedRecipes.has(recipe.title) ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 mr-1" />
                      {savingRecipe === recipe.title ? "Saving..." : "Save"}
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                    Ingredients:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {recipe.ingredients.map((ingredient, idx) => (
                      <li key={idx} className="text-foreground/80">
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                    Instructions:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    {recipe.instructions.map((step, idx) => (
                      <li key={idx} className="text-foreground/80">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {results.locations && results.locations.length > 0 && (
        <div className="grid gap-4">
          {results.locations.map((location, index) => {
            const key = `${location.name}-${location.menuItem}`;
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold">{location.name}</h3>
                        {location.address && (
                          <p className="text-sm text-muted-foreground">{location.address}</p>
                        )}
                      </div>
                      {location.price && (
                        <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
                          <DollarSign className="w-3 h-3" />
                          {location.price}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="mb-3">
                      {location.type}
                    </Badge>
                    {location.menuItem && (
                      <p className="text-sm font-medium text-primary mb-2">
                        Recommended: {location.menuItem}
                      </p>
                    )}
                    <p className="text-muted-foreground mb-2">{location.description}</p>
                    {location.distance && (
                      <p className="text-sm text-primary font-medium">
                        📍 {location.distance}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveRestaurant(location)}
                    disabled={savingRestaurant === key || savedRestaurants.has(key)}
                    className="ml-4"
                  >
                    {savedRestaurants.has(key) ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-1" />
                        {savingRestaurant === key ? "..." : "Favorite"}
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;
