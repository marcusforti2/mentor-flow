import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, generate_image } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (generate_image) {
      // Generate banner image
      const imageResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `Create a professional, visually appealing horizontal banner image (800x400 pixels, 2:1 aspect ratio) for a popup notification with the theme: "${prompt}". The image should be modern, clean, with vibrant colors. No text in the image, just visual elements that convey the theme. Make it suitable for a mentorship platform.`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!imageResp.ok) {
        const errText = await imageResp.text();
        console.error("Image generation error:", imageResp.status, errText);
        throw new Error("Failed to generate image");
      }

      const imageData = await imageResp.json();
      const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!base64Image) throw new Error("No image returned from AI");

      // Upload to storage
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Convert base64 to Uint8Array
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const fileName = `ai-generated/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("popup-images")
        .upload(fileName, binaryData, { contentType: "image/png" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("popup-images")
        .getPublicUrl(fileName);

      return new Response(
        JSON.stringify({ image_url: urlData.publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate content using tool calling
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em comunicação para plataformas de mentoria. Crie conteúdo de popup atraente e profissional em português brasileiro. O body_html deve ser HTML simples (use <p>, <strong>, <em>, <ul>, <li>). Mantenha conciso e impactante.",
          },
          {
            role: "user",
            content: `Crie o conteúdo para um popup com a seguinte ideia: "${prompt}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_popup_content",
              description: "Retorna o conteúdo estruturado do popup",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Título curto e impactante (max 60 chars)" },
                  body_html: { type: "string", description: "Conteúdo em HTML simples" },
                  cta_label: { type: "string", description: "Texto do botão CTA (ex: Entrar no Grupo)" },
                  cta_url: { type: "string", description: "URL do botão se mencionada no prompt, senão string vazia" },
                },
                required: ["title", "body_html", "cta_label", "cta_url"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_popup_content" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const content = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-popup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
