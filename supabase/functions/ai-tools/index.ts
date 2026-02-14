import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ToolType =
  | "script_generator"
  | "objection_simulator"
  | "followup_coach"
  | "content_generator"
  | "proposal_creator"
  | "conversion_analyzer"
  | "virtual_mentor";

interface BusinessProfile {
  business_name: string | null;
  business_type: string | null;
  main_offer: string | null;
  target_audience: string | null;
  unique_value_proposition: string | null;
  pain_points_solved: string[] | null;
  price_range: string | null;
  ideal_client_profile: string | null;
}

function buildBusinessContext(profile: BusinessProfile | null): string {
  if (!profile) {
    return "O usuário ainda não preencheu seu perfil de negócio.";
  }
  
  return `
CONTEXTO DO NEGÓCIO DO MENTORADO:
- Nome do Negócio: ${profile.business_name || "Não informado"}
- Tipo de Negócio: ${profile.business_type || "Não informado"}
- Oferta Principal: ${profile.main_offer || "Não informado"}
- Público-Alvo: ${profile.target_audience || "Não informado"}
- Proposta Única de Valor: ${profile.unique_value_proposition || "Não informado"}
- Dores que Resolve: ${profile.pain_points_solved?.join(", ") || "Não informado"}
- Faixa de Preço: ${profile.price_range || "Não informado"}
- Perfil do Cliente Ideal: ${profile.ideal_client_profile || "Não informado"}
`.trim();
}

function getScriptGeneratorPrompt(scriptType: string, leadContext: string, businessContext: string): string {
  const scriptTypes: Record<string, string> = {
    dm_inicial: "uma DM inicial de prospecção no Instagram/LinkedIn",
    dm_followup: "uma DM de follow-up para quem não respondeu",
    ligacao: "uma ligação de vendas consultiva",
    proposta: "uma apresentação de proposta comercial",
  };

  return `Você é um expert em vendas de alto ticket e copywriting.

${businessContext}

TAREFA: Crie 3 variações de script para ${scriptTypes[scriptType] || scriptType}.

${leadContext ? `CONTEXTO DO LEAD: ${leadContext}` : ""}

REGRAS:
1. Use linguagem natural e persuasiva
2. Inclua gatilhos mentais (escassez, prova social, autoridade)
3. Personalize com base no negócio do mentorado
4. Cada variação deve ter uma abordagem diferente (formal, casual, curiosidade)
5. Inclua CTAs claros

Formato de resposta:
## Variação 1: [Nome do Estilo]
[Script]

## Variação 2: [Nome do Estilo]
[Script]

## Variação 3: [Nome do Estilo]
[Script]

## Dicas de Uso
[Orientações sobre quando usar cada variação]`;
}

