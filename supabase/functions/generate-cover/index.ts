import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { prompt, tenantName, tenantNiche } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const businessContext = tenantNiche
      ? `The business operates in the "${tenantNiche}" niche${tenantName ? ` (brand: "${tenantName}")` : ''}.`
      : tenantName
        ? `The brand is "${tenantName}".`
        : '';

    const enhancedPrompt = `Generate a stunning, high-end cover image for a professional playbook/guide.

Topic: "${prompt}"
${businessContext}

STYLE REQUIREMENTS:
- Cinematic, editorial-quality composition with dramatic lighting
- Rich color palette: deep gradients, bold accent colors, moody atmosphere
- Abstract or semi-abstract imagery — NO text, NO letters, NO words, NO logos
- Incorporate subtle visual metaphors related to the topic (e.g. growth = upward lines, strategy = chess-like patterns, sales = dynamic motion)
- Premium textures: brushed metal, glass refraction, silk, matte surfaces
- Wide landscape format, 16:9 aspect ratio
- Ultra-sharp, 4K quality feel
- Think: Apple keynote slide meets magazine editorial cover`;

    console.log(`Generate Cover - Prompt: ${prompt}, Tenant: ${tenantName || 'N/A'}, Niche: ${tenantNiche || 'N/A'}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido, tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para geração de imagem." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) throw new Error("No image generated");

    console.log("Generate Cover - Success");

    return new Response(JSON.stringify({ success: true, imageUrl: imageData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate Cover error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
