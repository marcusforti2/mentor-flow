import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "call_analysis":
        systemPrompt = `Você é um especialista em análise de vendas e comunicação comercial. 
Analise a transcrição da chamada fornecida e forneça:
1. Pontuação geral (0-100)
2. Pontos fortes identificados
3. Áreas de melhoria
4. Objeções tratadas corretamente
5. Objeções não tratadas ou mal tratadas
6. Sugestões práticas de melhoria
7. Resumo executivo

Seja específico e forneça exemplos da transcrição quando possível.
Responda em português brasileiro de forma profissional.`;
        userPrompt = `Analise esta transcrição de chamada de vendas:\n\n${data.transcript}`;
        break;

      case "behavioral_report":
        systemPrompt = `Você é um especialista em análise comportamental DISC e Eneagrama focado em vendas.
Com base nas respostas do questionário comportamental, gere um relatório completo incluindo:
1. Perfil DISC (Dominância, Influência, Estabilidade, Conformidade) com percentuais
2. Tipo de Eneagrama provável
3. Estilo de comunicação predominante
4. Pontos fortes para vendas
5. Desafios e áreas de desenvolvimento
6. Recomendações específicas para melhorar performance em vendas
7. Como lidar com diferentes perfis de clientes

Seja detalhado e prático nas recomendações.
Responda em português brasileiro de forma profissional.`;
        userPrompt = `Respostas do questionário comportamental:\n\n${JSON.stringify(data.responses, null, 2)}`;
        break;

      case "chat":
        systemPrompt = `Você é um assistente de IA especializado em vendas e mentoria.
Ajude o usuário com dúvidas sobre técnicas de vendas, objeções, abordagem de clientes, etc.
Seja direto, prático e forneça exemplos quando possível.
Responda em português brasileiro de forma profissional e amigável.`;
        userPrompt = data.message;
        break;

      default:
        throw new Error("Tipo de análise não suportado");
    }

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
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro no serviço de IA");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ success: true, result: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-analysis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