function getObjectionSimulatorPrompt(
  messages: Array<{role: string; content: string}>, 
  businessContext: string, 
  action: string,
  leadContext?: string,
  leadName?: string,
  withCorrection?: boolean
): string {
  const leadInfo = leadContext 
    ? `\n\nCONTEXTO DO LEAD QUE VOCÊ ESTÁ SIMULANDO:\n${leadContext}`
    : "";
  
  const leadNameDisplay = leadName || "o prospect";

  if (action === "start") {
    return `Você é ${leadName || "um prospect DIFÍCIL"} interessado em serviços de alto ticket. Você está em uma simulação de treinamento de vendas.

${businessContext}
${leadInfo}

TAREFA: Atue como ${leadNameDisplay} que:
- Tem interesse real no serviço, mas com ressalvas
- Levanta objeções baseadas no contexto (${leadContext ? "use as dores e objeções do perfil" : "preço, tempo, confiança, comparação com concorrentes"})
- É cético mas pode ser convencido com bons argumentos
- Faz perguntas difíceis baseadas na sua "realidade"
${leadContext ? "- Mantenha a personalidade e temperatura definida no contexto" : ""}

Inicie a conversa como se estivesse respondendo a uma abordagem inicial do vendedor. Seja curto e direto, como um prospect real faria no WhatsApp.

IMPORTANTE: Não quebre o personagem. Aja como ${leadNameDisplay} REAL, não como uma IA. ${leadName ? `Seu nome é ${leadName}.` : ""}`;
  }

  if (action === "feedback") {
    const conversation = messages.map(m => `${m.role === "user" ? "VENDEDOR" : leadNameDisplay.toUpperCase()}: ${m.content}`).join("\n");
    
    return `Você é um coach de vendas de alto ticket analisando uma simulação de vendas.

${businessContext}
${leadInfo}

CONVERSA SIMULADA:
${conversation}

TAREFA: Forneça um feedback detalhado sobre o desempenho do vendedor.

Formato:
## Nota Geral: X/10

## 💪 Pontos Fortes
- [Lista de acertos]

## ⚠️ Pontos a Melhorar
- [Lista de erros e como corrigir]

## 🎯 Objeções Tratadas
- [Quais objeções foram bem respondidas]

## ❌ Oportunidades Perdidas
- [O que poderia ter sido explorado]
${leadContext ? "\n## 🎭 Aderência ao Perfil do Lead\n- [Como o vendedor se adaptou ao perfil específico]" : ""}

## 📝 Script Ideal
[Como deveria ter sido a resposta em um momento crítico]

## 🚀 Próximos Passos
[Recomendações de estudo e prática]`;
  }

  // Continue conversation with optional real-time correction
  if (withCorrection) {
    return `Você é ${leadNameDisplay} em uma simulação de vendas. Você vai responder em DOIS formatos separados:

${businessContext}
${leadInfo}

FORMATO DE RESPOSTA (JSON):
{
  "response": "[Sua resposta como o prospect - curta e realista como no WhatsApp]",
  "correction": "[Se a última mensagem do vendedor teve algum erro ou poderia ser melhor, dê uma dica de 1-2 frases. Se foi boa, deixe null]"
}

EXEMPLOS DE CORREÇÕES:
- "Você pulou direto para o preço sem entender a dor. Pergunte primeiro sobre os desafios."
- "Boa resposta! Mas poderia ter usado prova social aqui."
- "Evite dar desconto logo de cara. Ancore o valor primeiro."
- null (se a resposta foi adequada)

REGRAS PARA O PROSPECT:
- Levante objeções realistas baseadas no perfil
- Seja desafiador mas justo
- Reaja naturalmente às respostas do vendedor
- Mantenha respostas curtas e realistas
${leadContext ? "- Use as dores, objeções e personalidade do contexto" : ""}

IMPORTANTE: Responda APENAS com o JSON, sem markdown ou texto adicional.`;
  }

  // Continue without correction (legacy)
  return `Você é ${leadNameDisplay} em uma simulação de vendas. Continue a conversa mantendo o personagem.

${businessContext}
${leadInfo}

REGRAS:
- Levante objeções realistas ${leadContext ? "baseadas no perfil do lead" : ""}
- Seja desafiador mas justo
- Reaja naturalmente às respostas do vendedor
- Se o vendedor fizer uma boa argumentação, demonstre interesse gradual
- Mantenha respostas curtas e realistas (como no WhatsApp)
${leadContext ? "- Mantenha a personalidade definida no contexto" : ""}

IMPORTANTE: Não quebre o personagem. Não dê dicas ou feedback durante a conversa.`;
}

function getFollowUpCoachPrompt(lead: any, interactions: any[], businessContext: string): string {
  const interactionHistory = interactions.length > 0
    ? interactions.map(i => `- ${i.type}: ${i.description} (${i.outcome || "sem resultado"})`).join("\n")
    : "Nenhuma interação registrada ainda.";

  return `Você é um coach especialista em follow-up de vendas de alto ticket.

${businessContext}

INFORMAÇÕES DO LEAD:
- Nome: ${lead.contact_name}
- Empresa: ${lead.company || "Não informado"}
- Status atual: ${lead.status}
- Temperatura: ${lead.temperature || "Não definida"}
- Notas: ${lead.notes || "Sem notas"}

HISTÓRICO DE INTERAÇÕES:
${interactionHistory}

TAREFA: Crie uma estratégia de follow-up personalizada.

Formato de resposta:
## 📊 Análise do Lead
[Breve análise do estágio e potencial]

## ⏰ Timing Ideal
[Quando fazer o próximo contato e por quê]

## 💬 Mensagem Sugerida
[Mensagem pronta para enviar]

## 🎯 Estratégia Alternativa
[Abordagem B caso a primeira não funcione]

## ⚠️ Erros a Evitar
[O que NÃO fazer com este lead]`;
}

