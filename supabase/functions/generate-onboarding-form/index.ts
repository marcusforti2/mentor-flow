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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { documents, freeText, mentorContext, mode } = await req.json();

    // mode = "full" (generate full form) or "suggest" (suggest fields from description)
    const isFullMode = mode !== "suggest";

    let contentParts: string[] = [];

    if (freeText && freeText.trim()) {
      contentParts.push(`=== TEXTO DO MENTOR ===\n${freeText}`);
    }

    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        contentParts.push(`=== DOCUMENTO: ${doc.name} ===\n${doc.content}`);
      }
    }

    if (contentParts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Envie pelo menos um documento ou texto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = isFullMode
      ? `Você é um especialista em criar formulários de onboarding para programas de mentoria de vendas e negócios.

Sua tarefa é analisar os documentos/textos fornecidos pelo mentor e gerar um formulário de onboarding completo.

O formulário deve conter:

1. **Campos obrigatórios do sistema** (sempre incluir, marcados como system_field: true):
   - full_name (Nome Completo)
   - email (Email)
   - phone (WhatsApp/Telefone)
   - business_name (Nome do Negócio)
   - business_type (Tipo de Negócio - opções: Serviços, Produtos Físicos, Infoprodutos, SaaS/Software, Consultoria, Agência, E-commerce, Outro)
   - main_offer (Principal Oferta/Produto)
   - target_audience (Público-Alvo)
   - monthly_revenue (Faturamento Mensal - opções: Ainda não faturei, Até R$ 5.000/mês, R$ 5.000 a R$ 20.000/mês, R$ 20.000 a R$ 50.000/mês, R$ 50.000 a R$ 100.000/mês, Acima de R$ 100.000/mês)

2. **Perguntas extraídas dos documentos** (baseadas no conteúdo enviado pelo mentor)
   - Adapte as perguntas ao contexto do mentor
   - Use os temas e terminologia dos documentos
   - Varie os tipos de pergunta: text, textarea, select, multiple_choice, yes_no, scale, link, image
   - NÃO inclua perguntas DISC ou de perfil comportamental

Retorne um JSON com esta estrutura EXATA:
{
  "form_title": "Título do formulário",
  "form_description": "Descrição breve",
  "questions": [
    {
      "question_text": "Texto da pergunta",
      "question_type": "system_field" | "text" | "textarea" | "select" | "multiple_choice" | "yes_no" | "scale" | "link" | "image",
      "system_field_key": "full_name" (apenas para system_field),
      "options": [{"text": "Opção", "value": "valor"}] (para select/multiple_choice),
      "is_required": true/false,
      "order_index": 0,
      "section": "basic" | "business" | "custom"
    }
  ]
}

Regras:
- Os campos do sistema vêm primeiro (section: "basic" e "business")
- Depois as perguntas customizadas do mentor (section: "custom")
- NÃO inclua perguntas DISC ou perfil comportamental
- Retorne APENAS o JSON, sem markdown ou texto adicional`
      : `Você é um especialista em criar formulários de onboarding para mentorias.

O mentor descreveu o que quer perguntar. Sugira perguntas específicas e práticas baseadas na descrição.

Varie os tipos: text, textarea, select, multiple_choice, yes_no, scale, link, image.

Retorne um JSON:
{
  "suggestions": [
    {
      "question_text": "Texto da pergunta",
      "question_type": "text" | "textarea" | "select" | "multiple_choice" | "yes_no" | "scale" | "link" | "image",
      "options": [{"text": "Opção", "value": "valor"}] (quando aplicável),
      "is_required": true/false
    }
  ]
}

NÃO inclua perguntas DISC. Retorne APENAS o JSON.`;

    const userPrompt = `${mentorContext ? `Contexto do mentor: ${mentorContext}\n\n` : ""}${isFullMode ? "Analise o seguinte conteúdo e gere o formulário de onboarding" : "Sugira perguntas para o onboarding baseado nesta descrição"}:\n\n${contentParts.join("\n\n")}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("A IA retornou um formato inválido. Tente novamente.");
    }

    return new Response(JSON.stringify({ success: true, ...(isFullMode ? { form: parsed } : { suggestions: parsed.suggestions }) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-onboarding-form error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
