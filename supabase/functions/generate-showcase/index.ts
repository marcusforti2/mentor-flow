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

    const { type, imageBase64, name, businessInfo, mentorNotes } = await req.json();

    // ── TYPE: portrait ──
    if (type === "portrait") {
      if (!imageBase64) {
        return new Response(JSON.stringify({ error: "Imagem é obrigatória" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `Transform this person's photo into a premium executive portrait.
Requirements:
- Professional studio lighting (Rembrandt or butterfly lighting)
- Dark charcoal gray studio background with subtle gradient
- Half-body framing (from waist up)
- Executive/business pose, confident and approachable
- Professional attire (if not already wearing one, subtly improve the look)
- Sharp focus, shallow depth of field
- Color grading: rich, warm tones with professional feel
- Style: like a corporate headshot from a Fortune 500 company
- High-end professional camera quality (85mm f/1.4 look)
- Keep the person's face and features EXACTLY as they are
- Portrait orientation (taller than wide, 3:4 aspect ratio)
DO NOT change the person's identity. Keep their exact face, hair, and features.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageBase64 } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI portrait error:", response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error("Nenhuma imagem gerada");

      return new Response(JSON.stringify({ success: true, imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── TYPE: bio ──
    if (type === "bio") {
      const prompt = `Você é um copywriter premium especializado em apresentações executivas de alto padrão.

Gere uma apresentação profissional sobre esta pessoa e seu negócio. O texto será usado em uma vitrine de membros/clientes de uma mentoria de alto nível.

Dados:
- Nome: ${name || "Não informado"}
- Negócio: ${businessInfo || "Não informado"}
- Visão do Mentor: ${mentorNotes || "Não informado"}

Regras:
- Máximo 900 caracteres
- 2-3 parágrafos curtos
- Tom: sofisticado, inspirador, que transmita autoridade e credibilidade
- Foque nos resultados, diferenciais e visão do profissional
- Deve parecer uma apresentação de palco ou bio de evento premium
- Escreva em terceira pessoa
- NÃO use aspas, NÃO use bullet points
- Português brasileiro`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Você é um copywriter premium. Responda APENAS com o texto da bio, sem explicações." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI bio error:", response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${response.status}`);
      }

      const data = await response.json();
      const bioText = data.choices?.[0]?.message?.content?.trim();
      if (!bioText) throw new Error("Nenhum texto gerado");

      // Truncate to 900 chars
      const finalBio = bioText.slice(0, 900);

      return new Response(JSON.stringify({ success: true, bio: finalBio }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Tipo inválido. Use 'portrait' ou 'bio'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate showcase error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