function getContentGeneratorPrompt(contentType: string, topic: string, businessContext: string): string {
  const contentTypes: Record<string, string> = {
    post_linkedin: "um post para LinkedIn (profissional, com storytelling)",
    carrossel_ig: "um carrossel para Instagram (7-10 slides com hooks visuais)",
    story: "uma sequência de stories (5-7 stories com engajamento)",
    copy_anuncio: "uma copy de anúncio (headline + body + CTA)",
    reels_script: "um roteiro de Reels/TikTok (hook + conteúdo + CTA)",
  };

  return `Você é um expert em marketing de conteúdo para vendas de alto ticket.

${businessContext}

TAREFA: Crie ${contentTypes[contentType] || contentType} sobre o tema: "${topic}"

REGRAS:
1. Use o posicionamento e diferencial do negócio
2. Foque em gerar autoridade e conexão
3. Inclua CTAs estratégicos
4. Adapte a linguagem para a plataforma
5. Use técnicas de copywriting comprovadas

Formato de resposta:
## 📝 Conteúdo Principal
[O conteúdo completo]

## 🎯 Objetivo
[O que este conteúdo deve alcançar]

## #️⃣ Hashtags Sugeridas
[Lista de hashtags relevantes]

## 📅 Melhor Horário para Postar
[Sugestão de timing]

## 💡 Dica de Engajamento
[Como maximizar alcance]`;
}

function getProposalCreatorPrompt(clientName: string, company: string, mainPain: string, proposalType: string, businessContext: string): string {
  return `Você é um especialista em propostas comerciais de alto ticket.

${businessContext}

INFORMAÇÕES DO CLIENTE:
- Nome: ${clientName}
- Empresa: ${company || "Não informado"}
- Dor Principal: ${mainPain}

TIPO DE PROPOSTA: ${proposalType === "completa" ? "Completa e detalhada" : "Resumida e objetiva"}

TAREFA: Crie uma proposta comercial profissional e persuasiva.

Formato de resposta:
# Proposta Comercial

## Para: ${clientName}${company ? ` | ${company}` : ""}

---

## 🎯 Entendemos Seu Desafio
[Diagnóstico personalizado da dor]

## 💡 Nossa Solução
[Como a oferta resolve o problema]

## ✨ O Que Você Vai Receber
[Lista de entregas/benefícios]

## 🏆 Diferenciais
[Por que escolher esta solução]

## 📈 Resultados Esperados
[Projeção de resultados]

## 💰 Investimento
[Apresentação do valor com ancoragem]

## 🛡️ Garantia
[Garantias oferecidas]

## ⏰ Próximos Passos
[CTA claro]

---

*[Assinatura profissional]*`;
}

function getConversionAnalyzerPrompt(leads: any[], businessContext: string): string {
  const wonLeads = leads.filter(l => l.status === "fechado");
  const lostLeads = leads.filter(l => l.status === "perdido");
  const activeLeads = leads.filter(l => !["fechado", "perdido"].includes(l.status));

  const summary = `
Total de Leads: ${leads.length}
Fechados: ${wonLeads.length}
Perdidos: ${lostLeads.length}
Em andamento: ${activeLeads.length}
Taxa de Conversão: ${leads.length > 0 ? ((wonLeads.length / leads.length) * 100).toFixed(1) : 0}%

LEADS FECHADOS:
${wonLeads.map(l => `- ${l.contact_name} (${l.company || "Sem empresa"}) - Temp: ${l.temperature || "N/A"}`).join("\n") || "Nenhum"}

LEADS PERDIDOS:
${lostLeads.map(l => `- ${l.contact_name} (${l.company || "Sem empresa"}) - Temp: ${l.temperature || "N/A"}`).join("\n") || "Nenhum"}
`;

  return `Você é um analista de dados de vendas especializado em identificar padrões de conversão.

${businessContext}

DADOS DO PIPELINE:
${summary}

TAREFA: Analise os dados e identifique padrões de sucesso e fracasso.

Formato de resposta:
## 📊 Visão Geral do Pipeline
[Resumo executivo dos números]

## ✅ Padrões de Sucesso (Leads Fechados)
[O que os leads fechados têm em comum]

## ❌ Padrões de Perda (Leads Perdidos)
[O que os leads perdidos têm em comum]

## 🎯 Perfil do Cliente Ideal Atualizado
[Baseado nos dados reais]

## ⚠️ Pontos de Atenção
[Onde estão os gargalos]

## 🚀 Recomendações de Ação
[O que fazer para melhorar a conversão]

## 📈 Previsão
[Estimativa baseada nos padrões identificados]`;
}

