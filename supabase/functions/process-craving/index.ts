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
        ? `The user is located at GPS coordinates: latitude ${location.lat}, longitude ${location.lng}. 
Based on these real coordinates, suggest ACTUAL restaurants that would realistically exist in this geographic area. 
Consider the region, city, and neighborhood these coordinates correspond to when generating restaurant names and cuisines.`
        : `The user has not shared their location. Suggest general types of restaurants they should look for nearby.`;

      systemPrompt = `You are a local food discovery assistant. Your job is to suggest realistic restaurant options.
${locationContext}

Return a JSON object with this exact structure:
{
  "mode": "pickup",
  "locations": [
    {
      "name": "Restaurant Name",
      "address": "123 Street Name, City, State ZIP",
      "type": "Restaurant Type (e.g., Thai Restaurant, Italian Bistro, Mexican Grill)",
      "menuItem": "Specific dish name from their menu that best matches the craving",
      "price": "$XX.XX (specific price)",
      "description": "Brief description of the dish and why it matches the craving",
      "distance": "0.X miles"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Generate EXACTLY 5 restaurant suggestions
- All restaurants must be within 1 mile (distances like "0.2 miles", "0.4 miles", "0.6 miles", "0.8 miles", "0.9 miles")
- Use restaurant names that sound real and fit the geographic area of the coordinates
- Include a realistic street address for each restaurant based on the geographic area
- Each suggestion must include ONE specific menu item that BEST matches what the user is craving
- Include realistic, specific prices (e.g., "$14.99", "$18.50", not ranges)
- Vary the restaurant types and price points
- Order results from closest to furthest distance`;

      userPrompt = `The user is craving: "${craving}". Suggest 5 nearby restaurants with addresses, the single best menu item from each that matches this craving, and the price.`;
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
