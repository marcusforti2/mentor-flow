import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questions, answers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build Q&A text
    const qaText = questions
      .filter((q: any) => answers[q.id] != null && q.question_type !== 'image')
      .map((q: any) => {
        const val = typeof answers[q.id] === 'object'
          ? (answers[q.id] as any).text || JSON.stringify(answers[q.id])
          : String(answers[q.id]);
        return `Pergunta: ${q.question_text}\nResposta: ${val}`;
      })
      .join("\n\n");

    const systemPrompt = `Você é um assistente que analisa respostas de formulários de onboarding e extrai dados estruturados para o perfil de um mentorado.

Analise as perguntas e respostas abaixo e extraia os campos de perfil correspondentes. Use tool calling para retornar os dados estruturados.

Regras:
- full_name: nome completo da pessoa
- email: endereço de email
- phone: número de telefone/WhatsApp (apenas dígitos)
- business_name: nome fantasia ou nome da empresa
- instagram: handle do Instagram (com @)
- linkedin: URL ou handle do LinkedIn
- website: URL do site
- bio: mini bio ou apresentação profissional
- notes: todas as outras informações relevantes formatadas como "Campo: Valor" separadas por quebras de linha (incluir RG, CPF, endereço, estado civil, dados pessoais interessantes, contato de emergência, etc)

Se um campo não for encontrado, retorne string vazia.
Para notes, agregue TODAS as informações que não se encaixam nos outros campos.`;

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
          { role: "user", content: qaText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_profile",
              description: "Extrair dados estruturados do perfil do mentorado a partir das respostas do formulário",
              parameters: {
                type: "object",
                properties: {
                  full_name: { type: "string", description: "Nome completo" },
                  email: { type: "string", description: "Email" },
                  phone: { type: "string", description: "Telefone/WhatsApp" },
                  business_name: { type: "string", description: "Nome da empresa/negócio" },
                  instagram: { type: "string", description: "Instagram handle" },
                  linkedin: { type: "string", description: "LinkedIn URL ou handle" },
                  website: { type: "string", description: "Site/Portfolio URL" },
                  bio: { type: "string", description: "Mini bio profissional" },
                  notes: { type: "string", description: "Todas as outras informações relevantes" },
                },
                required: ["full_name", "email", "phone", "business_name", "instagram", "linkedin", "website", "bio", "notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_profile" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const profile = JSON.parse(toolCall.function.arguments);
    console.log("Extracted profile:", JSON.stringify(profile));

    return new Response(JSON.stringify({ success: true, profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-mentee-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
