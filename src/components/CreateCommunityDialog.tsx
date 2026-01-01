import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Lock, Globe } from "lucide-react";

interface CreateCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommunityCreated: () => void;
}

const CreateCommunityDialog = ({
  open,
  onOpenChange,
  onCommunityCreated,
}: CreateCommunityDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    reason: string;
    suggestedCategory: string;
  } | null>(null);
  const { toast } = useToast();

  const validateCommunity = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a community name.",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-community`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            communityName: name.trim(),
            description: description.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      const result = await response.json();
      setValidationResult(result);

      if (!result.isValid) {
        toast({
          title: "Invalid community name",
          description: result.reason,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Validation error",
        description: "Could not validate community name. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validationResult?.isValid) {
      await validateCommunity();
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate slug from name
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if slug already exists
      const { data: existingCommunity } = await supabase
        .from("communities")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existingCommunity) {
        toast({
          title: "Name already taken",
          description: "A community with a similar name already exists.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { error: communityError, data: newCommunity } = await supabase
        .from("communities")
        .insert({
          name: name.trim(),
          slug,
          description: description.trim() || null,
          category: validationResult.suggestedCategory,
          created_by: user.id,
          is_private: isPrivate,
        })
        .select()
        .single();

      if (communityError) throw communityError;

      // Auto-join the creator to the community
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: newCommunity.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      toast({
        title: "Community created!",
        description: `"${name}" has been created successfully.`,
      });

      // Reset form
      setName("");
      setDescription("");
      setIsPrivate(false);
      setValidationResult(null);

      onOpenChange(false);
      onCommunityCreated();
    } catch (error: any) {
      toast({
        title: "Error creating community",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New Community</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Community Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Sweet Treats, Italian Cuisine"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setValidationResult(null);
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Must be food-related (e.g., cuisine types, food categories)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this community about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {isPrivate ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Globe className="w-4 h-4 text-muted-foreground" />
                )}
                <Label htmlFor="private-toggle">
                  {isPrivate ? "Private Community" : "Public Community"}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {isPrivate
                  ? "Only invited friends can see and join"
                  : "Anyone can discover and join"}
              </p>
            </div>
            <Switch
              id="private-toggle"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          {validationResult && (
            <div
              className={`p-3 rounded-lg text-sm ${
                validationResult.isValid
                  ? "bg-green-500/10 text-green-600 border border-green-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              <p className="font-medium">
                {validationResult.isValid ? "✓ Valid name" : "✗ Invalid name"}
              </p>
              <p className="text-xs mt-1">{validationResult.reason}</p>
              {validationResult.isValid && (
                <p className="text-xs mt-1">
                  Category: {validationResult.suggestedCategory}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isValidating}
            >
              Cancel
            </Button>
            {!validationResult?.isValid ? (
              <Button
                type="button"
                onClick={validateCommunity}
                disabled={isValidating || !name.trim()}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Validate Name"
                )}
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Community"
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCommunityDialog;
