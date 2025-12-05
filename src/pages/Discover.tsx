import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, FolderHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import CravingForm from "@/components/CravingForm";
import ResultsDisplay from "@/components/ResultsDisplay";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

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
    address?: string;
    type: string;
    description: string;
    distance?: string;
    menuItem?: string;
    price?: string;
  }>;
}

const Discover = () => {
  const [results, setResults] = useState<CravingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

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

  const handleSubmit = async (
    craving: string,
    proficiency: ProficiencyLevel,
    mode: Mode,
    location?: { lat: number; lng: number }
  ) => {
    setIsLoading(true);
    setResults(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-craving`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ craving, proficiency, mode, location }),
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/saved")}
            >
              <FolderHeart className="w-4 h-4 mr-2" />
              My Saved Items
            </Button>
          </div>
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              What Are You Craving?
            </h1>
            <p className="text-lg text-muted-foreground">
              Tell us what you're in the mood for, and we'll help you make it happen.
            </p>
          </div>

          <CravingForm onSubmit={handleSubmit} isLoading={isLoading} />

          {results && <ResultsDisplay results={results} userId={user?.id} />}
        </div>
      </div>
    </div>
  );
};

export default Discover;
