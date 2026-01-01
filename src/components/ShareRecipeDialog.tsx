import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, X, Upload, FolderHeart, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SavedRecipe {
  id: string;
  title: string;
  difficulty: string | null;
  cook_time: string | null;
  ingredients: string[];
  instructions: string[];
}

interface ShareRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  communityCategory: string;
  onRecipeShared: () => void;
}

interface ScreeningResult {
  isMatch: boolean;
  confidence: number;
  reason: string;
  suggestedCategories: string[];
}

interface SuggestedCommunity {
  id: string;
  name: string;
  category: string;
}

const ShareRecipeDialog = ({
  open,
  onOpenChange,
  communityId,
  communityCategory,
  onRecipeShared,
}: ShareRecipeDialogProps) => {
  const [shareMode, setShareMode] = useState<"new" | "saved">("new");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [selectedSavedRecipe, setSelectedSavedRecipe] = useState<string>("");
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [suggestedCommunities, setSuggestedCommunities] = useState<SuggestedCommunity[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open && shareMode === "saved") {
      loadSavedRecipes();
    }
    // Reset screening when dialog opens/closes
    if (open) {
      setScreeningResult(null);
      setSuggestedCommunities([]);
    }
  }, [open, shareMode]);

  const loadSavedRecipes = async () => {
    setIsLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from("saved_recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedRecipes(
        (data || []).map((r) => ({
          ...r,
          ingredients: Array.isArray(r.ingredients) ? (r.ingredients as string[]) : [],
          instructions: Array.isArray(r.instructions) ? (r.instructions as string[]) : [],
        }))
      );
    } catch (error) {
      console.error("Error loading saved recipes:", error);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, ""]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, ""]);
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, imageFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const screenRecipe = async (recipeTitle: string, recipeDescription: string, recipeIngredients: string[]) => {
    setIsScreening(true);
    setScreeningResult(null);
    setSuggestedCommunities([]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/screen-recipe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            recipeTitle,
            recipeDescription,
            ingredients: recipeIngredients,
            communityCategory,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Screening failed");
      }

      const result: ScreeningResult = await response.json();
      setScreeningResult(result);

      // If not a match, find suggested communities
      if (!result.isMatch && result.suggestedCategories?.length > 0) {
        const { data: communities } = await supabase
          .from("communities")
          .select("id, name, category")
          .in("category", result.suggestedCategories)
          .eq("is_private", false)
          .limit(5);

        if (communities) {
          setSuggestedCommunities(communities);
        }
      }

      return result;
    } catch (error) {
      console.error("Screening error:", error);
      toast({
        title: "Screening error",
        description: "Could not screen recipe. Proceeding anyway.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsScreening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let recipeTitle = title;
    let recipeDescription = description;
    let recipeIngredients = ingredients.filter((i) => i.trim());

    if (shareMode === "saved" && selectedSavedRecipe) {
      const savedRecipe = savedRecipes.find((r) => r.id === selectedSavedRecipe);
      if (savedRecipe) {
        recipeTitle = savedRecipe.title;
        recipeIngredients = savedRecipe.ingredients;
      }
    }

    // Screen the recipe first if not already screened
    if (!screeningResult) {
      const result = await screenRecipe(recipeTitle, recipeDescription, recipeIngredients);
      if (result && !result.isMatch) {
        return; // Stop and show suggestions
      }
    } else if (!screeningResult.isMatch) {
      toast({
        title: "Recipe doesn't match",
        description: "Please choose a suggested community or modify your recipe.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl: string | null = null;

      if (shareMode === "saved" && selectedSavedRecipe) {
        const savedRecipe = savedRecipes.find((r) => r.id === selectedSavedRecipe);
        if (!savedRecipe) throw new Error("Recipe not found");

        const { error } = await supabase.from("shared_recipes").insert({
          community_id: communityId,
          user_id: user.id,
          title: savedRecipe.title,
          difficulty: savedRecipe.difficulty,
          cook_time: savedRecipe.cook_time,
          ingredients: savedRecipe.ingredients,
          instructions: savedRecipe.instructions,
        });

        if (error) throw error;
      } else {
        const filteredIngredients = ingredients.filter((i) => i.trim());
        const filteredInstructions = instructions.filter((i) => i.trim());

        if (imageFile) {
          imageUrl = await uploadImage(user.id);
        }

        const { error } = await supabase.from("shared_recipes").insert({
          community_id: communityId,
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          difficulty,
          cook_time: cookTime || null,
          servings: servings ? parseInt(servings) : null,
          ingredients: filteredIngredients,
          instructions: filteredInstructions,
          image_url: imageUrl,
        });

        if (error) throw error;
      }

      toast({
        title: "Recipe shared!",
        description: "Your recipe has been shared with the community.",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setDifficulty("beginner");
      setCookTime("");
      setServings("");
      setIngredients([""]);
      setInstructions([""]);
      setImageFile(null);
      setImagePreview("");
      setSelectedSavedRecipe("");
      setShareMode("new");
      setScreeningResult(null);
      setSuggestedCommunities([]);

      onOpenChange(false);
      onRecipeShared();
    } catch (error: any) {
      toast({
        title: "Error sharing recipe",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareToSuggestedCommunity = (suggestedCommunityId: string) => {
    // Close this dialog and notify parent to open for new community
    toast({
      title: "Redirecting",
      description: "Please share your recipe in the suggested community.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a Recipe</DialogTitle>
        </DialogHeader>

        {screeningResult && !screeningResult.isMatch && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Recipe doesn't match this community</p>
                <p className="text-sm text-muted-foreground mt-1">{screeningResult.reason}</p>
              </div>
            </div>
            
            {suggestedCommunities.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Suggested communities:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedCommunities.map((community) => (
                    <Badge
                      key={community.id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleShareToSuggestedCommunity(community.id)}
                    >
                      {community.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScreeningResult(null);
                setSuggestedCommunities([]);
              }}
            >
              Modify Recipe
            </Button>
          </div>
        )}

        <Tabs value={shareMode} onValueChange={(v) => {
          setShareMode(v as "new" | "saved");
          setScreeningResult(null);
          setSuggestedCommunities([]);
        }}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Recipe
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <FolderHeart className="w-4 h-4" />
              From Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved">
            {isLoadingSaved ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : savedRecipes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No saved recipes yet
              </div>
            ) : (
              <div className="space-y-4">
                <Label>Select a saved recipe to share</Label>
                <Select value={selectedSavedRecipe} onValueChange={setSelectedSavedRecipe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a recipe..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedRecipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting || isScreening}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isScreening || !selectedSavedRecipe}
                  >
                    {isScreening ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Screening...
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sharing...
                      </>
                    ) : (
                      "Share Recipe"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="new">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Recipe Title *</Label>
                <Input
                  id="title"
                  placeholder="Delicious Chocolate Cake"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="A rich and moist chocolate cake perfect for any occasion..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cookTime">Cook Time</Label>
                  <Input
                    id="cookTime"
                    placeholder="45 minutes"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    type="number"
                    placeholder="4"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Recipe Image</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer hover:bg-accent transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute -top-2 -right-2 w-6 h-6"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview("");
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddIngredient}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Ingredient ${index + 1}`}
                        value={ingredient}
                        onChange={(e) => handleIngredientChange(index, e.target.value)}
                        required
                      />
                      {ingredients.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveIngredient(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Instructions *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddInstruction}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea
                        placeholder={`Step ${index + 1}`}
                        value={instruction}
                        onChange={(e) => handleInstructionChange(index, e.target.value)}
                        required
                        rows={2}
                      />
                      {instructions.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveInstruction(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || isScreening}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || isScreening}>
                  {isScreening ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Screening...
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    "Share Recipe"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShareRecipeDialog;
