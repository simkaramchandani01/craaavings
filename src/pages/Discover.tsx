import { useState } from "react";
import CravingForm from "@/components/CravingForm";
import ResultsDisplay from "@/components/ResultsDisplay";

export type ProficiencyLevel = "beginner" | "intermediate" | "advanced";
export type Mode = "cook" | "pickup";

export interface CravingResult {
  mode: Mode;
  proficiency?: ProficiencyLevel;
  recipes?: Array<{
    title: string;
    difficulty: string;
    cookTime: string;
    ingredients: string[];
    instructions: string[];
  }>;
  locations?: Array<{
    name: string;
    type: string;
    description: string;
    distance?: string;
  }>;
}

const Discover = () => {
  const [results, setResults] = useState<CravingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    craving: string,
    proficiency: ProficiencyLevel,
    mode: Mode
  ) => {
    setIsLoading(true);
    setResults(null);

    try {
      // Call edge function to process craving
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-craving`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ craving, proficiency, mode }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to process craving");
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error processing craving:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              What Are You Craving?
            </h1>
            <p className="text-lg text-muted-foreground">
              Tell us what you're in the mood for, and we'll help you make it happen.
            </p>
          </div>

          <CravingForm onSubmit={handleSubmit} isLoading={isLoading} />

          {results && <ResultsDisplay results={results} />}
        </div>
      </div>
    </div>
  );
};

export default Discover;
