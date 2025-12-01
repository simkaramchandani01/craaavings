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
    const { craving, proficiency, mode } = await req.json();
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
      systemPrompt = `You are a local food discovery assistant. Based on user cravings, suggest types of restaurants, cafes, or grocery stores they should look for nearby.
Return a JSON object with this exact structure:
{
  "mode": "pickup",
  "locations": [
    {
      "name": "Type of Location",
      "type": "Restaurant/Cafe/Grocery Store",
      "description": "What to look for or order here",
      "distance": "Nearby"
    }
  ]
}
Provide 3-4 location suggestions that would satisfy their craving. Be specific about what dishes or items to look for.`;

      userPrompt = `The user is craving: "${craving}". Suggest types of nearby locations where they can satisfy this craving.`;
    }

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
