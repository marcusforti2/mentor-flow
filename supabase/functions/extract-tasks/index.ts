import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription } = await req.json();

    if (!transcription || transcription.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Transcrição muito curta ou vazia." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um assistente especializado em extrair tarefas acionáveis de transcrições de reuniões de mentoria de vendas e negócios.

REGRAS:
- Só crie tarefas que sejam claramente acionáveis (com verbo de ação).
- Transforme frases vagas em ações concretas quando possível.
- Atribua prioridade baseada no contexto e urgência mencionada.
- Se uma data/prazo for mencionado, inclua em due_date (formato YYYY-MM-DD).
- Cada tarefa deve ter um título curto (máx 80 chars) e descrição opcional mais detalhada.
- Inclua tags relevantes (ex: "vendas", "marketing", "processo", "financeiro").
- confidence é um número de 0 a 1 indicando sua confiança de que aquilo é realmente uma tarefa.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise esta transcrição de reunião e extraia todas as tarefas acionáveis:\n\n${transcription}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_tasks",
              description: "Retorna as tarefas acionáveis extraídas da transcrição.",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Título curto e acionável (máx 80 chars)" },
                        description: { type: "string", description: "Descrição opcional com mais detalhes" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        due_date: { type: "string", description: "YYYY-MM-DD ou null" },
                        tags: { type: "array", items: { type: "string" } },
                        confidence: { type: "number", description: "0 a 1" },
                      },
                      required: ["title", "priority", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_tasks" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content as JSON
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { tasks: [] };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error extracting tasks:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao extrair tarefas" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
