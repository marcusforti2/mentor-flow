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

    const systemPrompt = `Você é um designer de produto sênior especializado em criar Design Systems visualmente impactantes para plataformas SaaS.

TAREFA: Analisar a identidade visual de uma marca e gerar um branding PREMIUM com cores que criem uma interface BONITA e FUNCIONAL.

CONTEXTO: A plataforma suporta dois modos de tema: dark e light. Você DEVE decidir qual combina melhor com a marca.

⚠️ REGRA #1 PARA ESCOLHER O MODO — PRIORIDADE MÁXIMA:
Se imagens de referência foram fornecidas, OBSERVE O TEMA VISUAL DAS IMAGENS:
- Se as imagens têm fundo claro/branco → escolha **light**
- Se as imagens têm fundo escuro/preto → escolha **dark**
- A evidência visual das imagens SEMPRE tem prioridade sobre categorias genéricas

CRITÉRIOS SECUNDÁRIOS (usar APENAS se não houver imagens ou se as imagens forem ambíguas):
- **dark**: Marcas que já usam identidade escura, com cores neon/vibrantes sobre fundo escuro
- **light**: Marcas que já usam identidade clara, fundos brancos, tons pastéis ou cores sobre branco

⚠️ REGRA CRÍTICA DE FORMATO: Todas as cores devem ser HSL raw: "H S% L%" — NUNCA "hsl()", NUNCA hex, NUNCA rgb.

═══════════════════════════════════════
REGRAS VISUAIS OBRIGATÓRIAS (DARK MODE)
═══════════════════════════════════════
- background: matiz da marca, saturação 10-20%, luminosidade 6-12%. Ex: "220 15% 9%"
- foreground: mesmo matiz, saturação 5-15%, luminosidade 90-98%. Ex: "220 10% 95%"
- card: EXATAMENTE 3-5% mais luminoso que background. Ex: se bg é 9%, card é "220 15% 13%"
- card_foreground: IGUAL ao foreground
- muted: matiz da marca, saturação 10-20%, luminosidade 15-22%. Ex: "220 15% 18%"
- muted_foreground: luminosidade 55-68%. Ex: "220 10% 62%"
- border: luminosidade 18-25%. Ex: "220 12% 22%"
- secondary: próximo ao muted, luminosidade 14-20%. Ex: "220 14% 17%"
- secondary_foreground: luminosidade 85-95%. Ex: "220 10% 90%"

═══════════════════════════════════════
REGRAS VISUAIS OBRIGATÓRIAS (LIGHT MODE)
═══════════════════════════════════════
- background: luminosidade 97-100%. Ex: "0 0% 99%" ou "220 20% 98%"
- foreground: luminosidade 5-15%. Ex: "220 20% 10%"
- card: luminosidade 99-100%, branco puro ou quase. Ex: "0 0% 100%"
- card_foreground: IGUAL ao foreground
- muted: luminosidade 93-96%. Ex: "220 15% 95%"
- muted_foreground: luminosidade 35-48%. Ex: "220 10% 42%"
- border: luminosidade 85-92%. Ex: "220 10% 88%"
- secondary: luminosidade 94-97%. Ex: "220 15% 96%"
- secondary_foreground: luminosidade 15-30%. Ex: "220 15% 25%"

═══════════════════════════════════════
REGRAS PARA PRIMARY (AMBOS OS MODOS)
═══════════════════════════════════════
A cor primary é a IDENTIDADE da marca. Deve ser VIBRANTE e MEMORÁVEL.
- Saturação: SEMPRE ≥ 60% (cores vivas, NUNCA acinzentadas)
- Luminosidade: 45-65% (visível tanto em dark quanto em light)
- primary_foreground: branco "0 0% 100%" se primary for escura, ou "0 0% 5%" se primary for clara

═══════════════════════════════════════
REGRAS PARA ACCENT
═══════════════════════════════════════
- DEVE ter contraste com primary (matiz diferente, ≥60° de diferença no círculo cromático)
- Saturação ≥ 50%, luminosidade 45-65%
- accent_foreground: contraste máximo com accent

═══════════════════════════════════════
CHECKLIST DE QUALIDADE (VERIFICAR ANTES DE RESPONDER)
═══════════════════════════════════════
✅ background e foreground têm ≥75% diferença de luminosidade?
✅ card é apenas 3-5% mais claro/escuro que background (NÃO igual, NÃO muito diferente)?
✅ muted_foreground é legível sobre muted (≥30% diferença)?
✅ primary tem saturação ≥ 60%?
✅ border é sutil mas visível (nem igual ao bg, nem muito contrastante)?
✅ Nenhuma cor tem wrapper hsl()?

═══════════════════════════════════════
ANÁLISE DE IMAGENS
═══════════════════════════════════════
${hasImages
  ? `Analise as imagens fornecidas da marca. FOQUE em:
