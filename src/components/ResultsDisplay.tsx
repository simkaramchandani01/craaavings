import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, MapPin, Clock, Utensils, DollarSign } from "lucide-react";
import type { CravingResult } from "@/pages/Discover";

interface ResultsDisplayProps {
  results: CravingResult;
}

const ResultsDisplay = ({ results }: ResultsDisplayProps) => {
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
          {results.locations.map((location, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold">{location.name}</h3>
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
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;
