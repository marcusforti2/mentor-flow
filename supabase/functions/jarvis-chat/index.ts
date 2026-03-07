import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerUser, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !callerUser?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = callerUser.user.id;

    const { membership_id, conversation_id, message } = await req.json();
    if (!membership_id || !message) throw new Error("membership_id and message required");

    // Validate caller is the membership owner and is staff
    const { data: membership } = await supabase
      .from("memberships")
      .select("tenant_id, user_id, role")
      .eq("id", membership_id)
      .single();
    if (!membership) throw new Error("Membership not found");
    if (membership.user_id !== callerId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["admin", "ops", "mentor", "master_admin"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Only staff can use Jarvis" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = membership.tenant_id;

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const title = message.length > 50 ? message.substring(0, 50) + "..." : message;
      const { data: conv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({ membership_id, tenant_id: tenantId, title })
        .select("id")
        .single();
      if (convErr) throw convErr;
      convId = conv.id;
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      conversation_id: convId, role: "user", content: message,
    });

    // Fetch conversation history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(50);

    // ====== BUILD COMPREHENSIVE CONTEXT ======
    const contextParts: string[] = [];

    // 1. Mentor profile + tenant
    const [
      { data: mentorProfile },
      { data: tenantData },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name, email, phone").eq("user_id", callerId).maybeSingle(),
      supabase.from("tenants").select("name, slug, settings").eq("id", tenantId).single(),
    ]);

    contextParts.push(`MENTOR: ${mentorProfile?.full_name || "N/A"} (${mentorProfile?.email || "N/A"})
PROGRAMA: ${tenantData?.name || "N/A"} (slug: ${tenantData?.slug || "N/A"})`);

    // 2. Mentorados with enriched data (parallel)
    const { data: mentorados } = await supabase
      .from("memberships")
      .select("id, user_id, status, created_at")
      .eq("tenant_id", tenantId)
      .eq("role", "mentee")
      .eq("status", "active");

    const menteeIds = mentorados?.map(m => m.id) || [];
    const menteeUserIds = mentorados?.map(m => m.user_id) || [];

    // Parallel fetch all mentee-related data
    const [
      menteeProfilesRes,
      businessProfilesRes,
      menteeTasksRes,
      menteeProspectionsRes,
      behavioralReportsRes,
    ] = await Promise.all([
      menteeUserIds.length > 0
        ? supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", menteeUserIds)
        : Promise.resolve({ data: [] }),
      menteeIds.length > 0
        ? supabase.from("mentee_profiles").select("membership_id, business_name, business_profile, pitch_context").in("membership_id", menteeIds)
        : Promise.resolve({ data: [] }),
      menteeIds.length > 0
        ? supabase.from("campan_tasks").select("mentorado_membership_id, status_column").eq("tenant_id", tenantId)
        : Promise.resolve({ data: [] }),
      menteeIds.length > 0
        ? supabase.from("crm_prospections").select("membership_id, status, temperature").eq("tenant_id", tenantId)
        : Promise.resolve({ data: [] }),
      menteeIds.length > 0
        ? supabase.from("behavioral_reports").select("membership_id, disc_profile, enneagram_type, communication_style").in("membership_id", menteeIds)
        : Promise.resolve({ data: [] }),
    ]);

    const menteeProfiles = menteeProfilesRes.data || [];
    const businessProfiles = businessProfilesRes.data || [];
    const allTasks = menteeTasksRes.data || [];
    const allProspections = menteeProspectionsRes.data || [];
    const behavioralReports = behavioralReportsRes.data || [];

    const mentoradosList = mentorados?.map(m => {
      const profile = menteeProfiles.find((p: any) => p.user_id === m.user_id);
      const biz = businessProfiles.find((b: any) => b.membership_id === m.id);
      const tasks = allTasks.filter((t: any) => t.mentorado_membership_id === m.id);
      const prosp = allProspections.filter((p: any) => p.membership_id === m.id);
      const behav = behavioralReports.find((b: any) => b.membership_id === m.id);
      const tasksDone = tasks.filter((t: any) => t.status_column === "done").length;
      const hotLeads = prosp.filter((p: any) => p.temperature === "hot").length;
      
      let line = `- ${profile?.full_name || "Sem nome"} | Negócio: ${biz?.business_name || "N/A"} | Tarefas: ${tasksDone}/${tasks.length} concluídas | Leads: ${prosp.length} (${hotLeads} quentes)`;
      if (behav?.disc_profile) line += ` | DISC: ${JSON.stringify(behav.disc_profile)}`;
      if (behav?.communication_style) line += ` | Comunicação: ${behav.communication_style}`;
      line += ` | ID: ${m.id}`;
      return line;
    }).join("\n") || "Nenhum mentorado";

    contextParts.push(`MENTORADOS (${mentorados?.length || 0} ativos):\n${mentoradosList}`);

    // 3. Parallel fetch: automations, CRM, activity, events, email, whatsapp, trails, playbooks
    const [
      { data: automations },
      { data: leads },
      { data: recentActivity },
      { data: upcomingEvents },
      { data: emailFlows },
      { data: waConfig },
      { data: trails },
      { data: playbooks },
      { data: formSubmissions },
      { data: journeyStages },
    ] = await Promise.all([
      supabase.from("tenant_automations").select("automation_key, is_enabled, schedule, last_run_at, last_run_status, config").eq("tenant_id", tenantId),
      supabase.from("crm_leads").select("stage, value").eq("tenant_id", tenantId),
      supabase.from("activity_logs").select("action_type, action_description, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(15),
      supabase.from("calendar_events").select("title, event_date, event_time, description").eq("tenant_id", tenantId).gte("event_date", new Date().toISOString().split("T")[0]).order("event_date").limit(8),
      supabase.from("email_flows").select("name, is_active, description").eq("tenant_id", tenantId),
      supabase.from("whatsapp_config").select("instance_id").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("trails").select("id, title, description, is_published, module_count").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
      supabase.from("playbooks").select("id, title, description, visibility, emoji, updated_at").eq("tenant_id", tenantId).order("updated_at", { ascending: false }).limit(20),
      supabase.from("form_submissions").select("id, form_id, respondent_name, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
      supabase.from("cs_journey_stages").select("name, stage_key, day_start, day_end, color").eq("tenant_id", tenantId).order("position"),
    ]);

    // Automations
    const automationsList = automations?.map(a =>
      `- ${a.automation_key}: ${a.is_enabled ? "✅ ATIVA" : "⏸ DESATIVADA"} | Último run: ${a.last_run_at || "nunca"} (${a.last_run_status || "N/A"}) | Cron: ${a.schedule || "N/A"}`
    ).join("\n") || "Nenhuma automação";
    contextParts.push(`AUTOMAÇÕES:\n${automationsList}`);

    // CRM
    if (leads && leads.length > 0) {
      const stageGroups: Record<string, number> = {};
      let totalValue = 0;
      leads.forEach(l => {
        stageGroups[l.stage || "sem_stage"] = (stageGroups[l.stage || "sem_stage"] || 0) + 1;
        totalValue += l.value || 0;
      });
      const stagesStr = Object.entries(stageGroups).map(([k, v]) => `${k}: ${v}`).join(", ");
      contextParts.push(`CRM LEADS: ${leads.length} total | Valor: R$${totalValue.toLocaleString()} | Estágios: ${stagesStr}`);
    }

    // Activity
    if (recentActivity && recentActivity.length > 0) {
      contextParts.push(`ATIVIDADES RECENTES:\n${recentActivity.map(a => `- ${a.action_type}: ${a.action_description || ""} (${a.created_at})`).join("\n")}`);
    }

    // Events
    if (upcomingEvents && upcomingEvents.length > 0) {
      contextParts.push(`PRÓXIMOS EVENTOS:\n${upcomingEvents.map(e => `- ${e.title} em ${e.event_date} ${e.event_time || ""}`).join("\n")}`);
    }

    // Emails
    if (emailFlows && emailFlows.length > 0) {
      contextParts.push(`FLUXOS DE EMAIL: ${emailFlows.map(f => `${f.name} (${f.is_active ? "ativo" : "inativo"})`).join(", ")}`);
    }

    // WhatsApp
    contextParts.push(`WHATSAPP: ${waConfig?.instance_id ? "✅ Configurado" : "❌ Não configurado"}`);

    // Trails
    if (trails && trails.length > 0) {
      const publishedTrails = trails.filter(t => t.is_published);
      contextParts.push(`TRILHAS (${trails.length} total, ${publishedTrails.length} publicadas):\n${trails.map(t =>
        `- "${t.title}" | ${t.is_published ? "📢 Publicada" : "📝 Rascunho"} | ${t.module_count || 0} módulos | ID: ${t.id}`
      ).join("\n")}`);
    }

    // Playbooks
    if (playbooks && playbooks.length > 0) {
      contextParts.push(`PLAYBOOKS (${playbooks.length}):\n${playbooks.map(p =>
        `- ${p.emoji || "📖"} "${p.title}" | Visibilidade: ${p.visibility || "N/A"} | Atualizado: ${p.updated_at} | ID: ${p.id}`
      ).join("\n")}`);
    }

    // Journey stages
    if (journeyStages && journeyStages.length > 0) {
      contextParts.push(`JORNADA CS:\n${journeyStages.map(s => `- ${s.name} (dia ${s.day_start}-${s.day_end})`).join("\n")}`);
    }

    // Form submissions
    if (formSubmissions && formSubmissions.length > 0) {
      contextParts.push(`ÚLTIMAS RESPOSTAS DE FORMULÁRIO:\n${formSubmissions.map(f => `- ${f.respondent_name || "Anônimo"} em ${f.created_at}`).join("\n")}`);
    }

    const fullContext = contextParts.join("\n\n");

    // ====== TOOLS ======
    const tools = [
      {
        type: "function",
        function: {
          name: "toggle_automation",
          description: "Ativa ou desativa uma automação do tenant.",
          parameters: {
            type: "object",
            properties: {
              automation_key: { type: "string", description: "Chave da automação (ex: weekly_digest, re_engage_inactive)" },
              enabled: { type: "boolean", description: "true para ativar, false para desativar" },
            },
            required: ["automation_key", "enabled"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "send_whatsapp_message",
          description: "Envia WhatsApp para um mentorado.",
          parameters: {
            type: "object",
            properties: {
              mentee_membership_id: { type: "string", description: "ID do membership do mentorado" },
              message_text: { type: "string", description: "Texto da mensagem" },
            },
            required: ["mentee_membership_id", "message_text"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_email_campaign",
          description: "Cria uma campanha de email para mentorados.",
          parameters: {
            type: "object",
            properties: {
              campaign_name: { type: "string" },
              subject: { type: "string" },
              body_html: { type: "string" },
              audience: { type: "string", enum: ["all_mentees", "specific"] },
              mentee_ids: { type: "array", items: { type: "string" } },
            },
            required: ["campaign_name", "subject", "body_html", "audience"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_calendar_event",
          description: "Cria um evento no calendário.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              event_date: { type: "string", description: "YYYY-MM-DD" },
              event_time: { type: "string", description: "HH:MM" },
              description: { type: "string" },
              meeting_url: { type: "string" },
              audience_type: { type: "string", enum: ["all", "selected"] },
            },
            required: ["title", "event_date", "event_time"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "run_automation_now",
          description: "Executa uma automação imediatamente.",
          parameters: {
            type: "object",
            properties: {
              automation_key: { type: "string" },
            },
            required: ["automation_key"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_mentee_details",
          description: "Busca detalhes completos de um mentorado: métricas, tarefas, leads, progresso em trilhas, perfil comportamental.",
          parameters: {
            type: "object",
            properties: {
              mentee_membership_id: { type: "string" },
            },
            required: ["mentee_membership_id"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "navigate_to_page",
          description: "Navega o mentor para uma página da plataforma.",
          parameters: {
            type: "object",
            properties: {
              page: {
                type: "string",
                enum: ["dashboard", "mentorados", "jornada-cs", "crm", "formularios", "trilhas", "playbooks", "calendario", "emails", "whatsapp", "popups", "sos", "automacoes", "relatorios", "perfil"],
              },
            },
            required: ["page"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "search_playbook_content",
          description: "Busca conteúdo dentro dos playbooks do mentor. Use quando o mentor perguntar sobre metodologia, processos ou conteúdos específicos dos playbooks.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Termo de busca no conteúdo dos playbooks" },
            },
            required: ["query"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "search_trail_content",
          description: "Busca conteúdo dentro das trilhas e aulas do mentor. Use quando o mentor perguntar sobre conteúdos de trilhas ou aulas específicas.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Termo de busca no conteúdo das trilhas/aulas" },
            },
            required: ["query"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "send_individual_email",
          description: "Envia um email individual para um mentorado específico.",
          parameters: {
            type: "object",
            properties: {
              mentee_membership_id: { type: "string", description: "ID do membership do mentorado" },
              subject: { type: "string", description: "Assunto do email" },
              body_html: { type: "string", description: "Corpo do email em HTML" },
            },
            required: ["mentee_membership_id", "subject", "body_html"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_tenant_analytics",
          description: "Busca métricas e analytics gerais do programa de mentoria: engajamento, progresso, retenção.",
          parameters: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      },
    ];

    // System prompt
    const systemPrompt = `Você é o **JARVIS** — assistente de IA de comando total do mentor. Você é sofisticado, inteligente e proativo como o JARVIS do Homem de Ferro.

HOJE: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${fullContext}

## SUAS CAPACIDADES:
Você pode EXECUTAR ações reais usando as ferramentas disponíveis:
1. **toggle_automation** — Ligar/desligar automações
2. **send_whatsapp_message** — Enviar WhatsApp para mentorados
3. **create_email_campaign** — Criar campanhas de email
4. **create_calendar_event** — Agendar eventos no calendário
5. **run_automation_now** — Executar automação imediatamente
6. **get_mentee_details** — Buscar detalhes completos de um mentorado (métricas, tarefas, leads, trilhas, comportamental)
7. **navigate_to_page** — Navegar para qualquer página da plataforma
8. **search_playbook_content** — Buscar dentro dos playbooks do mentor (metodologia, processos)
9. **search_trail_content** — Buscar dentro das trilhas e aulas (conteúdo educacional)
10. **send_individual_email** — Enviar email individual para um mentorado
11. **get_tenant_analytics** — Métricas gerais do programa

## NAVEGAÇÃO:
dashboard, mentorados, jornada-cs, crm, formularios, trilhas, playbooks, calendario, emails, whatsapp, popups, sos, automacoes, relatorios, perfil

## INTELIGÊNCIA CONTEXTUAL:
- Você TEM consciência total do programa: mentorados, negócios, métricas, trilhas, playbooks, automações.
- Use search_playbook_content e search_trail_content quando o mentor perguntar sobre metodologia ou conteúdo.
- Quando perguntarem sobre um mentorado, PRIMEIRO identifique pelo nome no contexto, depois use get_mentee_details.
- Faça análises cruzadas: ex. "mentorado X tem baixo engajamento E não completou a trilha Y".
- Sugira ações proativas baseadas nos dados.

## MEMÓRIA:
- Você tem acesso ao histórico completo desta conversa.
- Você lembra de TUDO que foi dito nesta sessão.
- Se o mentor voltar a um assunto anterior, referencie o contexto.

## DIRETRIZES:
- Antes de ações destrutivas ou em massa, CONFIRME com o mentor.
- Seja proativo: sugira melhorias, identifique riscos e oportunidades.
- Formate respostas em Markdown com emojis.
- Seja direto mas sofisticado. Máximo 3-4 parágrafos.
- Ao listar mentorados, use NOMES, nunca IDs.
- Quando não souber algo, use as ferramentas de busca.
- Se WhatsApp não estiver configurado, avise.
- Referencie dados concretos sempre.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // First AI call with tools (non-streaming for tool calling)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        tools,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI error");
    }

    const aiResult = await aiResponse.json();
    const choice = aiResult.choices?.[0];
    const assistantMessage = choice?.message;

    // Process tool calls
    const toolResults: any[] = [];
    const executedActions: string[] = [];

    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const fn = toolCall.function;
        const args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : fn.arguments;
        let result = "";

        try {
          switch (fn.name) {
            case "toggle_automation": {
              const { automation_key, enabled } = args;
              const { error } = await supabase
                .from("tenant_automations")
                .update({ is_enabled: enabled })
                .eq("tenant_id", tenantId)
                .eq("automation_key", automation_key);
              if (error) throw error;
              result = `Automação "${automation_key}" ${enabled ? "ativada" : "desativada"} com sucesso.`;
              executedActions.push(`toggle_automation:${automation_key}:${enabled}`);
              break;
            }

            case "send_whatsapp_message": {
              const { mentee_membership_id, message_text } = args;
              const { data: menteeMembership } = await supabase.from("memberships").select("user_id").eq("id", mentee_membership_id).single();
              if (!menteeMembership) { result = "Mentorado não encontrado."; break; }
              const { data: menteeProf } = await supabase.from("profiles").select("phone, full_name").eq("user_id", menteeMembership.user_id).maybeSingle();
              if (!menteeProf?.phone) { result = `Mentorado ${menteeProf?.full_name || "desconhecido"} não tem telefone cadastrado.`; break; }

              const waRes = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
                body: JSON.stringify({ tenant_id: tenantId, to: menteeProf.phone, body: message_text }),
              });
              result = waRes.ok
                ? `WhatsApp enviado para ${menteeProf.full_name} (${menteeProf.phone}).`
                : `Erro ao enviar WhatsApp: ${await waRes.text()}`;
              executedActions.push(`send_whatsapp:${menteeProf.full_name}`);
              break;
            }

            case "create_email_campaign": {
              const { campaign_name, subject, body_html, audience, mentee_ids } = args;
              const { data: template, error: tplErr } = await supabase
                .from("email_templates")
                .insert({ name: campaign_name, subject, body_html, owner_membership_id: membership_id, tenant_id: tenantId })
                .select("id").single();
              if (tplErr) throw tplErr;

              const { error: autoErr } = await supabase
                .from("email_automations")
                .insert({ template_id: template.id, owner_membership_id: membership_id, trigger_type: "manual", is_active: true, trigger_config: { audience, mentee_ids: mentee_ids || [] } });
              if (autoErr) throw autoErr;
              result = `Campanha "${campaign_name}" criada com sucesso.`;
              executedActions.push(`create_email_campaign:${campaign_name}`);
              break;
            }

            case "create_calendar_event": {
              const { title, event_date, event_time, description, meeting_url, audience_type } = args;
              const { error: evtErr } = await supabase
                .from("calendar_events")
                .insert({ title, event_date, event_time: event_time || null, description: description || null, meeting_url: meeting_url || null, audience_type: audience_type || "all", owner_membership_id: membership_id, tenant_id: tenantId });
              if (evtErr) throw evtErr;
              result = `Evento "${title}" criado para ${event_date} às ${event_time || "horário não definido"}.`;
              executedActions.push(`create_calendar_event:${title}`);
              break;
            }

            case "run_automation_now": {
              const { automation_key } = args;
              const fnMap: Record<string, string> = {
                weekly_digest: "weekly-digest", re_engage_inactive: "re-engage-inactive",
                auto_qualify_lead: "auto-qualify-lead", check_badges: "check-badges",
                check_alerts: "check-alerts", send_prospection_tips: "send-prospection-tips",
                welcome_onboarding: "welcome-onboarding", meeting_reminder: "meeting-reminder",
                monthly_mentor_report: "monthly-mentor-report", celebrate_achievements: "celebrate-achievements",
                metrics_reminder: "metrics-reminder",
              };
              const fnName = fnMap[automation_key];
              if (!fnName) { result = `Automação "${automation_key}" desconhecida.`; break; }

              const runRes = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
                body: JSON.stringify({ tenant_id: tenantId }),
              });
              result = runRes.ok ? `Automação "${automation_key}" executada.` : `Erro: ${await runRes.text()}`;
              executedActions.push(`run_automation:${automation_key}`);
              break;
            }

            case "get_mentee_details": {
              const { mentee_membership_id } = args;
              const { data: mMembership } = await supabase.from("memberships").select("user_id, created_at").eq("id", mentee_membership_id).single();
              if (!mMembership) { result = "Mentorado não encontrado."; break; }

              const [
                { data: prof },
                { data: biz },
                { data: tasks },
                { data: prospections },
                { data: trailProg, count: lessonsCount },
                { data: certs },
                { data: behav },
                { data: recentAct },
              ] = await Promise.all([
                supabase.from("profiles").select("full_name, email, phone").eq("user_id", mMembership.user_id).maybeSingle(),
                supabase.from("mentee_profiles").select("business_name, business_profile, pitch_context").eq("membership_id", mentee_membership_id).maybeSingle(),
                supabase.from("campan_tasks").select("status_column, title, priority, due_date").eq("mentorado_membership_id", mentee_membership_id),
                supabase.from("crm_prospections").select("status, temperature, contact_name, company").eq("membership_id", mentee_membership_id),
                supabase.from("trail_progress").select("id", { count: "exact" }).eq("membership_id", mentee_membership_id).eq("completed", true),
                supabase.from("certificates").select("id, trail_id").eq("membership_id", mentee_membership_id),
                supabase.from("behavioral_reports").select("disc_profile, enneagram_type, communication_style, strengths, challenges, sales_recommendations").eq("membership_id", mentee_membership_id).maybeSingle(),
                supabase.from("activity_logs").select("action_type, action_description, created_at").eq("membership_id", mentee_membership_id).order("created_at", { ascending: false }).limit(10),
              ]);

              const tasksDone = tasks?.filter(t => t.status_column === "done").length || 0;
              const tasksTodo = tasks?.filter(t => t.status_column === "todo").length || 0;
              const hotLeads = prospections?.filter(p => p.temperature === "hot").length || 0;

              result = JSON.stringify({
                nome: prof?.full_name,
                email: prof?.email,
                telefone: prof?.phone,
                membro_desde: mMembership.created_at,
                negocio: biz?.business_name,
                perfil_negocio: biz?.business_profile,
                pitch_context: biz?.pitch_context,
                tarefas: {
                  total: tasks?.length || 0,
                  concluidas: tasksDone,
                  pendentes: tasksTodo,
                  atrasadas: tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status_column !== "done").length || 0,
                  recentes: tasks?.slice(0, 5).map(t => `${t.title} (${t.status_column})`),
                },
                leads: {
                  total: prospections?.length || 0,
                  quentes: hotLeads,
                  leads_recentes: prospections?.slice(0, 5).map(p => `${p.contact_name} - ${p.company || "N/A"} (${p.temperature})`),
                },
                trilhas: { licoes_concluidas: lessonsCount || 0, certificados: certs?.length || 0 },
                perfil_comportamental: behav ? {
                  disc: behav.disc_profile,
                  enneagrama: behav.enneagram_type,
                  comunicacao: behav.communication_style,
                  forcas: behav.strengths,
                  desafios: behav.challenges,
                  recomendacoes_vendas: behav.sales_recommendations,
                } : null,
                atividade_recente: recentAct?.map(a => `${a.action_type}: ${a.action_description || ""} (${a.created_at})`),
              });
              break;
            }

            case "navigate_to_page": {
              const { page } = args;
              result = `Navegando para "${page}".`;
              executedActions.push(`navigate:${page}`);
              break;
            }

            case "search_playbook_content": {
              const { query } = args;
              const { data: allPlaybooks } = await supabase
                .from("playbooks")
                .select("id, title, content, emoji")
                .eq("tenant_id", tenantId);

              if (!allPlaybooks || allPlaybooks.length === 0) {
                result = "Nenhum playbook encontrado neste tenant.";
                break;
              }

              const queryLower = query.toLowerCase();
              const matches = allPlaybooks
                .filter(p => {
                  const text = `${p.title || ""} ${p.content || ""}`.toLowerCase();
                  return queryLower.split(" ").some(word => text.includes(word));
                })
                .slice(0, 5)
                .map(p => {
                  const content = (p.content || "").replace(/<[^>]*>/g, ""); // strip HTML
                  const idx = content.toLowerCase().indexOf(queryLower.split(" ")[0]);
                  const excerpt = idx >= 0
                    ? "..." + content.substring(Math.max(0, idx - 100), idx + 300) + "..."
                    : content.substring(0, 400) + "...";
                  return { titulo: `${p.emoji || "📖"} ${p.title}`, trecho: excerpt };
                });

              result = matches.length > 0
                ? JSON.stringify({ resultados: matches.length, playbooks: matches })
                : `Nenhum playbook encontrado com "${query}".`;
              break;
            }

            case "search_trail_content": {
              const { query } = args;
              // Get trails with their lessons
              const { data: trailsData } = await supabase
                .from("trails")
                .select("id, title")
                .eq("tenant_id", tenantId);

              if (!trailsData || trailsData.length === 0) {
                result = "Nenhuma trilha encontrada.";
                break;
              }

              const trailIds = trailsData.map(t => t.id);
              const { data: modules } = await supabase
                .from("trail_modules")
                .select("id, title, trail_id")
                .in("trail_id", trailIds);

              const moduleIds = modules?.map(m => m.id) || [];
              const { data: lessons } = moduleIds.length > 0
                ? await supabase
                    .from("trail_lessons")
                    .select("id, title, content, video_url, module_id")
                    .in("module_id", moduleIds)
                : { data: [] };

              const queryLower = query.toLowerCase();
              const matchedLessons = (lessons || [])
                .filter(l => {
                  const text = `${l.title || ""} ${l.content || ""}`.toLowerCase();
                  return queryLower.split(" ").some(word => text.includes(word));
                })
                .slice(0, 5)
                .map(l => {
                  const mod = modules?.find(m => m.id === l.module_id);
                  const trail = trailsData.find(t => t.id === mod?.trail_id);
                  const content = (l.content || "").replace(/<[^>]*>/g, "");
                  const excerpt = content.substring(0, 300) + (content.length > 300 ? "..." : "");
                  return {
                    trilha: trail?.title,
                    modulo: mod?.title,
                    aula: l.title,
                    trecho: excerpt,
                    tem_video: !!l.video_url,
                  };
                });

              result = matchedLessons.length > 0
                ? JSON.stringify({ resultados: matchedLessons.length, aulas: matchedLessons })
                : `Nenhuma aula encontrada com "${query}".`;
              break;
            }

            case "send_individual_email": {
              const { mentee_membership_id, subject, body_html } = args;
              const { data: menteeMem } = await supabase.from("memberships").select("user_id").eq("id", mentee_membership_id).single();
              if (!menteeMem) { result = "Mentorado não encontrado."; break; }
              const { data: menteeProf2 } = await supabase.from("profiles").select("email, full_name").eq("user_id", menteeMem.user_id).maybeSingle();
              if (!menteeProf2?.email) { result = "Mentorado sem email cadastrado."; break; }

              const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-mentee-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
                body: JSON.stringify({
                  tenant_id: tenantId,
                  to: menteeProf2.email,
                  subject,
                  html: body_html,
                  mentor_name: mentorProfile?.full_name || "Mentor",
                }),
              });
              result = emailRes.ok
                ? `Email enviado para ${menteeProf2.full_name} (${menteeProf2.email}).`
                : `Erro ao enviar email: ${await emailRes.text()}`;
              executedActions.push(`send_email:${menteeProf2.full_name}`);
              break;
            }

            case "get_tenant_analytics": {
              // Aggregate analytics
              const totalMentees = mentorados?.length || 0;
              const totalTasks = allTasks.length;
              const completedTasks = allTasks.filter((t: any) => t.status_column === "done").length;
              const totalLeads = allProspections.length;
              const hotLeadsCount = allProspections.filter((p: any) => p.temperature === "hot").length;

              // Trail progress
              const { count: totalLessonsCompleted } = await supabase
                .from("trail_progress")
                .select("id", { count: "exact" })
                .in("membership_id", menteeIds)
                .eq("completed", true);

              const { count: totalCerts } = await supabase
                .from("certificates")
                .select("id", { count: "exact" })
                .in("membership_id", menteeIds);

              // Activity last 7 days
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              const { count: activityLast7Days } = await supabase
                .from("activity_logs")
                .select("id", { count: "exact" })
                .eq("tenant_id", tenantId)
                .gte("created_at", weekAgo.toISOString());

              // Active automations
              const activeAutomations = automations?.filter(a => a.is_enabled).length || 0;

              result = JSON.stringify({
                mentorados_ativos: totalMentees,
                tarefas: { total: totalTasks, concluidas: completedTasks, taxa: totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0 },
                leads: { total: totalLeads, quentes: hotLeadsCount },
                trilhas: { licoes_concluidas: totalLessonsCompleted || 0, certificados: totalCerts || 0 },
                atividade_7_dias: activityLast7Days || 0,
                automacoes_ativas: `${activeAutomations}/${automations?.length || 0}`,
                trilhas_publicadas: trails?.filter(t => t.is_published).length || 0,
                playbooks_total: playbooks?.length || 0,
              });
              break;
            }

            default:
              result = `Ferramenta "${fn.name}" não reconhecida.`;
          }
        } catch (err: any) {
          result = `Erro ao executar ${fn.name}: ${err.message}`;
          console.error(`Tool error (${fn.name}):`, err);
        }

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Second AI call with tool results — stream the final response
      const followUpMessages = [
        ...aiMessages,
        assistantMessage,
        ...toolResults,
      ];

      const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: followUpMessages,
          stream: true,
        }),
      });

      if (!streamResponse.ok) {
        const t = await streamResponse.text();
        console.error("Stream error:", streamResponse.status, t);
        throw new Error("Stream error");
      }

      const [clientStream, saveStream] = streamResponse.body!.tee();

      // Save in background
      const savePromise = (async () => {
        const reader = saveStream.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const js = line.slice(6).trim();
              if (js === "[DONE]") continue;
              try { const p = JSON.parse(js); const c = p.choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {}
            }
          }
        } catch (e) { console.warn("Save stream err:", e); }
        if (fullContent) {
          await supabase.from("chat_messages").insert({ conversation_id: convId, role: "assistant", content: fullContent });
        }
      })();
      savePromise.catch(e => console.warn("Save err:", e));

      return new Response(clientStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-Conversation-Id": convId,
          "X-Actions-Executed": JSON.stringify(executedActions),
        },
      });
    }

    // No tool calls — stream the response directly
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const t = await streamResponse.text();
      console.error("Stream error:", streamResponse.status, t);
      throw new Error("Stream error");
    }

    const [clientStream, saveStream] = streamResponse.body!.tee();

    const savePromise = (async () => {
      const reader = saveStream.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const js = line.slice(6).trim();
            if (js === "[DONE]") continue;
            try { const p = JSON.parse(js); const c = p.choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {}
          }
        }
      } catch (e) { console.warn("Save stream err:", e); }
      if (fullContent) {
        await supabase.from("chat_messages").insert({ conversation_id: convId, role: "assistant", content: fullContent });
      }
    })();
    savePromise.catch(e => console.warn("Save err:", e));

    // Track usage
    try {
      await supabase.from("ai_tool_usage").insert({ tool_type: "jarvis_chat", membership_id, tenant_id: tenantId });
    } catch {}

    return new Response(clientStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Conversation-Id": convId,
        "X-Actions-Executed": "[]",
      },
    });
  } catch (error) {
    console.error("Jarvis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
