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
    const { tenant_id, asset_urls, membership_id } = await req.json();

    if (!tenant_id || !asset_urls?.length) {
      return new Response(JSON.stringify({ error: "tenant_id e asset_urls são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, slug")
      .eq("id", tenant_id)
      .single();

    // Build image content parts for vision
    const imageParts = asset_urls.map((url: string) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const systemPrompt = `Você é um especialista em branding e design de sistemas digitais. 
Analise as imagens enviadas (prints de Instagram, logos, materiais da marca) e gere uma proposta completa de branding para uma plataforma de mentoria.

IMPORTANTE: Use tool calling para retornar a proposta estruturada. Analise:
- Identidade visual existente (cores, tipografia, estilo)
- Tom de comunicação
- Público-alvo aparente
- Nível de maturidade da marca

O tenant atual se chama: "${tenant?.name || "Não definido"}"`;

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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise estas imagens da marca e gere uma proposta completa de branding para o sistema de mentoria.",
              },
              ...imageParts,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_branding_proposal",
              description: "Gera uma proposta estruturada de branding baseada na análise visual",
              parameters: {
                type: "object",
                properties: {
                  brand_concept: {
                    type: "string",
                    description: "Conceito geral da marca em 2-3 parágrafos. Inclua posicionamento, tom de voz e personalidade.",
                  },
                  brand_attributes: {
                    type: "object",
                    properties: {
                      personality: { type: "array", items: { type: "string" }, description: "3-5 atributos de personalidade da marca (ex: sofisticado, acessível, inovador)" },
                      tone_of_voice: { type: "string", description: "Tom de comunicação (ex: profissional mas próximo)" },
                      target_audience: { type: "string", description: "Descrição do público-alvo" },
                      brand_maturity: { type: "string", enum: ["iniciante", "em_crescimento", "consolidada", "premium"], description: "Nível de maturidade da marca" },
                      differentiators: { type: "array", items: { type: "string" }, description: "2-3 diferenciais percebidos" },
                    },
                    required: ["personality", "tone_of_voice", "target_audience", "brand_maturity"],
                  },
                  color_palette: {
                    type: "object",
                    properties: {
                      primary: { type: "string", description: "Cor primária em HSL (ex: 160 84% 39%)" },
                      secondary: { type: "string", description: "Cor secundária em HSL" },
                      accent: { type: "string", description: "Cor de destaque em HSL" },
                      background: { type: "string", description: "Cor de fundo em HSL" },
                      foreground: { type: "string", description: "Cor de texto em HSL" },
                      muted: { type: "string", description: "Cor de elementos sutis em HSL" },
                      rationale: { type: "string", description: "Justificativa das escolhas de cores" },
                    },
                    required: ["primary", "secondary", "accent", "background", "foreground", "rationale"],
                  },
                  system_colors: {
                    type: "object",
                    description: "Cores mapeadas para variáveis CSS do sistema",
                    properties: {
                      primary: { type: "string" },
                      primary_foreground: { type: "string" },
                      secondary: { type: "string" },
                      secondary_foreground: { type: "string" },
                      accent: { type: "string" },
                      accent_foreground: { type: "string" },
                      destructive: { type: "string" },
                      border: { type: "string" },
                      card: { type: "string" },
                      card_foreground: { type: "string" },
                    },
                    required: ["primary", "primary_foreground", "secondary", "accent"],
                  },
                  suggested_name: {
                    type: "string",
                    description: "Nome sugerido para exibição no sistema (pode ser o nome atual ou uma variação)",
                  },
                  typography: {
                    type: "object",
                    properties: {
                      display_font: { type: "string", description: "Fonte para títulos (Google Fonts)" },
                      body_font: { type: "string", description: "Fonte para corpo de texto (Google Fonts)" },
                      rationale: { type: "string", description: "Justificativa da escolha tipográfica" },
                    },
                    required: ["display_font", "body_font", "rationale"],
                  },
                  ai_analysis: {
                    type: "string",
                    description: "Análise detalhada do que foi percebido nas imagens: pontos fortes, pontos de atenção, oportunidades de melhoria visual",
                  },
                },
                required: ["brand_concept", "brand_attributes", "color_palette", "system_colors", "suggested_name", "typography", "ai_analysis"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_branding_proposal" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido, tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("IA não retornou proposta estruturada");
    }

    const proposal = JSON.parse(toolCall.function.arguments);

    // Save proposal to database
    const { data: branding, error: dbError } = await supabase
      .from("tenant_branding")
      .upsert({
        tenant_id,
        status: "draft",
        uploaded_assets: asset_urls,
        brand_concept: proposal.brand_concept,
        brand_attributes: proposal.brand_attributes,
        color_palette: proposal.color_palette,
        system_colors: proposal.system_colors,
        suggested_name: proposal.suggested_name,
        typography: proposal.typography,
        ai_analysis: proposal.ai_analysis,
        generated_by: membership_id || null,
      }, { onConflict: "tenant_id" })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error(`Erro ao salvar: ${dbError.message}`);
    }

    return new Response(JSON.stringify({ success: true, branding }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-branding error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
