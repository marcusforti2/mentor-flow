import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Texto muito curto. Cole pelo menos um parágrafo sobre o negócio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Você é um especialista em diagnóstico empresarial de mentorias High Ticket. 
Analise o texto fornecido pelo usuário e extraia TODAS as informações possíveis sobre o negócio dele.

IMPORTANTE: Retorne um JSON com tool_call contendo EXATAMENTE os campos abaixo. 
Para cada campo, use APENAS os valores permitidos listados. Se não encontrar informação, use null.

CAMPOS E VALORES PERMITIDOS:

business_name: string (nome do negócio/empresa)
business_type: "mentoria" | "consultoria" | "coaching" | "assessoria" | "servicos_intelectuais" | "outro" | null
target_audience: string (público-alvo descrito em texto livre)
main_offer: string (oferta principal descrita em texto livre)
price_range: string (faixa de preço descrita em texto livre - será mapeada depois)
unique_value_proposition: string (proposta de valor única)
pain_points_solved: string[] (lista de dores que o negócio resolve)
ideal_client_profile: string (perfil do cliente ideal)
daily_prospection_goal: number (meta diária de prospecção, padrão 10)

monthly_revenue: "ate_10k" | "10k_30k" | "30k_50k" | "50k_100k" | "100k_300k" | "acima_300k" | null
team_size: "solo" | "1_3" | "4_10" | "11_30" | "acima_30" | null
time_in_market: "menos_1" | "1_3" | "3_5" | "5_10" | "mais_10" | null
maturity_level: "caos" | "sobrevivencia" | "estruturacao" | "crescimento" | "maturidade" | null
main_chaos_points: string[] (selecione entre: "Vendas imprevisíveis", "Falta de processo comercial", "Sem clareza de números", "Decisões emocionais", "Dependência do dono", "Time desorganizado", "Atendimento inconsistente", "Marketing sem estratégia", "Financeiro bagunçado", "Sem metas claras")

has_commercial_process: boolean
sales_predictability: "zero" | "baixa" | "media" | "alta" | "total" | null
main_bottleneck: string (principal gargalo em texto livre)
owner_dependency_level: "total" | "alta" | "media" | "baixa" | "minima" | null
current_sales_channels: string[] (selecione entre: "instagram", "linkedin", "indicacao", "eventos", "youtube", "podcast", "ads", "email", "whatsapp", "outro")
average_ticket: "ate_1k" | "1k_5k" | "5k_10k" | "10k_30k" | "30k_50k" | "50k_100k" | "acima_100k" | null
sales_cycle_days: number | null
monthly_leads_volume: "menos_10" | "10_30" | "30_50" | "50_100" | "mais_100" | null
conversion_rate: "menos_5" | "5_10" | "10_20" | "20_30" | "mais_30" | "nao_sei" | null

Seja inteligente: se o texto diz "faturo 25 mil por mês", mapeie para "10k_30k".
Se diz "meu time tem 5 pessoas", mapeie para "4_10".
Se diz "vendo pelo Instagram e WhatsApp", mapeie para ["instagram", "whatsapp"].
Extraia o máximo de informações possíveis. Não invente dados que não existem no texto.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise este texto sobre o negócio e extraia os dados do perfil:\n\n${text}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "fill_business_profile",
              description: "Preenche o perfil de negócio com dados extraídos do texto",
              parameters: {
                type: "object",
                properties: {
                  business_name: { type: ["string", "null"] },
                  business_type: { type: ["string", "null"], enum: ["mentoria", "consultoria", "coaching", "assessoria", "servicos_intelectuais", "outro", null] },
                  target_audience: { type: ["string", "null"] },
                  main_offer: { type: ["string", "null"] },
                  price_range: { type: ["string", "null"] },
                  unique_value_proposition: { type: ["string", "null"] },
                  pain_points_solved: { type: "array", items: { type: "string" } },
                  ideal_client_profile: { type: ["string", "null"] },
                  daily_prospection_goal: { type: ["number", "null"] },
                  monthly_revenue: { type: ["string", "null"], enum: ["ate_10k", "10k_30k", "30k_50k", "50k_100k", "100k_300k", "acima_300k", null] },
                  team_size: { type: ["string", "null"], enum: ["solo", "1_3", "4_10", "11_30", "acima_30", null] },
                  time_in_market: { type: ["string", "null"], enum: ["menos_1", "1_3", "3_5", "5_10", "mais_10", null] },
                  maturity_level: { type: ["string", "null"], enum: ["caos", "sobrevivencia", "estruturacao", "crescimento", "maturidade", null] },
                  main_chaos_points: { type: "array", items: { type: "string" } },
                  has_commercial_process: { type: ["boolean", "null"] },
                  sales_predictability: { type: ["string", "null"], enum: ["zero", "baixa", "media", "alta", "total", null] },
                  main_bottleneck: { type: ["string", "null"] },
                  owner_dependency_level: { type: ["string", "null"], enum: ["total", "alta", "media", "baixa", "minima", null] },
                  current_sales_channels: { type: "array", items: { type: "string" } },
                  average_ticket: { type: ["string", "null"], enum: ["ate_1k", "1k_5k", "5k_10k", "10k_30k", "30k_50k", "50k_100k", "acima_100k", null] },
                  sales_cycle_days: { type: ["number", "null"] },
                  monthly_leads_volume: { type: ["string", "null"], enum: ["menos_10", "10_30", "30_50", "50_100", "mais_100", null] },
                  conversion_rate: { type: ["string", "null"], enum: ["menos_5", "5_10", "10_20", "20_30", "mais_30", "nao_sei", null] },
                },
                required: ["business_name", "pain_points_solved", "main_chaos_points", "current_sales_channels"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "fill_business_profile" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("Erro no gateway de IA");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "fill_business_profile") {
      throw new Error("IA não retornou dados estruturados");
    }

    const profileData = JSON.parse(toolCall.function.arguments);

    // Count how many fields were filled
    const filledCount = Object.entries(profileData).filter(([_, v]) => {
      if (v === null || v === undefined) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "string") return v.trim().length > 0;
      return true;
    }).length;

    return new Response(
      JSON.stringify({ profile: profileData, fields_filled: filledCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-business-profile error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