function getVirtualMentorPrompt(businessContext: string): string {
  return `Você é um mentor virtual especialista em vendas de alto ticket, atuando como um coach pessoal 24/7.

${businessContext}

SUAS CARACTERÍSTICAS:
- Conhece profundamente o negócio do mentorado
- Dá conselhos práticos e diretos
- Usa exemplos e analogias
- É motivador mas realista
- Foca em ações concretas

ÁREAS DE EXPERTISE:
1. Prospecção e geração de leads
2. Qualificação e diagnóstico
3. Apresentação de propostas
4. Negociação e fechamento
5. Follow-up e relacionamento
6. Mindset e produtividade
7. Precificação e posicionamento

REGRAS:
- Seja conciso e objetivo
- Dê exemplos práticos sempre que possível
- Faça perguntas para entender melhor quando necessário
- Personalize as respostas com base no negócio do mentorado
- Termine com uma ação clara ou próximo passo

Responda à mensagem do mentorado de forma útil e prática.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuthClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { error: authError } = await supabaseAuthClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tool, mentorado_id, data, stream } = await req.json();
    console.log(`AI Tools - Tool: ${tool}, Mentorado: ${mentorado_id}`);

    // Fetch business profile by membership_id
    let { data: businessProfile } = await supabase
      .from("mentorado_business_profiles")
      .select("*")
      .eq("membership_id", mentorado_id)
      .maybeSingle();

    const businessContext = buildBusinessContext(businessProfile);
    let systemPrompt = "";
    let userMessage = "";
    let messages: Array<{role: string; content: string}> = [];

    switch (tool as ToolType) {
      case "script_generator":
        systemPrompt = getScriptGeneratorPrompt(
          data.script_type,
          data.lead_context || "",
          businessContext
        );
        userMessage = `Gere os scripts para: ${data.script_type}`;
        break;

      case "objection_simulator":
        if (data.action === "feedback") {
          systemPrompt = getObjectionSimulatorPrompt(
            data.messages || [], 
            businessContext, 
            "feedback",
            data.lead_context,
            data.lead_name
          );
          userMessage = "Analise a conversa e forneça feedback detalhado.";
        } else if (data.action === "start") {
          systemPrompt = getObjectionSimulatorPrompt(
            [], 
            businessContext, 
            "start",
            data.lead_context,
            data.lead_name
          );
          userMessage = data.lead_name 
            ? `Inicie a simulação como ${data.lead_name}.`
            : "Inicie a simulação como um prospect difícil.";
        } else {
          // Continue conversation with optional real-time correction
          systemPrompt = getObjectionSimulatorPrompt(
            [], 
            businessContext, 
            "continue",
            data.lead_context,
            data.lead_name,
            data.with_correction
          );
          messages = data.messages || [];
        }
        break;

      case "followup_coach":
        // Fetch lead and interactions
        const { data: lead } = await supabase
          .from("crm_prospections")
          .select("*")
          .eq("id", data.lead_id)
          .single();

        const { data: interactions } = await supabase
          .from("crm_interactions")
          .select("*")
          .eq("prospection_id", data.lead_id)
          .order("created_at", { ascending: false });

        systemPrompt = getFollowUpCoachPrompt(lead, interactions || [], businessContext);
        userMessage = "Crie uma estratégia de follow-up para este lead.";
        break;

      case "content_generator":
        systemPrompt = getContentGeneratorPrompt(
          data.content_type,
          data.topic,
          businessContext
        );
        userMessage = `Crie o conteúdo: ${data.content_type} sobre "${data.topic}"`;
        break;

      case "proposal_creator":
        systemPrompt = getProposalCreatorPrompt(
          data.client_name,
          data.company,
          data.main_pain,
          data.proposal_type,
          businessContext
        );
        userMessage = "Crie a proposta comercial.";
        break;

      case "conversion_analyzer":
        // Fetch all leads by membership_id
        const { data: allLeads } = await supabase
          .from("crm_prospections")
          .select("*")
          .eq("membership_id", mentorado_id);

        systemPrompt = getConversionAnalyzerPrompt(allLeads || [], businessContext);
        userMessage = "Analise os padrões de conversão do meu pipeline.";
        break;

      case "virtual_mentor":
        systemPrompt = getVirtualMentorPrompt(businessContext);
        messages = data.messages || [];
        break;

      default:
        throw new Error(`Unknown tool type: ${tool}`);
    }

    // Build messages array
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages.length > 0 ? messages : [{ role: "user", content: userMessage }]),
    ];

    // Check if streaming is requested (for virtual mentor)
    if (stream) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);
        throw new Error("AI Gateway error");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming request
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI Gateway error");
    }

    const aiResponse = await response.json();
    let result = aiResponse.choices?.[0]?.message?.content || "";
    let correction = null;

    // Parse JSON response for objection simulator with corrections
    if (tool === "objection_simulator" && data.with_correction && data.action === "continue") {
      try {
        // Try to extract JSON from the response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          result = parsed.response || result;
          correction = parsed.correction || null;
        }
      } catch (e) {
        console.log("Could not parse correction JSON, using raw response");
      }
    }

    console.log(`AI Tools - Success for tool: ${tool}`);

    return new Response(JSON.stringify({ success: true, result, correction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Tools error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
