import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, MapPin, Trash2, Clock, Utensils, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import AppSidebar from "@/components/AppSidebar";

interface SavedRecipe {
  id: string;
  title: string;
  difficulty: string | null;
  cook_time: string | null;
  ingredients: string[];
  instructions: string[];
  created_at: string;
}

interface FavoriteRestaurant {
  id: string;
  name: string;
  address: string | null;
  type: string | null;
  menu_item: string | null;
  price: string | null;
  description: string | null;
  created_at: string;
}

const Saved = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<FavoriteRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setCheckingAuth(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!checkingAuth && !user) {
      navigate("/auth");
    }
  }, [checkingAuth, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchSavedItems();
    }
  }, [user]);

  const fetchSavedItems = async () => {
    setLoading(true);
    try {
      const [recipesRes, restaurantsRes] = await Promise.all([
        supabase
          .from("saved_recipes")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("favorite_restaurants")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (recipesRes.data) {
        setSavedRecipes(recipesRes.data.map(r => ({
          ...r,
          ingredients: Array.isArray(r.ingredients) ? r.ingredients as string[] : [],
          instructions: Array.isArray(r.instructions) ? r.instructions as string[] : [],
        })));
      }
      if (restaurantsRes.data) {
        setFavoriteRestaurants(restaurantsRes.data);
      }
    } catch (error) {
      console.error("Error fetching saved items:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (id: string) => {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete recipe", variant: "destructive" });
    } else {
      setSavedRecipes(prev => prev.filter(r => r.id !== id));
      toast({ title: "Deleted", description: "Recipe removed from saved" });
    }
  };

  const deleteRestaurant = async (id: string) => {
    const { error } = await supabase
      .from("favorite_restaurants")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to remove restaurant", variant: "destructive" });
    } else {
      setFavoriteRestaurants(prev => prev.filter(r => r.id !== id));
      toast({ title: "Deleted", description: "Restaurant removed from favorites" });
    }
  };

  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">My Saved Items</h1>
            <p className="text-lg text-muted-foreground">
              Your saved recipes and favorite restaurants
            </p>
          </div>

          <Tabs defaultValue="recipes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="recipes" className="flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                Saved Recipes ({savedRecipes.length})
              </TabsTrigger>
              <TabsTrigger value="restaurants" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Favorite Restaurants ({favoriteRestaurants.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recipes">
              {savedRecipes.length === 0 ? (
                <Card className="p-12 text-center">
                  <ChefHat className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No saved recipes yet</p>
                  <Button className="mt-4" onClick={() => navigate("/discover")}>
                    Discover Recipes
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {savedRecipes.map((recipe) => (
                    <Card key={recipe.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{recipe.title}</h3>
                          <div className="flex gap-2 flex-wrap">
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
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRecipe(recipe.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
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
            </TabsContent>

            <TabsContent value="restaurants">
              {favoriteRestaurants.length === 0 ? (
                <Card className="p-12 text-center">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No favorite restaurants yet</p>
                  <Button className="mt-4" onClick={() => navigate("/discover")}>
                    Find Restaurants
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {favoriteRestaurants.map((restaurant) => (
                    <Card key={restaurant.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-semibold">{restaurant.name}</h3>
                              {restaurant.address && (
                                <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                              )}
                            </div>
                            {restaurant.price && (
                              <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
                                <DollarSign className="w-3 h-3" />
                                {restaurant.price}
                              </Badge>
                            )}
                          </div>
                          {restaurant.type && (
                            <Badge variant="secondary" className="mb-3">
                              {restaurant.type}
                            </Badge>
                          )}
                          {restaurant.menu_item && (
                            <p className="text-sm font-medium text-primary mb-2">
                              Recommended: {restaurant.menu_item}
                            </p>
                          )}
                          {restaurant.description && (
                            <p className="text-muted-foreground text-sm">{restaurant.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRestaurant(restaurant.id)}
                          className="ml-2"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Saved;
