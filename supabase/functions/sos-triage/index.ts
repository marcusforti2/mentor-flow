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

interface BusinessContext {
  businessName?: string;
  businessType?: string;
  targetAudience?: string;
  mainOffer?: string;
  priceRange?: string;
  uniqueValueProposition?: string;
  painPointsSolved?: string[];
  idealClientProfile?: string;
}

interface TriageRequest {
  problemDescription: string;
  chatHistory: ChatMessage[];
  businessContext?: BusinessContext;
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

    const systemPrompt = `Você é o Mentor Virtual 24/7 de um programa de mentoria de vendas high ticket. Você atua como um coach experiente e acolhedor.

SUA PERSONALIDADE:
- Tom direto mas empático, como um mentor que realmente se importa
- Usa linguagem informal mas profissional
- Faz perguntas estratégicas para entender a situação
- Dá direcionamentos práticos e acionáveis

${businessContext ? `
CONTEXTO DO NEGÓCIO DO MENTORADO:
- Nome do negócio: ${businessContext.businessName || "Não informado"}
- Tipo de negócio: ${businessContext.businessType || "Não informado"}
- Público-alvo: ${businessContext.targetAudience || "Não informado"}
- Oferta principal: ${businessContext.mainOffer || "Não informado"}
- Faixa de preço: ${businessContext.priceRange || "Não informado"}
- Diferencial: ${businessContext.uniqueValueProposition || "Não informado"}
- Dores que resolve: ${businessContext.painPointsSolved?.join(", ") || "Não informado"}
- Cliente ideal: ${businessContext.idealClientProfile || "Não informado"}

Use essas informações para contextualizar suas respostas e dar conselhos específicos para o negócio.
` : "O mentorado ainda não preencheu o perfil do negócio."}

FLUXO DA CONVERSA:
1. PRIMEIRA MENSAGEM: Acolha o mentorado, demonstre que entendeu o problema e faça 1-2 perguntas de esclarecimento se necessário
2. DURANTE A CONVERSA: Continue entendendo a situação, dê dicas práticas enquanto coleta informações
3. QUANDO TIVER INFORMAÇÕES SUFICIENTES: Avise que vai preparar o sinal de SOS para os mentores Jacob e Mari

REGRAS CRÍTICAS:
- Faça no MÁXIMO 3 rodadas de perguntas
- Se o problema já estiver claro na primeira mensagem, já pode finalizar a triagem
- Quando finalizar (needsMoreInfo = false), sua mensagem DEVE incluir:
  "Perfeito! Já tenho todas as informações que preciso. 🎯
  
  Vou preparar agora o sinal de SOS para seus mentores Jacob e Mari. Eles serão notificados imediatamente!
  
  Enquanto aguarda o contato, já comece a aplicar estas orientações..."
- Sempre forneça um direcionamento prático no final

Use a função 'triage_response' para estruturar sua resposta.`;

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
                  "Estrutura a resposta do Mentor Virtual para o mentorado",
                parameters: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      description:
                        "Mensagem do Mentor Virtual para o mentorado (acolhimento, perguntas ou finalização com aviso sobre Jacob e Mari)",
                    },
                    needsMoreInfo: {
                      type: "boolean",
                      description:
                        "Se ainda precisa de mais informações. False quando já pode enviar para os mentores Jacob e Mari.",
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
                        "Resumo estruturado e detalhado do problema para Jacob e Mari (só preencher quando needsMoreInfo for false)",
                    },
                    initialGuidance: {
                      type: "string",
                      description:
                        "Direcionamento prático e acionável para o mentorado começar a aplicar enquanto aguarda os mentores (só preencher quando needsMoreInfo for false)",
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos para continuar." }),
          {
            status: 402,
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

    console.log("SOS Triage - needsMoreInfo:", result.needsMoreInfo, "category:", result.category);

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
