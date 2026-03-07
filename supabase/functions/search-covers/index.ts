import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, per_page = 8 } = await req.json();
    if (!query) throw new Error("Query is required");

    // Translate query to English for better results using AI
    let translatedQuery = query;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Translate the following text to English for use as a photo search query on Unsplash. Return ONLY 2-3 English keywords, nothing else." },
              { role: "user", content: query },
            ],
            max_tokens: 30,
            temperature: 0,
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const translated = aiData.choices?.[0]?.message?.content?.trim();
          if (translated) translatedQuery = translated;
        }
      } catch (e) {
        console.error("Translation fallback:", e);
      }
    }

    // Use Unsplash Source API (free, no key needed) to generate cover URLs
    // We create multiple variations by appending different page params
    const images = [];
    const baseKeywords = encodeURIComponent(translatedQuery);
    
    for (let i = 0; i < per_page; i++) {
      const seed = `${baseKeywords}-${i}-${Date.now()}`;
      images.push({
        id: `unsplash-${i}`,
        url: `https://images.unsplash.com/photo-${getUnsplashPhotoId(translatedQuery, i)}?w=1200&h=627&fit=crop`,
        thumb: `https://source.unsplash.com/featured/400x250/?${baseKeywords}&sig=${i}`,
        photographer: "Unsplash",
      });
    }

    // Fallback: use source.unsplash.com which works without API key
    const fallbackImages = Array.from({ length: per_page }, (_, i) => ({
      id: `cover-${i}`,
      url: `https://source.unsplash.com/1200x627/?${baseKeywords}&sig=${i + Date.now()}`,
      thumb: `https://source.unsplash.com/400x250/?${baseKeywords}&sig=${i + Date.now()}`,
      photographer: "Unsplash",
    }));

    return new Response(JSON.stringify({ images: fallbackImages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getUnsplashPhotoId(query: string, index: number): string {
  // Generate deterministic-looking IDs for variety
  const hash = Array.from(query).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return `${Math.abs(hash + index)}`;
}
