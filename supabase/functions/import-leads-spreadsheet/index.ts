import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { spreadsheet_data, membership_id, tenant_id, existing_stages } = await req.json();

    if (!spreadsheet_data || !membership_id || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const stagesInfo = existing_stages && existing_stages.length > 0
      ? `Etapas existentes no pipeline: ${existing_stages.map((s: any) => `"${s.name}" (status_key: "${s.status_key}")`).join(", ")}`
      : "Nenhuma etapa customizada existe. Use as etapas padrão: new, contacted, meeting_scheduled, proposal_sent, closed_won, closed_lost";

    const systemPrompt = `Você é um assistente especialista em CRM e análise de dados de leads/prospecção.

Sua tarefa é analisar dados de uma planilha (CSV/texto) e extrair leads para cadastro no CRM.

${stagesInfo}

REGRAS CRÍTICAS:
1. Extraia TODOS os leads da planilha
2. Mapeie as colunas automaticamente (nome, telefone, email, empresa, cargo, temperatura, status/etapa, observações, etc.)
3. Para cada lead, determine a melhor etapa do pipeline baseado nos dados disponíveis
4. Se a planilha menciona etapas que NÃO existem no pipeline atual, crie sugestões de novas etapas com nome, status_key (snake_case sem acentos) e cor
5. Temperatura: determine "cold", "warm" ou "hot" baseado no contexto (se não houver info, use "cold")
6. Seja preciso com telefones e emails - mantenha exatamente como estão
7. Se houver dados de redes sociais (Instagram, LinkedIn, WhatsApp), extraia também

Responda usando a tool fornecida.`;

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
          { role: "user", content: `Analise esta planilha e extraia os leads:\n\n${spreadsheet_data}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "import_leads",
            description: "Importa leads extraídos da planilha para o CRM",
            parameters: {
              type: "object",
              properties: {
                leads: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      contact_name: { type: "string", description: "Nome do contato" },
                      contact_phone: { type: "string", description: "Telefone" },
                      contact_email: { type: "string", description: "Email" },
                      company: { type: "string", description: "Empresa" },
                      position: { type: "string", description: "Cargo" },
                      temperature: { type: "string", enum: ["cold", "warm", "hot"] },
                      status_key: { type: "string", description: "status_key da etapa do pipeline" },
                      notes: { type: "string", description: "Observações/notas" },
                      whatsapp: { type: "string", description: "WhatsApp" },
                      instagram_url: { type: "string", description: "Instagram URL" },
                      linkedin_url: { type: "string", description: "LinkedIn URL" },
                      website_url: { type: "string", description: "Website" },
                    },
                    required: ["contact_name", "temperature", "status_key"],
                    additionalProperties: false,
                  },
                },
                new_stages: {
                  type: "array",
                  description: "Novas etapas que precisam ser criadas no pipeline",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Nome da etapa" },
                      status_key: { type: "string", description: "Chave única (snake_case)" },
                      color: { type: "string", description: "Classe CSS de cor (ex: bg-indigo-500)" },
                    },
                    required: ["name", "status_key", "color"],
                    additionalProperties: false,
                  },
                },
                summary: { type: "string", description: "Resumo da importação" },
              },
              required: ["leads", "new_stages", "summary"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "import_leads" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro na análise de IA");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("IA não retornou dados estruturados");

    const parsed = JSON.parse(toolCall.function.arguments);

    // Now insert into DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Create new stages if needed
    const createdStages: any[] = [];
    if (parsed.new_stages && parsed.new_stages.length > 0) {
      const maxPosition = existing_stages?.length
        ? Math.max(...existing_stages.map((s: any) => s.position || 0))
        : -1;

      const stageInserts = parsed.new_stages.map((s: any, i: number) => ({
        tenant_id,
        membership_id,
        name: s.name,
        status_key: s.status_key,
        color: s.color || "bg-gray-500",
        position: maxPosition + 1 + i,
      }));

      const { data: insertedStages, error: stageErr } = await supabase
        .from("crm_pipeline_stages")
        .insert(stageInserts)
        .select();

      if (stageErr) {
        console.error("Error creating stages:", stageErr);
      } else {
        createdStages.push(...(insertedStages || []));
      }
    }

    // 2. Insert leads
    const allStageKeys = [
      ...(existing_stages || []).map((s: any) => s.status_key),
      ...createdStages.map((s: any) => s.status_key),
    ];
    const firstStageKey = allStageKeys[0] || "new";

    const leadInserts = parsed.leads.map((lead: any) => ({
      membership_id,
      tenant_id,
      contact_name: lead.contact_name,
      contact_phone: lead.contact_phone || null,
      contact_email: lead.contact_email || null,
      company: lead.company || null,
      position: lead.position || null,
      temperature: lead.temperature || "cold",
      status: allStageKeys.includes(lead.status_key) ? lead.status_key : firstStageKey,
      notes: lead.notes || null,
      whatsapp: lead.whatsapp || null,
      instagram_url: lead.instagram_url || null,
      linkedin_url: lead.linkedin_url || null,
      website_url: lead.website_url || null,
    }));

    const { data: insertedLeads, error: leadErr } = await supabase
      .from("crm_prospections")
      .insert(leadInserts)
      .select("id");

    if (leadErr) {
      console.error("Error inserting leads:", leadErr);
      throw new Error("Erro ao salvar leads no banco");
    }

    return new Response(JSON.stringify({
      success: true,
      leads_count: insertedLeads?.length || 0,
      new_stages_count: createdStages.length,
      new_stages: createdStages,
      summary: parsed.summary,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("import-leads-spreadsheet error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
