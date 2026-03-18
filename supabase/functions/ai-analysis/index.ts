import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { type, data, analysis_type, transcription, images, pdf_base64 } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";
    let messageContent: any[] = [];

    // Training analysis (new type)
    if (type === "training_analysis") {
      systemPrompt = `Você é um coach de vendas expert, direto e incisivo. Analise a conversa/transcrição fornecida e retorne OBRIGATORIAMENTE um JSON válido com a seguinte estrutura exata:

{
  "nota_geral": (número de 0 a 100),
  "resumo": "(resumo executivo em 2-3 frases)",
  "ouro_nao_mude": ["(coisas que o vendedor fez MUITO BEM e deve continuar fazendo)"],
  "pontos_fortes": ["(outros pontos positivos identificados)"],
  "muda_urgente": ["(comportamentos que precisam mudar IMEDIATAMENTE para não perder vendas)"],
  "errou_feio": ["(erros graves que podem ter custado a venda ou prejudicado a relação)"],
  "pontos_fracos": ["(áreas que precisam desenvolvimento)"],
  "como_melhorar": [
    {
      "titulo": "(sugestão curta e direta)",
      "detalhes": "(explicação detalhada de COMO implementar essa melhoria, passo a passo, com exemplos práticos de frases e abordagens)"
    }
  ]
}

REGRAS:
- Seja DIRETO e ESPECÍFICO, cite exemplos da conversa
- Use linguagem informal e impactante
- Cada item deve ter no máximo 2 frases (exceto os detalhes do como_melhorar que podem ser mais extensos)
- Mínimo 2 itens por categoria, máximo 5
- A nota deve refletir a qualidade geral da abordagem de vendas
- No campo "como_melhorar", cada item DEVE ter "titulo" (curto) e "detalhes" (explicação completa com exemplos)
- RETORNE APENAS O JSON, sem texto adicional`;

      if (analysis_type === "transcricao") {
        if (pdf_base64) {
          // Document uploaded as base64 (PDF/Word/TXT)
          // For PDFs, send as image_url for vision processing
          // For text-based docs, the base64 data URL is sent for the model to interpret
          messageContent = [
            { type: "text", text: systemPrompt + "\n\nAnalise este documento de transcrição/reunião de vendas. Extraia todo o texto e analise a qualidade da abordagem de vendas:" },
            { type: "image_url", image_url: { url: pdf_base64 } }
          ];
        } else {
          userPrompt = `Analise esta transcrição de chamada/reunião de vendas:\n\n${transcription || ""}`;
          messageContent = [{ type: "text", text: systemPrompt + "\n\n" + userPrompt }];
        }
      } else if (analysis_type === "prints") {
        userPrompt = "Analise estas conversas de prospecção/vendas:";
        messageContent = [
          { type: "text", text: systemPrompt + "\n\n" + userPrompt }
        ];
        
        if (images && Array.isArray(images)) {
          for (const img of images) {
            messageContent.push({
              type: "image_url",
              image_url: { url: img }
            });
          }
        }
      }
    } else {
      // Original analysis types
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
          userPrompt = `Analise esta transcrição de chamada de vendas:\n\n${data?.transcript}`;
          messageContent = [{ type: "text", text: systemPrompt + "\n\n" + userPrompt }];
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
          userPrompt = `Respostas do questionário comportamental:\n\n${JSON.stringify(data?.responses, null, 2)}`;
          messageContent = [{ type: "text", text: systemPrompt + "\n\n" + userPrompt }];
          break;

        case "chat":
          systemPrompt = `Você é um assistente de IA especializado em vendas e mentoria.
Ajude o usuário com dúvidas sobre técnicas de vendas, objeções, abordagem de clientes, etc.
Seja direto, prático e forneça exemplos quando possível.
Responda em português brasileiro de forma profissional e amigável.`;
          userPrompt = data?.message;
          messageContent = [{ type: "text", text: systemPrompt + "\n\n" + userPrompt }];
          break;

        default:
          throw new Error("Tipo de análise não suportado");
      }
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
          { role: "user", content: messageContent },
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
    let content = aiResponse.choices?.[0]?.message?.content;

    // Try to parse JSON from the response for training_analysis
    if (type === "training_analysis" && content) {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        content = jsonMatch[1].trim();
      }
      
      try {
        const parsed = JSON.parse(content);
        return new Response(
          JSON.stringify({ success: true, result: parsed }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        // Return as string if not valid JSON
        return new Response(
          JSON.stringify({ success: true, result: content }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