- Logotipo: extraia a cor dominante para usar como PRIMARY
- Paleta existente: respeite as cores da marca
- Estilo visual: determine se combina com dark ou light
- IGNORE completamente elementos de UI de outras aplicações (botões, menus, headers de apps)
- IGNORE screenshots de redes sociais — foque apenas nos materiais de MARCA visíveis`
  : `Baseado na descrição textual, crie uma identidade visual premium e coerente.`}

O tenant se chama: "${tenant?.name || "Não definido"}"`;

    const userContent = hasImages
      ? [
          { type: "text", text: text_prompt || `Analise a identidade visual da marca "${tenant?.name || ''}" nestas imagens. Extraia as cores reais da marca e gere um branding premium. IGNORE elementos de UI de outras apps.` },
          ...imageParts,
        ]
      : text_prompt || `Gere uma proposta de branding premium para a marca "${tenant?.name || ''}" baseada no nome.`;

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
              description: "Gera proposta de branding para SaaS. TODAS as cores em formato HSL raw: 'H S% L%' — SEM hsl() wrapper. Decida se dark ou light mode.",
              parameters: {
                type: "object",
                properties: {
                  theme_mode: {
                    type: "string",
                    enum: ["dark", "light"],
                    description: "Modo de tema escolhido para esta marca. 'dark' para marcas premium/tech/executivas. 'light' para marcas femininas/wellness/clean/educação.",
                  },
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
                      background: { type: "string", description: "Dark: lum 5-15% (ex: 220 15% 10%). Light: lum 95-100% (ex: 0 0% 98%)" },
                      foreground: { type: "string", description: "Dark: lum 85-98% (ex: 220 10% 95%). Light: lum 5-20% (ex: 220 15% 15%)" },
                      muted: { type: "string", description: "Dark: lum 15-25%. Light: lum 88-95%." },
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
                      background: { type: "string", description: "Fundo da página. Dark: lum 5-15%. Light: lum 95-100%." },
                      foreground: { type: "string", description: "Texto principal. Dark: lum 85-98%. Light: lum 5-20%." },
                      card: { type: "string", description: "Fundo de cards. Dark: 2-5% mais claro que bg. Light: 98-100%." },
                      card_foreground: { type: "string", description: "Texto em cards. Igual ao foreground." },
                      muted: { type: "string", description: "Fundo sutil. Dark: lum 15-25%. Light: lum 88-95%." },
                      muted_foreground: { type: "string", description: "Texto secundário. Dark: lum 55-70%. Light: lum 35-50%." },
                      border: { type: "string", description: "Bordas sutis. Dark: lum 18-28%. Light: lum 82-92%." },
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
                required: ["theme_mode", "brand_concept", "brand_attributes", "color_palette", "system_colors", "suggested_name", "typography", "ai_analysis"],
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

    // Post-processing: validate and fix critical contrast issues
    const parseLum = (hsl: string): number => {
      if (!hsl) return -1;
      const parts = hsl.replace(/,/g, ' ').split(/\s+/).map(s => parseFloat(s));
      return parts.length >= 3 ? parts[2] : -1;
    };

    const sc = proposal.system_colors;
    if (sc) {
      const isDark = (proposal.theme_mode || 'dark') === 'dark';
      const bgLum = parseLum(sc.background);
      const fgLum = parseLum(sc.foreground);

      // Fix: ensure bg/fg contrast ≥ 75%
      if (bgLum >= 0 && fgLum >= 0 && Math.abs(bgLum - fgLum) < 70) {
        if (isDark) {
          sc.foreground = sc.foreground.replace(/\d+%$/, '95%');
          sc.background = sc.background.replace(/\d+%$/, '9%');
        } else {
          sc.foreground = sc.foreground.replace(/\d+%$/, '10%');
          sc.background = sc.background.replace(/\d+%$/, '99%');
        }
      }

      // Fix: card_foreground should equal foreground
      sc.card_foreground = sc.foreground;

      // Fix: ensure primary has enough saturation
      if (sc.primary) {
        const primaryParts = sc.primary.replace(/,/g, ' ').split(/\s+/).map(s => parseFloat(s));
        if (primaryParts.length >= 3 && primaryParts[1] < 50) {
          sc.primary = `${Math.round(primaryParts[0])} ${Math.max(60, Math.round(primaryParts[1]))}% ${Math.round(primaryParts[2])}%`;
        }
      }

      // Sync palette with system colors
      if (proposal.color_palette) {
        proposal.color_palette.primary = sc.primary;
        proposal.color_palette.background = sc.background;
        proposal.color_palette.foreground = sc.foreground;
      }

      console.log("Post-processed system_colors:", JSON.stringify(sc));
    }

    // Save proposal to database
    const { data: branding, error: dbError } = await supabase
      .from("tenant_branding")
      .upsert({
        tenant_id,
        status: "draft",
        uploaded_assets: asset_urls,
        theme_mode: proposal.theme_mode || "dark",
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
