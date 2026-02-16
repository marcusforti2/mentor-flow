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
    const { tenant_id, asset_urls, membership_id, text_prompt } = await req.json();

    if (!tenant_id || (!asset_urls?.length && !text_prompt)) {
      return new Response(JSON.stringify({ error: "tenant_id e (asset_urls ou text_prompt) são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, slug")
      .eq("id", tenant_id)
      .single();

    const imageParts = (asset_urls || []).map((url: string) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const hasImages = imageParts.length > 0;

    const systemPrompt = `Você é um designer de produto sênior especializado em Design Systems para plataformas SaaS.

CONTEXTO TÉCNICO CRÍTICO:
A plataforma usa um layout DARK MODE para as áreas dos mentores e mentorados.
O fundo padrão é escuro (ex: 220 15% 10%), os cards são ligeiramente mais claros (ex: 220 15% 13%), e os textos são claros sobre fundo escuro.
As cores são definidas em formato HSL SEM wrapper — apenas os três valores: "220 15% 10%" (NÃO "hsl(220 15% 10%)").

REGRAS OBRIGATÓRIAS PARA CORES:
1. FORMATO: Sempre "H S% L%" — exemplo: "250 80% 60%". NUNCA inclua "hsl()" ao redor.
2. DARK MODE: background deve ter luminosidade entre 5-15%, foreground entre 85-98%.
3. CARDS: Luminosidade 2-5% acima do background. Card-foreground igual ao foreground.
4. PRIMARY: Cor vibrante (saturação > 50%, luminosidade 40-65%) que funcione sobre fundo escuro.
5. PRIMARY-FOREGROUND: Cor que contraste com a primary (geralmente branco "0 0% 98%" ou escuro "0 0% 10%").
6. SECONDARY: Versão menos saturada/mais escura da primary, ou cor complementar sutil.
7. ACCENT: Cor de destaque diferente da primary, vibrante.
8. MUTED: Fundo sutil para badges/tags — luminosidade 15-25%.
9. MUTED-FOREGROUND: Texto secundário — luminosidade 55-70%.
10. BORDER: Sutil sobre dark — luminosidade 18-28%.
11. DESTRUCTIVE: Sempre um vermelho — ex: "0 84% 60%".
12. CONTRASTE: Diferença de luminosidade mínima de 40% entre texto e fundo.

${hasImages
  ? 'Analise as imagens da marca (Instagram, logo, materiais) e EXTRAIA as cores dominantes para criar uma paleta coerente adaptada ao dark mode.'
  : 'Baseado na descrição fornecida, crie uma identidade visual premium adaptada ao dark mode.'}

O tenant se chama: "${tenant?.name || "Não definido"}"

IMPORTANTE: Foque apenas no branding da marca apresentada. Ignore quaisquer elementos de interface de outras apps visíveis nas imagens (ex: barras de navegação do Instagram, ícones do sistema operacional, etc.).`;

    const userContent = hasImages
      ? [
          { type: "text", text: text_prompt || "Analise a identidade visual da marca nestas imagens e gere um branding completo para dark mode." },
          ...imageParts,
        ]
      : text_prompt || "Gere uma proposta de branding baseada no nome do tenant.";

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
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_branding_proposal",
              description: "Gera proposta de branding para dark mode SaaS. TODAS as cores em formato HSL raw: 'H S% L%' — SEM hsl() wrapper.",
              parameters: {
                type: "object",
                properties: {
                  brand_concept: {
                    type: "string",
                    description: "Conceito geral da marca em 2-3 parágrafos: posicionamento, tom de voz, personalidade.",
                  },
                  brand_attributes: {
                    type: "object",
                    properties: {
                      personality: { type: "array", items: { type: "string" }, description: "3-5 atributos (ex: sofisticado, acessível)" },
                      tone_of_voice: { type: "string", description: "Tom de comunicação" },
                      target_audience: { type: "string", description: "Público-alvo" },
                      brand_maturity: { type: "string", enum: ["iniciante", "em_crescimento", "consolidada", "premium"] },
                      differentiators: { type: "array", items: { type: "string" }, description: "2-3 diferenciais" },
                    },
                    required: ["personality", "tone_of_voice", "target_audience", "brand_maturity"],
                  },
                  color_palette: {
                    type: "object",
                    description: "Cores conceituais da marca. Formato HSL raw: 'H S% L%'",
                    properties: {
                      primary: { type: "string", description: "Cor primária vibrante. Ex: 250 80% 60%" },
                      secondary: { type: "string", description: "Cor secundária. Ex: 220 60% 55%" },
                      accent: { type: "string", description: "Cor de destaque. Ex: 45 90% 55%" },
                      background: { type: "string", description: "Fundo ESCURO (dark mode). Luminosidade 5-15%. Ex: 220 15% 10%" },
                      foreground: { type: "string", description: "Texto CLARO sobre fundo escuro. Luminosidade 85-98%. Ex: 220 10% 95%" },
                      muted: { type: "string", description: "Cor sutil para backgrounds secundários. Ex: 220 12% 18%" },
                      rationale: { type: "string", description: "Justificativa das escolhas" },
                    },
                    required: ["primary", "secondary", "accent", "background", "foreground", "rationale"],
                  },
                  system_colors: {
                    type: "object",
                    description: "Mapeamento direto para variáveis CSS do design system. FORMATO: 'H S% L%' (SEM hsl wrapper). Todas obrigatórias.",
                    properties: {
                      primary: { type: "string", description: "Igual color_palette.primary. Ex: 250 80% 60%" },
                      primary_foreground: { type: "string", description: "Texto sobre primary. Ex: 0 0% 98%" },
                      secondary: { type: "string", description: "Fundo de botões secundários. Ex: 220 15% 18%" },
                      secondary_foreground: { type: "string", description: "Texto sobre secondary. Ex: 220 10% 90%" },
                      accent: { type: "string", description: "Cor de destaque. Ex: 45 90% 55%" },
                      accent_foreground: { type: "string", description: "Texto sobre accent. Ex: 0 0% 10%" },
                      background: { type: "string", description: "Fundo da página (escuro). Ex: 220 15% 10%" },
                      foreground: { type: "string", description: "Texto principal (claro). Ex: 220 10% 95%" },
                      card: { type: "string", description: "Fundo de cards (2-5% mais claro que background). Ex: 220 15% 13%" },
                      card_foreground: { type: "string", description: "Texto nos cards. Ex: 220 10% 95%" },
                      muted: { type: "string", description: "Fundo sutil de badges/tags. Ex: 220 12% 18%" },
                      muted_foreground: { type: "string", description: "Texto secundário/apagado. Ex: 220 10% 60%" },
                      border: { type: "string", description: "Cor de bordas sutis. Ex: 220 12% 22%" },
                      destructive: { type: "string", description: "Vermelho de erro. Ex: 0 84% 60%" },
                      destructive_foreground: { type: "string", description: "Texto sobre destructive. Ex: 0 0% 98%" },
                    },
                    required: ["primary", "primary_foreground", "secondary", "secondary_foreground", "accent", "accent_foreground", "background", "foreground", "card", "card_foreground", "muted", "muted_foreground", "border", "destructive", "destructive_foreground"],
                  },
                  suggested_name: {
                    type: "string",
                    description: "Nome do tenant (pode manter o atual ou sugerir variação)",
                  },
                  typography: {
                    type: "object",
                    properties: {
                      display_font: { type: "string", description: "Fonte Google Fonts para títulos" },
                      body_font: { type: "string", description: "Fonte Google Fonts para corpo" },
                      rationale: { type: "string", description: "Justificativa tipográfica" },
                    },
                    required: ["display_font", "body_font", "rationale"],
                  },
                  ai_analysis: {
                    type: "string",
                    description: "Análise do que foi percebido: pontos fortes, atenção, oportunidades. Foque na MARCA, não em elementos de UI de outras apps.",
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

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("IA não retornou proposta estruturada");
    }

    const proposal = JSON.parse(toolCall.function.arguments);

    // Sanitize: strip any accidental hsl() wrappers from ALL color values
    const stripHsl = (val: string): string => {
      if (!val || typeof val !== 'string') return val;
      const m = val.match(/^hsl\(([^)]+)\)$/i);
      return m ? m[1].trim() : val.trim();
    };

    const sanitizeColors = (obj: Record<string, any>): Record<string, any> => {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && key !== 'rationale') {
          result[key] = stripHsl(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    if (proposal.color_palette) proposal.color_palette = sanitizeColors(proposal.color_palette);
    if (proposal.system_colors) proposal.system_colors = sanitizeColors(proposal.system_colors);

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
