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
import { Loader2, Plus, X, Upload, FolderHeart } from "lucide-react";

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
  onRecipeShared: () => void;
}

const ShareRecipeDialog = ({
  open,
  onOpenChange,
  communityId,
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
  const { toast } = useToast();

  useEffect(() => {
    if (open && shareMode === "saved") {
      loadSavedRecipes();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl: string | null = null;

      if (shareMode === "saved" && selectedSavedRecipe) {
        // Share from saved recipes
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
        // Share new recipe
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a Recipe</DialogTitle>
        </DialogHeader>

        <Tabs value={shareMode} onValueChange={(v) => setShareMode(v as "new" | "saved")}>
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
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !selectedSavedRecipe}
                  >
                    {isSubmitting ? (
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
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
