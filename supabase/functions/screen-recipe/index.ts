import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeTitle, recipeDescription, ingredients, communityCategory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a food recipe categorization expert. Analyze if a recipe fits a community's food category.

Recipe Details:
- Title: ${recipeTitle}
- Description: ${recipeDescription || "No description provided"}
- Ingredients: ${ingredients?.join(", ") || "Not specified"}

Community Category: ${communityCategory}

Determine if this recipe is appropriate for the "${communityCategory}" community.

Categories and what they include:
- "Sweet" / "Desserts": Cakes, cookies, pastries, candies, sweet drinks, ice cream, fruit desserts
- "Savory": Main dishes, appetizers, soups, salads with savory dressings, meat dishes, pasta, rice dishes
- "Beverages" / "Drinks": Cocktails, smoothies, teas, coffees, juices (both sweet and savory)
- "Healthy" / "Health": Low-calorie, nutritious, diet-friendly, vegan, vegetarian options
- "Comfort Food": Hearty, warming, nostalgic dishes
- "Quick Meals" / "Fast": Recipes under 30 minutes
- "Baking": Breads, pastries, anything oven-baked
- "International" / specific cuisines: Dishes from that cuisine

Respond with JSON only:
{
  "isMatch": boolean,
  "confidence": number (0-100),
  "reason": "brief explanation",
  "suggestedCategories": ["array of 1-3 better matching categories if not a match"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a food categorization expert. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    console.log("Recipe screening result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Screen recipe error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
