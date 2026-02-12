import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { transcription } = await req.json();

    if (!transcription || transcription.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Transcrição muito curta ou vazia." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    const systemPrompt = `Você é um assistente especializado em extrair tarefas acionáveis de transcrições de reuniões de mentoria de vendas e negócios.

REGRAS:
- Só crie tarefas que sejam claramente acionáveis (com verbo de ação).
- Transforme frases vagas em ações concretas quando possível.
- Atribua prioridade baseada no contexto e urgência mencionada.
- Se uma data/prazo for mencionado, inclua em due_date (formato YYYY-MM-DD).
- Retorne um JSON válido, sem markdown.
- Cada tarefa deve ter um título curto (máx 80 chars) e descrição opcional mais detalhada.
- Inclua tags relevantes (ex: "vendas", "marketing", "processo", "financeiro").
- confidence é um número de 0 a 1 indicando sua confiança de que aquilo é realmente uma tarefa.

FORMATO DE SAÍDA (JSON puro, sem markdown):
{
  "tasks": [
    {
      "title": "string curta e acionável",
      "description": "string opcional com mais detalhes",
      "priority": "low|medium|high",
      "due_date": "YYYY-MM-DD ou null",
      "tags": ["string"],
      "confidence": 0.0
    }
  ]
}`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-tools`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        tool: "custom",
        model: "google/gemini-2.5-flash",
        systemPrompt,
        userMessage: `Analise esta transcrição de reunião e extraia todas as tarefas acionáveis:\n\n${transcription}`,
      }),
    });

    if (!response.ok) {
      // Fallback: call Lovable AI proxy directly
      const aiResponse = await fetch("https://ai-proxy.lovable.dev/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analise esta transcrição de reunião e extraia todas as tarefas acionáveis:\n\n${transcription}` },
          ],
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI proxy error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      
      // Parse the JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("IA não retornou JSON válido");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.result || data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : (typeof content === "object" ? content : { tasks: [] });

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
