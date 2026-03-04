import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { objective, target_audience, tone, num_steps, context } = await req.json();

    if (!objective) {
      return new Response(JSON.stringify({ error: "Objetivo é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em automação de WhatsApp para mentoria de negócios e vendas.
Crie um fluxo de automação de WhatsApp completo com ${num_steps || "3-5"} etapas.

REGRAS:
- Cada etapa tem: order (número sequencial), delay_hours (horas de espera antes de enviar, 0 para a primeira), message_template (texto da mensagem)
- Use {{nome}} como placeholder para o nome do destinatário
- Use emojis de forma profissional e moderada
- Tom: ${tone || "motivacional e profissional"}
- Mensagens curtas e diretas (WhatsApp não é e-mail)
- Máximo 300 caracteres por mensagem
- Delays realistas (ex: 0h para a primeira, 24h, 48h, 72h...)

Retorne um JSON com esta estrutura:
{
  "name": "Nome sugestivo para o fluxo",
  "description": "Descrição curta do fluxo",
  "steps": [
    { "order": 1, "delay_hours": 0, "message_template": "..." },
    { "order": 2, "delay_hours": 24, "message_template": "..." }
  ]
}`;

    const userPrompt = `Objetivo: ${objective}
Público-alvo: ${target_audience || "mentorados de vendas"}
${context ? `Contexto adicional: ${context}` : ""}

Gere o fluxo completo de automação.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_whatsapp_flow",
              description: "Creates a WhatsApp automation flow with sequential message steps",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Flow name" },
                  description: { type: "string", description: "Short flow description" },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        order: { type: "number" },
                        delay_hours: { type: "number" },
                        message_template: { type: "string" },
                      },
                      required: ["order", "delay_hours", "message_template"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["name", "description", "steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_whatsapp_flow" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar fluxo com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou resultado válido" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const flow = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ flow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-whatsapp-flow error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
