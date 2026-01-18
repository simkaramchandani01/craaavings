import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Image } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SavedRecipe {
  id: string;
  title: string;
}

interface AddProfilePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

const AddProfilePostDialog = ({ open, onOpenChange, onPostCreated }: AddProfilePostDialogProps) => {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSavedRecipes();
    }
  }, [open]);

  const loadSavedRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("saved_recipes")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setSavedRecipes(data || []);
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

  const handleSubmit = async () => {
    if (!imageFile) {
      toast({
        title: "Image required",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload image to storage
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-posts")
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("profile-posts")
        .getPublicUrl(fileName);

      // Create profile post record
      const { error: insertError } = await supabase
        .from("profile_posts")
        .insert({
          user_id: user.id,
          image_url: urlData.publicUrl,
          saved_recipe_id: selectedRecipeId || null,
          caption: caption.trim() || null,
        });

      if (insertError) throw insertError;

      toast({ title: "Post added successfully!" });
      onPostCreated();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error creating post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setImagePreview(null);
    setSelectedRecipeId("");
    setCaption("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Post to Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label>Image</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Image className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Recipe Attachment */}
          <div>
            <Label>Attach to Recipe (optional)</Label>
            <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a saved recipe..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No recipe</SelectItem>
                {savedRecipes.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>
                    {recipe.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Caption */}
          <div>
            <Label>Caption (optional)</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !imageFile}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Add Post
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProfilePostDialog;
