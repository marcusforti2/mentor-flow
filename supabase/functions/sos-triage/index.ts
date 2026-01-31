import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TriageRequest {
  problemDescription: string;
  chatHistory: ChatMessage[];
  businessContext?: {
    businessName?: string;
    businessType?: string;
    mainOffer?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const { problemDescription, chatHistory, businessContext } =
      (await req.json()) as TriageRequest;

    const systemPrompt = `Você é um assistente de triagem para um programa de mentoria de vendas. Sua função é:

1. ENTENDER profundamente o problema do mentorado antes de encaminhar ao mentor
2. Fazer perguntas de esclarecimento se o problema não estiver claro
3. Quando tiver informações suficientes, fornecer um direcionamento inicial
4. Preparar um resumo estruturado para o mentor

${businessContext ? `
CONTEXTO DO NEGÓCIO DO MENTORADO:
- Nome do negócio: ${businessContext.businessName || "Não informado"}
- Tipo: ${businessContext.businessType || "Não informado"}
- Oferta principal: ${businessContext.mainOffer || "Não informado"}
` : ""}

REGRAS IMPORTANTES:
- Seja empático e acolhedor
- Faça no MÁXIMO 3 perguntas de esclarecimento
- Se o problema já estiver claro na primeira mensagem, não precisa fazer perguntas
- Sempre termine com um direcionamento prático que o mentorado pode começar a fazer enquanto aguarda o mentor

Você deve responder usando a função 'triage_response' com a estrutura apropriada.`;

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add chat history
    for (const msg of chatHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current problem if it's the first message
    if (chatHistory.length === 0 && problemDescription) {
      messages.push({
        role: "user",
        content: `Preciso de ajuda com o seguinte problema:\n\n${problemDescription}`,
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          tools: [
            {
              type: "function",
              function: {
                name: "triage_response",
                description:
                  "Estrutura a resposta de triagem para o mentorado",
                parameters: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      description:
                        "Mensagem para o mentorado (resposta, perguntas ou direcionamento)",
                    },
                    needsMoreInfo: {
                      type: "boolean",
                      description:
                        "Se ainda precisa de mais informações antes de encaminhar",
                    },
                    category: {
                      type: "string",
                      enum: [
                        "prospecção",
                        "fechamento",
                        "objeções",
                        "precificação",
                        "postura",
                        "técnico",
                        "mindset",
                        "outro",
                      ],
                      description: "Categoria do problema identificado",
                    },
                    priority: {
                      type: "string",
                      enum: ["baixa", "média", "alta", "urgente"],
                      description: "Prioridade sugerida do chamado",
                    },
                    summaryForMentor: {
                      type: "string",
                      description:
                        "Resumo estruturado do problema para o mentor (só preencher quando needsMoreInfo for false)",
                    },
                    initialGuidance: {
                      type: "string",
                      description:
                        "Direcionamento inicial para o mentorado começar a agir (só preencher quando needsMoreInfo for false)",
                    },
                  },
                  required: ["message", "needsMoreInfo"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "triage_response" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("Erro ao processar com IA");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta inválida da IA");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in sos-triage:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
