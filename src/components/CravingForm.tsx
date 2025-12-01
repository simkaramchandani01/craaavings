import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { ChefHat, MapPin, Loader2 } from "lucide-react";
import type { ProficiencyLevel, Mode } from "@/pages/Discover";

interface CravingFormProps {
  onSubmit: (craving: string, proficiency: ProficiencyLevel, mode: Mode) => void;
  isLoading: boolean;
}

const CravingForm = ({ onSubmit, isLoading }: CravingFormProps) => {
  const [craving, setCraving] = useState("");
  const [proficiency, setProficiency] = useState<ProficiencyLevel>("beginner");
  const [mode, setMode] = useState<Mode>("cook");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (craving.trim()) {
      onSubmit(craving, proficiency, mode);
    }
  };

  return (
    <Card className="p-8 mb-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Craving Input */}
        <div className="space-y-2">
          <Label htmlFor="craving" className="text-lg font-semibold">
            Describe Your Craving
          </Label>
          <Textarea
            id="craving"
            placeholder="e.g., Something spicy and Asian-inspired, creamy pasta, healthy breakfast bowl..."
            value={craving}
            onChange={(e) => setCraving(e.target.value)}
            className="min-h-[120px] text-base"
            required
          />
        </div>

        {/* Mode Selection */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold">What's Your Plan?</Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as Mode)}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="cook"
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                mode === "cook"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="cook" id="cook" />
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                <span className="font-medium">Cook at Home</span>
              </div>
            </Label>

            <Label
              htmlFor="pickup"
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                mode === "pickup"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value="pickup" id="pickup" />
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Pick Up Nearby</span>
              </div>
            </Label>
          </RadioGroup>
        </div>

        {/* Proficiency Level (only for cook mode) */}
        {mode === "cook" && (
          <div className="space-y-3">
            <Label className="text-lg font-semibold">Cooking Proficiency</Label>
            <RadioGroup
              value={proficiency}
              onValueChange={(value) => setProficiency(value as ProficiencyLevel)}
              className="grid grid-cols-3 gap-4"
            >
              <Label
                htmlFor="beginner"
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  proficiency === "beginner"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="beginner" id="beginner" className="sr-only" />
                <span className="font-medium">Beginner</span>
                <span className="text-xs text-muted-foreground mt-1">Simple & Quick</span>
              </Label>

              <Label
                htmlFor="intermediate"
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  proficiency === "intermediate"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="intermediate" id="intermediate" className="sr-only" />
                <span className="font-medium">Intermediate</span>
                <span className="text-xs text-muted-foreground mt-1">Moderate Skills</span>
              </Label>

              <Label
                htmlFor="advanced"
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  proficiency === "advanced"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="advanced" id="advanced" className="sr-only" />
                <span className="font-medium">Advanced</span>
                <span className="text-xs text-muted-foreground mt-1">Complex Techniques</span>
              </Label>
            </RadioGroup>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full text-lg"
          disabled={isLoading || !craving.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            "Find My Match"
          )}
        </Button>
      </form>
    </Card>
  );
};

export default CravingForm;
