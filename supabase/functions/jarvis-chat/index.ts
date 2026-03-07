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
      .limit(40);

    // ====== BUILD FULL MENTOR CONTEXT ======
    const contextParts: string[] = [];

    // 1. Mentor profile
    const { data: mentorProfile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", callerId)
      .maybeSingle();

    const { data: tenantData } = await supabase
      .from("tenants")
      .select("name, slug, settings")
      .eq("id", tenantId)
      .single();

    contextParts.push(`MENTOR: ${mentorProfile?.full_name || "N/A"} (${mentorProfile?.email || "N/A"})
PROGRAMA: ${tenantData?.name || "N/A"} (slug: ${tenantData?.slug || "N/A"})`);

    // 2. All mentorados summary
    const { data: mentorados } = await supabase
      .from("memberships")
      .select("id, user_id, status, created_at")
      .eq("tenant_id", tenantId)
      .eq("role", "mentee")
      .eq("status", "active");

    const menteeIds = mentorados?.map(m => m.id) || [];
    const menteeUserIds = mentorados?.map(m => m.user_id) || [];

    // Get mentee profiles
    let menteeProfiles: any[] = [];
    if (menteeUserIds.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", menteeUserIds);
      menteeProfiles = data || [];
    }

    // Get mentee business profiles
    let businessProfiles: any[] = [];
    if (menteeIds.length > 0) {
      const { data } = await supabase
        .from("mentee_profiles")
        .select("membership_id, business_name, business_profile")
        .in("membership_id", menteeIds);
      businessProfiles = data || [];
    }

    // Build mentorado list
    const mentoradosList = mentorados?.map(m => {
      const profile = menteeProfiles.find(p => p.user_id === m.user_id);
      const biz = businessProfiles.find(b => b.membership_id === m.id);
      return `- ${profile?.full_name || "Sem nome"} (${profile?.email || "N/A"}) | Negócio: ${biz?.business_name || "N/A"} | ID: ${m.id}`;
    }).join("\n") || "Nenhum mentorado";

    contextParts.push(`MENTORADOS (${mentorados?.length || 0} ativos):\n${mentoradosList}`);

    // 3. Automations state
    const { data: automations } = await supabase
      .from("tenant_automations")
      .select("automation_key, is_enabled, schedule, last_run_at, last_run_status, config")
      .eq("tenant_id", tenantId);

    const automationsList = automations?.map(a =>
      `- ${a.automation_key}: ${a.is_enabled ? "✅ ATIVA" : "⏸ DESATIVADA"} | Último run: ${a.last_run_at || "nunca"} (${a.last_run_status || "N/A"}) | Cron: ${a.schedule || "N/A"}`
    ).join("\n") || "Nenhuma automação";

    contextParts.push(`AUTOMAÇÕES:\n${automationsList}`);

    // 4. CRM leads summary
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("stage, value")
      .eq("tenant_id", tenantId);

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

    // 5. Recent activity
    const { data: recentActivity } = await supabase
      .from("activity_logs")
      .select("action_type, action_description, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentActivity && recentActivity.length > 0) {
      contextParts.push(`ATIVIDADES RECENTES:\n${recentActivity.map(a => `- ${a.action_type}: ${a.action_description || ""} (${a.created_at})`).join("\n")}`);
    }

    // 6. Email flows summary
    const { data: emailFlows } = await supabase
      .from("email_flows")
      .select("name, is_active")
      .eq("tenant_id", tenantId);

    if (emailFlows && emailFlows.length > 0) {
      contextParts.push(`FLUXOS DE EMAIL: ${emailFlows.map(f => `${f.name} (${f.is_active ? "ativo" : "inativo"})`).join(", ")}`);
    }

    // 7. Calendar events (upcoming)
    const now = new Date().toISOString().split("T")[0];
    const { data: upcomingEvents } = await supabase
      .from("calendar_events")
      .select("title, event_date, event_time")
      .eq("tenant_id", tenantId)
      .gte("event_date", now)
      .order("event_date")
      .limit(5);

    if (upcomingEvents && upcomingEvents.length > 0) {
      contextParts.push(`PRÓXIMOS EVENTOS:\n${upcomingEvents.map(e => `- ${e.title} em ${e.event_date} ${e.event_time || ""}`).join("\n")}`);
    }

    // 8. WhatsApp config
    const { data: waConfig } = await supabase
      .from("whatsapp_config")
      .select("instance_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    contextParts.push(`WHATSAPP: ${waConfig?.instance_id ? "✅ Configurado" : "❌ Não configurado"}`);

    const fullContext = contextParts.join("\n\n");

    // Define tools for Jarvis
    const tools = [
      {
        type: "function",
        function: {
          name: "toggle_automation",
          description: "Ativa ou desativa uma automação do tenant. Use quando o mentor pedir para ligar/desligar uma automação.",
          parameters: {
            type: "object",
            properties: {
              automation_key: { type: "string", description: "A chave da automação (ex: weekly_digest, re_engage_inactive)" },
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
          description: "Envia uma mensagem de WhatsApp para um mentorado específico. Use quando o mentor pedir para enviar WhatsApp.",
          parameters: {
            type: "object",
            properties: {
              mentee_membership_id: { type: "string", description: "ID do membership do mentorado" },
              message_text: { type: "string", description: "Texto da mensagem a enviar" },
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
          description: "Cria uma campanha de email para mentorados. Use quando o mentor quiser enviar emails em massa ou criar uma sequência.",
          parameters: {
            type: "object",
            properties: {
              campaign_name: { type: "string", description: "Nome da campanha" },
              subject: { type: "string", description: "Assunto do email" },
              body_html: { type: "string", description: "Corpo do email em HTML" },
              audience: { type: "string", enum: ["all_mentees", "specific"], description: "Para quem enviar" },
              mentee_ids: { type: "array", items: { type: "string" }, description: "IDs dos mentorados (se audience=specific)" },
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
          description: "Cria um evento no calendário. Use quando o mentor pedir para agendar uma reunião ou evento.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Título do evento" },
              event_date: { type: "string", description: "Data no formato YYYY-MM-DD" },
              event_time: { type: "string", description: "Horário no formato HH:MM" },
              description: { type: "string", description: "Descrição do evento" },
              meeting_url: { type: "string", description: "URL da reunião (Zoom, Meet, etc)" },
              audience_type: { type: "string", enum: ["all", "selected"], description: "Para quem é o evento" },
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
          description: "Executa uma automação imediatamente (fora do schedule). Use quando o mentor quiser testar ou forçar uma execução.",
          parameters: {
            type: "object",
            properties: {
              automation_key: { type: "string", description: "Chave da automação a executar" },
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
          description: "Busca informações detalhadas de um mentorado específico incluindo métricas, tarefas e progresso.",
          parameters: {
            type: "object",
            properties: {
              mentee_membership_id: { type: "string", description: "ID do membership do mentorado" },
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
          description: "Navega o mentor para uma página específica da plataforma. Use quando o mentor pedir para abrir uma tela, seção ou página.",
          parameters: {
            type: "object",
            properties: {
              page: {
                type: "string",
                enum: ["dashboard", "mentorados", "jornada-cs", "crm", "formularios", "trilhas", "playbooks", "calendario", "emails", "whatsapp", "popups", "sos", "automacoes", "relatorios", "perfil"],
                description: "Página de destino"
              },
            },
            required: ["page"],
            additionalProperties: false,
          },
        },
      },
    ];

    // System prompt
    const systemPrompt = `Você é o **JARVIS** — assistente de IA de comando total do mentor. Você é sofisticado, inteligente e proativo como o JARVIS do Homem de Ferro.

${fullContext}

## SUAS CAPACIDADES:
Você pode EXECUTAR ações reais usando as ferramentas disponíveis:
1. **toggle_automation** — Ligar/desligar automações
2. **send_whatsapp_message** — Enviar WhatsApp para mentorados
3. **create_email_campaign** — Criar campanhas de email
4. **create_calendar_event** — Agendar eventos no calendário
5. **run_automation_now** — Executar automação imediatamente
6. **get_mentee_details** — Buscar detalhes de um mentorado
7. **navigate_to_page** — Navegar para qualquer página da plataforma

## NAVEGAÇÃO DISPONÍVEL:
- dashboard → Painel principal
- mentorados → Lista de mentorados
- jornada-cs → Jornada Customer Success
- crm → CRM de vendas
- formularios → Formulários
- trilhas → Trilhas de aprendizado
- playbooks → Playbooks
- calendario → Calendário de eventos
- emails → Email marketing
- whatsapp → Hub de WhatsApp
- popups → Pop-ups
- sos → Centro SOS
- automacoes → Automações (Jarvis)
- relatorios → Relatórios
- perfil → Meu perfil

## DIRETRIZES:
- Você É o centro de comando do mentor. Tudo que ele precisa, ele pede a você.
- Antes de executar ações destrutivas ou em massa, SEMPRE confirme com o mentor.
- Seja proativo: sugira melhorias, identifique riscos e oportunidades nos dados.
- Quando o mentor perguntar sobre um mentorado, use get_mentee_details para obter dados atualizados.
- Quando o mentor pedir para abrir/ir para uma página, use navigate_to_page.
- Formate respostas em Markdown com emojis para clareza visual.
- Seja direto mas sofisticado. Você é um assistente de alto nível.
- Quando não souber executar algo, explique e sugira alternativas.
- Se o WhatsApp não estiver configurado, avise o mentor.
- Referencie sempre os dados concretos que você tem acesso.
- Ao listar mentorados, não mostre IDs internos — use nomes.
- Respostas CURTAS e diretas. Não seja verboso. Máximo 3-4 parágrafos.`;
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // First AI call with tools
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
        stream: false, // Non-streaming for tool calling
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

    // Process tool calls if any
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
              // Get mentee phone
              const { data: menteeMembership } = await supabase
                .from("memberships")
                .select("user_id")
                .eq("id", mentee_membership_id)
                .single();
              if (!menteeMembership) { result = "Mentorado não encontrado."; break; }
              const { data: menteeProf } = await supabase
                .from("profiles")
                .select("phone, full_name")
                .eq("user_id", menteeMembership.user_id)
                .maybeSingle();
              if (!menteeProf?.phone) { result = `Mentorado ${menteeProf?.full_name || "desconhecido"} não tem telefone cadastrado.`; break; }

              // Call send-whatsapp function
              const waRes = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                },
                body: JSON.stringify({
                  tenant_id: tenantId,
                  to: menteeProf.phone,
                  body: message_text,
                }),
              });
              result = waRes.ok
                ? `WhatsApp enviado para ${menteeProf.full_name} (${menteeProf.phone}).`
                : `Erro ao enviar WhatsApp: ${await waRes.text()}`;
              executedActions.push(`send_whatsapp:${menteeProf.full_name}`);
              break;
            }

            case "create_email_campaign": {
              const { campaign_name, subject, body_html, audience, mentee_ids } = args;
              // Create email template
              const { data: template, error: tplErr } = await supabase
                .from("email_templates")
                .insert({
                  name: campaign_name,
                  subject,
                  body_html,
                  owner_membership_id: membership_id,
                  tenant_id: tenantId,
                })
                .select("id")
                .single();
              if (tplErr) throw tplErr;

              // Create automation
              const { error: autoErr } = await supabase
                .from("email_automations")
                .insert({
                  template_id: template.id,
                  owner_membership_id: membership_id,
                  trigger_type: "manual",
                  is_active: true,
                  trigger_config: {
                    audience,
                    mentee_ids: mentee_ids || [],
                  },
                });
              if (autoErr) throw autoErr;
              result = `Campanha "${campaign_name}" criada com sucesso. Template e automação configurados.`;
              executedActions.push(`create_email_campaign:${campaign_name}`);
              break;
            }

            case "create_calendar_event": {
              const { title, event_date, event_time, description, meeting_url, audience_type } = args;
              const { error: evtErr } = await supabase
                .from("calendar_events")
                .insert({
                  title,
                  event_date,
                  event_time: event_time || null,
                  description: description || null,
                  meeting_url: meeting_url || null,
                  audience_type: audience_type || "all",
                  owner_membership_id: membership_id,
                  tenant_id: tenantId,
                });
              if (evtErr) throw evtErr;
              result = `Evento "${title}" criado para ${event_date} às ${event_time || "horário não definido"}.`;
              executedActions.push(`create_calendar_event:${title}`);
              break;
            }

            case "run_automation_now": {
              const { automation_key } = args;
              const fnMap: Record<string, string> = {
                weekly_digest: "weekly-digest",
                re_engage_inactive: "re-engage-inactive",
                auto_qualify_lead: "auto-qualify-lead",
                check_badges: "check-badges",
                check_alerts: "check-alerts",
                send_prospection_tips: "send-prospection-tips",
                welcome_onboarding: "welcome-onboarding",
                meeting_reminder: "meeting-reminder",
                monthly_mentor_report: "monthly-mentor-report",
                celebrate_achievements: "celebrate-achievements",
                metrics_reminder: "metrics-reminder",
              };
              const fnName = fnMap[automation_key];
              if (!fnName) { result = `Automação "${automation_key}" desconhecida.`; break; }

              const runRes = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                },
                body: JSON.stringify({ tenant_id: tenantId }),
              });
              result = runRes.ok
                ? `Automação "${automation_key}" executada com sucesso.`
                : `Erro ao executar: ${await runRes.text()}`;
              executedActions.push(`run_automation:${automation_key}`);
              break;
            }

            case "get_mentee_details": {
              const { mentee_membership_id } = args;
              const { data: mMembership } = await supabase
                .from("memberships")
                .select("user_id")
                .eq("id", mentee_membership_id)
                .single();
              if (!mMembership) { result = "Mentorado não encontrado."; break; }

              const { data: prof } = await supabase
                .from("profiles")
                .select("full_name, email, phone")
                .eq("user_id", mMembership.user_id)
                .maybeSingle();

              const { data: biz } = await supabase
                .from("mentee_profiles")
                .select("business_name, business_profile")
                .eq("membership_id", mentee_membership_id)
                .maybeSingle();

              const { data: tasks } = await supabase
                .from("campan_tasks")
                .select("status_column")
                .eq("mentorado_membership_id", mentee_membership_id);

              const { data: prospections } = await supabase
                .from("crm_prospections")
                .select("status, temperature")
                .eq("membership_id", mentee_membership_id);

              const { data: trailProg, count: lessonsCount } = await supabase
                .from("trail_progress")
                .select("id", { count: "exact" })
                .eq("membership_id", mentee_membership_id)
                .eq("completed", true);

              const { data: certs } = await supabase
                .from("certificates")
                .select("id")
                .eq("membership_id", mentee_membership_id);

              const tasksDone = tasks?.filter(t => t.status_column === "done").length || 0;
              const tasksTodo = tasks?.filter(t => t.status_column === "todo").length || 0;
              const hotLeads = prospections?.filter(p => p.temperature === "hot").length || 0;

              result = JSON.stringify({
                nome: prof?.full_name,
                email: prof?.email,
                telefone: prof?.phone,
                negocio: biz?.business_name,
                tarefas: { total: tasks?.length || 0, concluidas: tasksDone, pendentes: tasksTodo },
                leads: { total: prospections?.length || 0, quentes: hotLeads },
                trilhas: { licoes_concluidas: lessonsCount || 0, certificados: certs?.length || 0 },
              });
              break;
            }

            case "navigate_to_page": {
              const { page } = args;
              result = `Navegando para a página "${page}".`;
              executedActions.push(`navigate:${page}`);
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

      // Tee stream for saving
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
              try {
                const p = JSON.parse(js);
                const c = p.choices?.[0]?.delta?.content;
                if (c) fullContent += c;
              } catch {}
            }
          }
        } catch (e) { console.warn("Save stream err:", e); }
        if (fullContent) {
          await supabase.from("chat_messages").insert({
            conversation_id: convId, role: "assistant", content: fullContent,
          });
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
    // Re-call with streaming
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
            try {
              const p = JSON.parse(js);
              const c = p.choices?.[0]?.delta?.content;
              if (c) fullContent += c;
            } catch {}
          }
        }
      } catch (e) { console.warn("Save stream err:", e); }
      if (fullContent) {
        await supabase.from("chat_messages").insert({
          conversation_id: convId, role: "assistant", content: fullContent,
        });
      }
    })();
    savePromise.catch(e => console.warn("Save err:", e));

    // Track usage
    try {
      await supabase.from("ai_tool_usage").insert({
        tool_type: "jarvis_chat",
        membership_id,
        tenant_id: tenantId,
      });
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
