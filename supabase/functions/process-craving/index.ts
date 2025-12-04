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
    const { craving, proficiency, mode, location } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "cook") {
      systemPrompt = `You are a helpful culinary assistant. Generate recipe suggestions based on user cravings and their cooking proficiency level. 
Return a JSON object with this exact structure:
{
  "mode": "cook",
  "proficiency": "${proficiency}",
  "recipes": [
    {
      "title": "Recipe Name",
      "difficulty": "${proficiency}",
      "cookTime": "X minutes",
      "ingredients": ["ingredient 1", "ingredient 2", ...],
      "instructions": ["step 1", "step 2", ...]
    }
  ]
}
Provide 2-3 recipes that match the proficiency level. For beginners, keep recipes simple with 5-7 ingredients and clear steps. For intermediate, add more variety and techniques. For advanced, include complex techniques and refined flavors.`;

      userPrompt = `The user is craving: "${craving}". Their cooking proficiency is ${proficiency}. Suggest appropriate recipes.`;
    } else {
      const locationContext = location 
        ? `The user's location is at coordinates (${location.lat}, ${location.lng}). Generate realistic restaurant names and suggest they are within 1 mile of this location.`
        : `The user has not shared their location. Suggest general types of restaurants they should look for nearby.`;

      systemPrompt = `You are a local food discovery assistant helping users find nearby restaurants for delivery/pickup.
${locationContext}

Return a JSON object with this exact structure:
{
  "mode": "pickup",
  "locations": [
    {
      "name": "Restaurant Name",
      "type": "Restaurant Type (e.g., Thai Restaurant, Italian Bistro, Mexican Grill)",
      "menuItem": "Specific dish name that matches the craving",
      "price": "Price range like $12.99 or $15-20",
      "description": "Brief description of why this matches their craving and what makes this dish special",
      "distance": "0.3 miles" or "0.7 miles" (within 1 mile)
    }
  ]
}

IMPORTANT:
- Generate 4-5 realistic restaurant suggestions
- Each restaurant must have a specific menu item that matches the craving
- Include realistic prices for each menu item
- All distances should be under 1 mile (e.g., "0.2 miles", "0.5 miles", "0.8 miles")
- Make restaurant names sound authentic and local
- Vary the restaurant types (different cuisines, fast casual vs sit-down, etc.)`;

      userPrompt = `The user is craving: "${craving}". Find nearby restaurants with specific menu items and prices that would satisfy this craving.`;
    }

    console.log("Processing craving request:", { craving, proficiency, mode, hasLocation: !!location });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    console.log("Successfully processed craving, returning results");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in process-craving function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
