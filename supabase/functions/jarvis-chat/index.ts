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

    // ====== BUILD CONTEXT (parallel) ======
    const [
      { data: mentorProfile },
      { data: tenantData },
      { data: mentorados },
      { data: automations },
      { data: leads },
      { data: recentActivity },
      { data: upcomingEvents },
      { data: emailFlows },
      { data: waConfig },
      { data: trails },
      { data: playbooks },
      { data: journeyStages },
      { data: forms },
      { data: badges },
      { data: popups },
      { data: pipelineStages },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name, email, phone").eq("user_id", callerId).maybeSingle(),
      supabase.from("tenants").select("name, slug, settings").eq("id", tenantId).single(),
      supabase.from("memberships").select("id, user_id, status, created_at").eq("tenant_id", tenantId).eq("role", "mentee").eq("status", "active"),
      supabase.from("tenant_automations").select("automation_key, is_enabled, schedule, last_run_at, last_run_status").eq("tenant_id", tenantId),
      supabase.from("crm_leads").select("id, name, stage, value, source, email, phone, company, notes, owner_membership_id").eq("tenant_id", tenantId).limit(200),
      supabase.from("activity_logs").select("action_type, action_description, created_at, membership_id").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
      supabase.from("calendar_events").select("id, title, event_date, event_time, description, audience_type, meeting_url").eq("tenant_id", tenantId).gte("event_date", new Date().toISOString().split("T")[0]).order("event_date").limit(15),
      supabase.from("email_flows").select("id, name, is_active, description").eq("tenant_id", tenantId),
      supabase.from("whatsapp_config").select("instance_id").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("trails").select("id, title, description, is_published, module_count").eq("tenant_id", tenantId).limit(30),
      supabase.from("playbooks").select("id, title, description, visibility, emoji").eq("tenant_id", tenantId).limit(30),
      supabase.from("cs_journey_stages").select("name, stage_key, day_start, day_end, journey_id").eq("tenant_id", tenantId).order("position"),
      supabase.from("tenant_forms").select("id, title, form_type, is_active").eq("tenant_id", tenantId),
      supabase.from("badges").select("id, name, description, points_required").eq("tenant_id", tenantId),
      supabase.from("tenant_popups").select("id, title, is_active, popup_type").eq("tenant_id", tenantId),
      supabase.from("crm_pipeline_stages").select("id, name, status_key, position, color").eq("tenant_id", tenantId).order("position"),
    ]);

    const menteeIds = mentorados?.map(m => m.id) || [];
    const menteeUserIds = mentorados?.map(m => m.user_id) || [];

    // Secondary parallel fetch
    const [menteeProfilesRes, businessProfilesRes, menteeTasksRes, menteeProspectionsRes, trailProgressRes] = await Promise.all([
      menteeUserIds.length > 0 ? supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", menteeUserIds) : { data: [] },
      menteeIds.length > 0 ? supabase.from("mentee_profiles").select("membership_id, business_name, business_profile").in("membership_id", menteeIds) : { data: [] },
      menteeIds.length > 0 ? supabase.from("campan_tasks").select("mentorado_membership_id, status_column, title, priority, due_date").eq("tenant_id", tenantId) : { data: [] },
      menteeIds.length > 0 ? supabase.from("crm_prospections").select("membership_id, status, temperature, contact_name, company").eq("tenant_id", tenantId) : { data: [] },
      menteeIds.length > 0 ? supabase.from("trail_progress").select("membership_id, completed").in("membership_id", menteeIds) : { data: [] },
    ]);

    const menteeProfiles = (menteeProfilesRes as any).data || [];
    const businessProfiles = (businessProfilesRes as any).data || [];
    const allTasks = (menteeTasksRes as any).data || [];
    const allProspections = (menteeProspectionsRes as any).data || [];
    const allTrailProgress = (trailProgressRes as any).data || [];

    // Build compact context
    const mentorName = mentorProfile?.full_name?.split(" ")[0] || "Mentor";
    const ctx: string[] = [];
    ctx.push(`MENTOR: ${mentorProfile?.full_name} (${mentorProfile?.email}) | PROGRAMA: ${tenantData?.name}`);

    // Mentorados with enriched data
    const mList = mentorados?.map(m => {
      const p = menteeProfiles.find((x: any) => x.user_id === m.user_id);
      const b = businessProfiles.find((x: any) => x.membership_id === m.id);
      const t = allTasks.filter((x: any) => x.mentorado_membership_id === m.id);
      const pr = allProspections.filter((x: any) => x.membership_id === m.id);
      const tp = allTrailProgress.filter((x: any) => x.membership_id === m.id);
      const overdue = t.filter((x: any) => x.due_date && new Date(x.due_date) < new Date() && x.status_column !== "done").length;
      const daysSince = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000);
      return `- ${p?.full_name || "?"} | ${p?.email || ""} | Tel:${p?.phone || "—"} | Negócio:${b?.business_name || "—"} | Tarefas:${t.filter((x: any) => x.status_column === "done").length}/${t.length}${overdue ? ` ⚠${overdue}atrasadas` : ""} | Leads:${pr.length}(${pr.filter((x: any) => x.temperature === "hot").length}🔥) | Trilhas:${tp.filter((x: any) => x.completed).length}✅ | Dias:${daysSince} | ID:${m.id}`;
    }).join("\n") || "Nenhum";
    ctx.push(`MENTORADOS(${mentorados?.length || 0}):\n${mList}`);

    // Automations
    ctx.push(`AUTOMAÇÕES:\n${automations?.map(a => `- ${a.automation_key}: ${a.is_enabled ? "✅" : "⏸"} | Último:${a.last_run_at ? new Date(a.last_run_at).toLocaleDateString("pt-BR") : "nunca"}(${a.last_run_status || "—"})`).join("\n") || "—"}`);

    // CRM summary
    if (leads && leads.length > 0) {
      const sg: Record<string, number> = {};
      let tv = 0;
      leads.forEach(l => { sg[l.stage || "?"] = (sg[l.stage || "?"] || 0) + 1; tv += l.value || 0; });
      ctx.push(`CRM: ${leads.length} leads | R$${tv.toLocaleString()} | ${Object.entries(sg).map(([k, v]) => `${k}:${v}`).join(", ")}`);
    }

    if (pipelineStages?.length) ctx.push(`PIPELINE: ${pipelineStages.map(s => s.name).join(" → ")}`);
    if (recentActivity?.length) ctx.push(`ATIVIDADE(últimas):\n${recentActivity.slice(0, 10).map(a => `- ${a.action_type}: ${a.action_description || ""}`).join("\n")}`);
    if (upcomingEvents?.length) ctx.push(`AGENDA:\n${upcomingEvents.map(e => `- ${e.title} ${e.event_date} ${e.event_time || ""} ${e.meeting_url ? "🔗" : ""} | ID:${e.id}`).join("\n")}`);
    if (emailFlows?.length) ctx.push(`FLUXOS EMAIL: ${emailFlows.map(f => `${f.name}(${f.is_active ? "✅" : "⏸"}) ID:${f.id}`).join(", ")}`);
    ctx.push(`WHATSAPP: ${waConfig?.instance_id ? "✅ Conectado" : "❌ Não configurado"}`);
    if (trails?.length) ctx.push(`TRILHAS(${trails.length}): ${trails.map(t => `"${t.title}"${t.is_published ? "📢" : "📝"} ${t.module_count || 0}mod ID:${t.id}`).join(" | ")}`);
    if (playbooks?.length) ctx.push(`PLAYBOOKS(${playbooks.length}): ${playbooks.map(p => `${p.emoji || "📖"}"${p.title}"(${p.visibility}) ID:${p.id}`).join(" | ")}`);
    if (journeyStages?.length) ctx.push(`JORNADA CS: ${journeyStages.map(s => `${s.name}(d${s.day_start}-${s.day_end})`).join(" → ")}`);
    if (forms?.length) ctx.push(`FORMS: ${forms.map(f => `${f.title}(${f.is_active ? "✅" : "⏸"}) ID:${f.id}`).join(", ")}`);
    if (badges?.length) ctx.push(`BADGES: ${badges.map(b => `${b.name}(${b.points_required}pts) ID:${b.id}`).join(", ")}`);
    if (popups?.length) ctx.push(`POPUPS: ${popups.map(p => `${p.title}(${p.is_active ? "✅" : "⏸"}) ID:${p.id}`).join(", ")}`);

    const fullContext = ctx.join("\n\n");

    // ====== TOOLS ======
    const tools = [
      // AUTOMATIONS
      { type: "function", function: { name: "toggle_automation", description: "Ativa/desativa automação", parameters: { type: "object", properties: { automation_key: { type: "string" }, enabled: { type: "boolean" } }, required: ["automation_key", "enabled"], additionalProperties: false } } },
      { type: "function", function: { name: "run_automation_now", description: "Executa automação agora", parameters: { type: "object", properties: { automation_key: { type: "string" } }, required: ["automation_key"], additionalProperties: false } } },
      // NAVIGATION
      { type: "function", function: { name: "navigate_to_page", description: "Navega para página", parameters: { type: "object", properties: { page: { type: "string", enum: ["dashboard","mentorados","jornada-cs","crm","formularios","trilhas","playbooks","calendario","emails","whatsapp","popups","sos","automacoes","relatorios","perfil","propriedade-intelectual","onboarding-builder","dev-tools","ferramentas-ia"] } }, required: ["page"], additionalProperties: false } } },
      // MENTORADO
      { type: "function", function: { name: "invite_mentorado", description: "Convida mentorado por email", parameters: { type: "object", properties: { email: { type: "string" }, full_name: { type: "string" }, phone: { type: "string" } }, required: ["email", "full_name"], additionalProperties: false } } },
      { type: "function", function: { name: "update_mentorado", description: "Atualiza dados de mentorado", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, full_name: { type: "string" }, phone: { type: "string" }, business_name: { type: "string" }, business_profile: { type: "string" } }, required: ["mentee_membership_id"], additionalProperties: false } } },
      { type: "function", function: { name: "suspend_mentorado", description: "Suspende/reativa mentorado", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, action: { type: "string", enum: ["suspend", "reactivate"] } }, required: ["mentee_membership_id", "action"], additionalProperties: false } } },
      { type: "function", function: { name: "get_mentee_details", description: "Detalhes completos de mentorado", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" } }, required: ["mentee_membership_id"], additionalProperties: false } } },
      // COMMUNICATION
      { type: "function", function: { name: "send_whatsapp_message", description: "Envia WhatsApp para mentorados", parameters: { type: "object", properties: { mentee_membership_ids: { type: "array", items: { type: "string" } }, message_text: { type: "string" } }, required: ["mentee_membership_ids", "message_text"], additionalProperties: false } } },
      { type: "function", function: { name: "send_whatsapp_to_all", description: "Envia WhatsApp para TODOS os mentorados ativos", parameters: { type: "object", properties: { message_text: { type: "string" } }, required: ["message_text"], additionalProperties: false } } },
      { type: "function", function: { name: "send_individual_email", description: "Envia email para mentorado", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, subject: { type: "string" }, body_html: { type: "string" } }, required: ["mentee_membership_id", "subject", "body_html"], additionalProperties: false } } },
      { type: "function", function: { name: "create_email_campaign", description: "Cria campanha de email", parameters: { type: "object", properties: { campaign_name: { type: "string" }, subject: { type: "string" }, body_html: { type: "string" }, audience: { type: "string", enum: ["all_mentees", "specific"] }, mentee_ids: { type: "array", items: { type: "string" } } }, required: ["campaign_name", "subject", "body_html", "audience"], additionalProperties: false } } },
      { type: "function", function: { name: "send_sos_to_mentee", description: "SOS urgência para mentorado", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, message: { type: "string" } }, required: ["mentee_membership_id", "message"], additionalProperties: false } } },
      // CALENDAR
      { type: "function", function: { name: "create_calendar_event", description: "Cria evento", parameters: { type: "object", properties: { title: { type: "string" }, event_date: { type: "string" }, event_time: { type: "string" }, description: { type: "string" }, meeting_url: { type: "string" }, audience_type: { type: "string", enum: ["all", "selected"] }, audience_membership_ids: { type: "array", items: { type: "string" } } }, required: ["title", "event_date"], additionalProperties: false } } },
      { type: "function", function: { name: "update_calendar_event", description: "Atualiza evento", parameters: { type: "object", properties: { event_id: { type: "string" }, title: { type: "string" }, event_date: { type: "string" }, event_time: { type: "string" }, description: { type: "string" }, meeting_url: { type: "string" } }, required: ["event_id"], additionalProperties: false } } },
      { type: "function", function: { name: "delete_calendar_event", description: "Remove evento", parameters: { type: "object", properties: { event_id: { type: "string" } }, required: ["event_id"], additionalProperties: false } } },
      // TASKS
      { type: "function", function: { name: "create_task", description: "Cria tarefa para mentorado", parameters: { type: "object", properties: { mentorado_membership_id: { type: "string" }, title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }, due_date: { type: "string" } }, required: ["mentorado_membership_id", "title"], additionalProperties: false } } },
      { type: "function", function: { name: "update_task_status", description: "Move tarefa", parameters: { type: "object", properties: { task_id: { type: "string" }, status: { type: "string", enum: ["todo", "doing", "done", "blocked"] } }, required: ["task_id", "status"], additionalProperties: false } } },
      { type: "function", function: { name: "bulk_create_tasks", description: "Cria várias tarefas", parameters: { type: "object", properties: { mentorado_membership_id: { type: "string" }, tasks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string" }, due_date: { type: "string" } }, required: ["title"] } } }, required: ["mentorado_membership_id", "tasks"], additionalProperties: false } } },
      { type: "function", function: { name: "delete_task", description: "Remove uma tarefa", parameters: { type: "object", properties: { task_id: { type: "string" } }, required: ["task_id"], additionalProperties: false } } },
      // CRM
      { type: "function", function: { name: "create_lead", description: "Cria lead", parameters: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, company: { type: "string" }, source: { type: "string" }, value: { type: "number" }, notes: { type: "string" }, owner_membership_id: { type: "string" } }, required: ["name"], additionalProperties: false } } },
      { type: "function", function: { name: "update_lead_stage", description: "Move lead no pipeline", parameters: { type: "object", properties: { lead_id: { type: "string" }, stage: { type: "string" } }, required: ["lead_id", "stage"], additionalProperties: false } } },
      { type: "function", function: { name: "delete_lead", description: "Remove lead", parameters: { type: "object", properties: { lead_id: { type: "string" } }, required: ["lead_id"], additionalProperties: false } } },
      { type: "function", function: { name: "create_prospection", description: "Cria prospecção", parameters: { type: "object", properties: { membership_id: { type: "string" }, contact_name: { type: "string" }, company: { type: "string" }, contact_email: { type: "string" }, contact_phone: { type: "string" }, whatsapp: { type: "string" }, instagram_url: { type: "string" }, linkedin_url: { type: "string" }, notes: { type: "string" }, temperature: { type: "string", enum: ["cold", "warm", "hot"] } }, required: ["membership_id", "contact_name"], additionalProperties: false } } },
      // TRAILS
      { type: "function", function: { name: "toggle_trail_publish", description: "Publica/despublica trilha", parameters: { type: "object", properties: { trail_id: { type: "string" }, publish: { type: "boolean" } }, required: ["trail_id", "publish"], additionalProperties: false } } },
      { type: "function", function: { name: "generate_trail_ai", description: "Gera trilha com IA", parameters: { type: "object", properties: { topic: { type: "string" }, num_modules: { type: "number" } }, required: ["topic"], additionalProperties: false } } },
      // PLAYBOOKS
      { type: "function", function: { name: "create_playbook", description: "Cria playbook", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, emoji: { type: "string" }, visibility: { type: "string", enum: ["all_mentees", "specific_mentees", "staff_only", "public"] }, content: { type: "string" } }, required: ["title"], additionalProperties: false } } },
      { type: "function", function: { name: "update_playbook", description: "Atualiza playbook", parameters: { type: "object", properties: { playbook_id: { type: "string" }, title: { type: "string" }, content: { type: "string" }, visibility: { type: "string" } }, required: ["playbook_id"], additionalProperties: false } } },
      { type: "function", function: { name: "generate_playbook_ai", description: "Gera conteúdo de playbook com IA", parameters: { type: "object", properties: { title: { type: "string" }, topic: { type: "string" }, style: { type: "string", enum: ["tutorial", "framework", "checklist", "case_study"] } }, required: ["title", "topic"], additionalProperties: false } } },
      // SEARCH
      { type: "function", function: { name: "search_playbook_content", description: "Busca em playbooks", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } } },
      { type: "function", function: { name: "search_trail_content", description: "Busca em trilhas", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } } },
      // ANALYTICS
      { type: "function", function: { name: "get_tenant_analytics", description: "Métricas do programa", parameters: { type: "object", properties: {}, required: [], additionalProperties: false } } },
      // BADGES
      { type: "function", function: { name: "award_badge", description: "Concede badge", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, badge_id: { type: "string" } }, required: ["mentee_membership_id", "badge_id"], additionalProperties: false } } },
      { type: "function", function: { name: "create_badge", description: "Cria badge", parameters: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, points_required: { type: "number" }, criteria: { type: "string" } }, required: ["name"], additionalProperties: false } } },
      // FORMS
      { type: "function", function: { name: "get_form_submissions", description: "Respostas de formulário", parameters: { type: "object", properties: { form_id: { type: "string" }, limit: { type: "number" } }, required: ["form_id"], additionalProperties: false } } },
      // POPUPS & FLOWS
      { type: "function", function: { name: "toggle_popup", description: "Ativa/desativa popup", parameters: { type: "object", properties: { popup_id: { type: "string" }, is_active: { type: "boolean" } }, required: ["popup_id", "is_active"], additionalProperties: false } } },
      { type: "function", function: { name: "toggle_email_flow", description: "Ativa/desativa fluxo email", parameters: { type: "object", properties: { flow_id: { type: "string" }, is_active: { type: "boolean" } }, required: ["flow_id", "is_active"], additionalProperties: false } } },
    ];

    // ====== SYSTEM PROMPT — JARVIS TONY STARK STYLE ======
    const systemPrompt = `Você é **JARVIS** — o assistente pessoal de ${mentorName}. Pense como o JARVIS do Tony Stark: eficiente, direto, levemente espirituoso, e absurdamente competente.

📅 ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

${fullContext}

## PERSONALIDADE:
- Chame ${mentorName} pelo primeiro nome. Trate como Tony trata o Jarvis — com intimidade e respeito.
- **Respostas ULTRA-CURTAS**: 1-3 frases. Máximo 4 linhas. Sem explicações longas.
- Humor sutil e inteligente quando apropriado. Nunca forçado.
- Quando executar uma ação, confirme em UMA frase: "Feito, ${mentorName}. WhatsApp enviado para Maria e João." 
- Use emojis com moderação (1-2 por resposta, no máximo).

## COMPORTAMENTO INTELIGENTE:
1. **PERGUNTE ANTES** quando a intenção for ambígua:
   - "Enviar para todos ou só os ativos?"
   - "Qual data? Semana que vem?"
   - "Quero confirmar: suspender o João ou só enviar um alerta?"
2. **CONFIRME ações destrutivas** (deletar, suspender, enviar em massa):
   - "Isso afeta ${mentorados?.length || 0} mentorados. Confirma?"
3. **SEJA PROATIVO** — Ao analisar dados, aponte problemas:
   - "Vi que Maria tem 5 tarefas atrasadas. Quer que eu envie um lembrete?"
   - "3 leads esfriaram esta semana. Sugiro um follow-up."
4. **EXECUTE, não instrua** — Nunca diga "você pode ir na página X". FAÇA.
5. **IDENTIFIQUE por NOME** — Nunca peça IDs ao mentor. Use o contexto.
6. **AÇÕES EM CADEIA** — Decomponha pedidos complexos e execute múltiplas ferramentas.
7. **NUNCA mostre IDs** ao mentor — use nomes/títulos.

## FORMATO DE RESPOSTA:
- Texto corrido curto, não listas longas
- Para dados: tabela compacta ou resumo de 2-3 linhas
- Para confirmação de ação: "✅ Feito." + detalhes mínimos
- Para pergunta de clarificação: pergunta direta, sem rodeios`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // First AI call with tools
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: aiMessages, tools, stream: false }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const assistantMessage = aiResult.choices?.[0]?.message;
    const toolResults: any[] = [];
    const executedActions: string[] = [];

    if (assistantMessage?.tool_calls?.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const fn = toolCall.function;
        const args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : fn.arguments;
        let result = "";

        try {
          switch (fn.name) {
            case "toggle_automation": {
              const { error } = await supabase.from("tenant_automations").update({ is_enabled: args.enabled }).eq("tenant_id", tenantId).eq("automation_key", args.automation_key);
              if (error) throw error;
              result = `${args.automation_key} ${args.enabled ? "ativada" : "desativada"}.`;
              executedActions.push(`toggle_automation:${args.automation_key}:${args.enabled}`);
              break;
            }
            case "run_automation_now": {
              const fnMap: Record<string, string> = { weekly_digest: "weekly-digest", re_engage_inactive: "re-engage-inactive", auto_qualify_lead: "auto-qualify-lead", check_badges: "check-badges", check_alerts: "check-alerts", send_prospection_tips: "send-prospection-tips", welcome_onboarding: "welcome-onboarding", meeting_reminder: "meeting-reminder", monthly_mentor_report: "monthly-mentor-report", celebrate_achievements: "celebrate-achievements", metrics_reminder: "metrics-reminder" };
              const fnName = fnMap[args.automation_key];
              if (!fnName) { result = "Automação desconhecida."; break; }
              const r = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId }) });
              result = r.ok ? "Executada." : `Erro: ${await r.text()}`;
              executedActions.push(`run_automation:${args.automation_key}`);
              break;
            }
            case "navigate_to_page": {
              result = `Navegando para ${args.page}.`;
              executedActions.push(`navigate:${args.page}`);
              break;
            }
            case "invite_mentorado": {
              const r = await fetch(`${supabaseUrl}/functions/v1/create-invite`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, email: args.email, role: "mentee", full_name: args.full_name, phone: args.phone || null, invited_by_membership_id: membership_id }) });
              const body = await r.json();
              result = r.ok ? `Convite enviado para ${args.full_name}.` : `Erro: ${JSON.stringify(body)}`;
              executedActions.push(`invite_mentorado:${args.full_name}`);
              break;
            }
            case "update_mentorado": {
              const { data: mm } = await supabase.from("memberships").select("user_id").eq("id", args.mentee_membership_id).single();
              if (!mm) { result = "Não encontrado."; break; }
              if (args.full_name || args.phone) {
                const upd: any = {};
                if (args.full_name) upd.full_name = args.full_name;
                if (args.phone) upd.phone = args.phone;
                await supabase.from("profiles").update(upd).eq("user_id", mm.user_id);
              }
              if (args.business_name || args.business_profile) {
                const upd: any = {};
                if (args.business_name) upd.business_name = args.business_name;
                if (args.business_profile) upd.business_profile = args.business_profile;
                await supabase.from("mentee_profiles").update(upd).eq("membership_id", args.mentee_membership_id);
              }
              result = "Atualizado.";
              executedActions.push(`update_mentorado:${args.mentee_membership_id}`);
              break;
            }
            case "suspend_mentorado": {
              const newStatus = args.action === "suspend" ? "suspended" : "active";
              await supabase.from("memberships").update({ status: newStatus }).eq("id", args.mentee_membership_id);
              result = `${args.action === "suspend" ? "Suspenso" : "Reativado"}.`;
              executedActions.push(`${args.action}_mentorado:${args.mentee_membership_id}`);
              break;
            }
            case "get_mentee_details": {
              const { data: mm } = await supabase.from("memberships").select("user_id, created_at").eq("id", args.mentee_membership_id).single();
              if (!mm) { result = "Não encontrado."; break; }
              const [{ data: prof }, { data: biz }, { data: tasks }, { data: prosp }, { data: trailProg, count: lc }, { data: certs }, { data: behav }, { data: act }] = await Promise.all([
                supabase.from("profiles").select("full_name, email, phone").eq("user_id", mm.user_id).maybeSingle(),
                supabase.from("mentee_profiles").select("business_name, business_profile, pitch_context").eq("membership_id", args.mentee_membership_id).maybeSingle(),
                supabase.from("campan_tasks").select("status_column, title, priority, due_date").eq("mentorado_membership_id", args.mentee_membership_id),
                supabase.from("crm_prospections").select("status, temperature, contact_name, company").eq("membership_id", args.mentee_membership_id),
                supabase.from("trail_progress").select("id", { count: "exact" }).eq("membership_id", args.mentee_membership_id).eq("completed", true),
                supabase.from("certificates").select("id").eq("membership_id", args.mentee_membership_id),
                supabase.from("behavioral_reports").select("disc_profile, enneagram_type, communication_style, strengths, challenges").eq("membership_id", args.mentee_membership_id).maybeSingle(),
                supabase.from("activity_logs").select("action_type, action_description, created_at").eq("membership_id", args.mentee_membership_id).order("created_at", { ascending: false }).limit(10),
              ]);
              result = JSON.stringify({ nome: prof?.full_name, email: prof?.email, telefone: prof?.phone, membro_desde: mm.created_at, negocio: biz?.business_name, perfil: biz?.business_profile, pitch: biz?.pitch_context, tarefas: { total: tasks?.length || 0, concluidas: tasks?.filter(t => t.status_column === "done").length || 0, pendentes: tasks?.filter(t => t.status_column === "todo").length || 0, atrasadas: tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status_column !== "done").length || 0 }, leads: { total: prosp?.length || 0, quentes: prosp?.filter(p => p.temperature === "hot").length || 0 }, trilhas: { licoes: lc || 0, certificados: certs?.length || 0 }, comportamental: behav || null, atividade: act?.map(a => `${a.action_type}: ${a.action_description}`) });
              break;
            }
            case "send_whatsapp_message": {
              const ids = args.mentee_membership_ids || [];
              const results: string[] = [];
              for (const mid of ids) {
                const { data: mm } = await supabase.from("memberships").select("user_id").eq("id", mid).single();
                if (!mm) { results.push(`${mid}: não encontrado`); continue; }
                const { data: p } = await supabase.from("profiles").select("phone, full_name").eq("user_id", mm.user_id).maybeSingle();
                if (!p?.phone) { results.push(`${p?.full_name || "?"}: sem telefone`); continue; }
                const r = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, to: p.phone, body: args.message_text }) });
                results.push(r.ok ? `${p.full_name}: ✅` : `${p.full_name}: ❌`);
              }
              result = results.join(", ");
              executedActions.push(`send_whatsapp:${ids.length}`);
              break;
            }
            case "send_whatsapp_to_all": {
              const results: string[] = [];
              let sent = 0, failed = 0;
              for (const m of (mentorados || [])) {
                const p = menteeProfiles.find((x: any) => x.user_id === m.user_id);
                if (!p?.phone) { failed++; continue; }
                const r = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, to: p.phone, body: args.message_text }) });
                r.ok ? sent++ : failed++;
              }
              result = `${sent} enviados, ${failed} falhas.`;
              executedActions.push(`send_whatsapp:${sent}/${mentorados?.length || 0}`);
              break;
            }
            case "send_individual_email": {
              const { data: mm } = await supabase.from("memberships").select("user_id").eq("id", args.mentee_membership_id).single();
              if (!mm) { result = "Não encontrado."; break; }
              const { data: p } = await supabase.from("profiles").select("email, full_name").eq("user_id", mm.user_id).maybeSingle();
              if (!p?.email) { result = "Sem email."; break; }
              const r = await fetch(`${supabaseUrl}/functions/v1/send-mentee-email`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, to: p.email, subject: args.subject, html: args.body_html, mentor_name: mentorProfile?.full_name || "Mentor" }) });
              result = r.ok ? `Email enviado para ${p.full_name}.` : `Erro: ${await r.text()}`;
              executedActions.push(`send_email:${p.full_name}`);
              break;
            }
            case "create_email_campaign": {
              const { data: tpl, error: te } = await supabase.from("email_templates").insert({ name: args.campaign_name, subject: args.subject, body_html: args.body_html, owner_membership_id: membership_id, tenant_id: tenantId }).select("id").single();
              if (te) throw te;
              await supabase.from("email_automations").insert({ template_id: tpl.id, owner_membership_id: membership_id, trigger_type: "manual", is_active: true, trigger_config: { audience: args.audience, mentee_ids: args.mentee_ids || [] } });
              result = `Campanha "${args.campaign_name}" criada.`;
              executedActions.push(`create_email_campaign:${args.campaign_name}`);
              break;
            }
            case "send_sos_to_mentee": {
              const r = await fetch(`${supabaseUrl}/functions/v1/send-sos-notification`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, membership_id: args.mentee_membership_id, message: args.message }) });
              result = r.ok ? "SOS enviado." : `Erro: ${await r.text()}`;
              executedActions.push(`send_sos:${args.mentee_membership_id}`);
              break;
            }
            case "create_calendar_event": {
              const { error } = await supabase.from("calendar_events").insert({ title: args.title, event_date: args.event_date, event_time: args.event_time || null, description: args.description || null, meeting_url: args.meeting_url || null, audience_type: args.audience_type || "all", audience_membership_ids: args.audience_membership_ids || null, owner_membership_id: membership_id, tenant_id: tenantId });
              if (error) throw error;
              result = `Evento "${args.title}" criado em ${args.event_date}.`;
              executedActions.push(`create_event:${args.title}`);
              break;
            }
            case "update_calendar_event": {
              const upd: any = {};
              if (args.title) upd.title = args.title;
              if (args.event_date) upd.event_date = args.event_date;
              if (args.event_time) upd.event_time = args.event_time;
              if (args.description) upd.description = args.description;
              if (args.meeting_url) upd.meeting_url = args.meeting_url;
              const { error } = await supabase.from("calendar_events").update(upd).eq("id", args.event_id).eq("tenant_id", tenantId);
              if (error) throw error;
              result = "Evento atualizado.";
              executedActions.push(`update_event:${args.event_id}`);
              break;
            }
            case "delete_calendar_event": {
              await supabase.from("calendar_events").delete().eq("id", args.event_id).eq("tenant_id", tenantId);
              result = "Evento removido.";
              executedActions.push(`delete_event:${args.event_id}`);
              break;
            }
            case "create_task": {
              const { error } = await supabase.from("campan_tasks").insert({ mentorado_membership_id: args.mentorado_membership_id, created_by_membership_id: membership_id, tenant_id: tenantId, title: args.title, description: args.description || null, priority: args.priority || "medium", due_date: args.due_date || null, status_column: "todo" });
              if (error) throw error;
              result = `Tarefa "${args.title}" criada.`;
              executedActions.push(`create_task:${args.title}`);
              break;
            }
            case "bulk_create_tasks": {
              const rows = args.tasks.map((t: any) => ({ mentorado_membership_id: args.mentorado_membership_id, created_by_membership_id: membership_id, tenant_id: tenantId, title: t.title, description: t.description || null, priority: t.priority || "medium", due_date: t.due_date || null, status_column: "todo" }));
              const { error } = await supabase.from("campan_tasks").insert(rows);
              if (error) throw error;
              result = `${rows.length} tarefas criadas.`;
              executedActions.push(`bulk_create_tasks:${rows.length}`);
              break;
            }
            case "update_task_status": {
              await supabase.from("campan_tasks").update({ status_column: args.status }).eq("id", args.task_id).eq("tenant_id", tenantId);
              result = `Tarefa → "${args.status}".`;
              executedActions.push(`update_task:${args.task_id}`);
              break;
            }
            case "delete_task": {
              await supabase.from("campan_tasks").delete().eq("id", args.task_id).eq("tenant_id", tenantId);
              result = "Tarefa removida.";
              executedActions.push(`delete_task:${args.task_id}`);
              break;
            }
            case "create_lead": {
              const { error } = await supabase.from("crm_leads").insert({ name: args.name, email: args.email || null, phone: args.phone || null, company: args.company || null, source: args.source || "jarvis", value: args.value || 0, notes: args.notes || null, owner_membership_id: args.owner_membership_id || null, tenant_id: tenantId, stage: "new" });
              if (error) throw error;
              result = `Lead "${args.name}" criado.`;
              executedActions.push(`create_lead:${args.name}`);
              break;
            }
            case "update_lead_stage": {
              await supabase.from("crm_leads").update({ stage: args.stage }).eq("id", args.lead_id).eq("tenant_id", tenantId);
              result = `Lead → "${args.stage}".`;
              executedActions.push(`update_lead:${args.lead_id}`);
              break;
            }
            case "delete_lead": {
              await supabase.from("crm_leads").delete().eq("id", args.lead_id).eq("tenant_id", tenantId);
              result = "Lead removido.";
              executedActions.push(`delete_lead:${args.lead_id}`);
              break;
            }
            case "create_prospection": {
              const { error } = await supabase.from("crm_prospections").insert({ membership_id: args.membership_id, tenant_id: tenantId, contact_name: args.contact_name, company: args.company || null, contact_email: args.contact_email || null, contact_phone: args.contact_phone || null, whatsapp: args.whatsapp || null, instagram_url: args.instagram_url || null, linkedin_url: args.linkedin_url || null, notes: args.notes || null, temperature: args.temperature || "cold", status: "novo" });
              if (error) throw error;
              result = `Prospecção "${args.contact_name}" criada.`;
              executedActions.push(`create_prospection:${args.contact_name}`);
              break;
            }
            case "toggle_trail_publish": {
              await supabase.from("trails").update({ is_published: args.publish }).eq("id", args.trail_id).eq("tenant_id", tenantId);
              result = `Trilha ${args.publish ? "publicada" : "despublicada"}.`;
              executedActions.push(`toggle_trail:${args.trail_id}`);
              break;
            }
            case "generate_trail_ai": {
              const r = await fetch(`${supabaseUrl}/functions/v1/generate-trail`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, membership_id, topic: args.topic, num_modules: args.num_modules || 4 }) });
              const body = await r.json();
              result = r.ok ? `Trilha "${body.title || args.topic}" gerada com ${body.modules_count || "?"} módulos.` : `Erro: ${JSON.stringify(body)}`;
              executedActions.push(`generate_trail:${args.topic}`);
              break;
            }
            case "create_playbook": {
              const { error } = await supabase.from("playbooks").insert({ title: args.title, description: args.description || null, emoji: args.emoji || "📖", visibility: args.visibility || "all_mentees", content: args.content || "", owner_membership_id: membership_id, tenant_id: tenantId });
              if (error) throw error;
              result = `Playbook "${args.title}" criado.`;
              executedActions.push(`create_playbook:${args.title}`);
              break;
            }
            case "update_playbook": {
              const upd: any = {};
              if (args.title) upd.title = args.title;
              if (args.content) upd.content = args.content;
              if (args.visibility) upd.visibility = args.visibility;
              await supabase.from("playbooks").update(upd).eq("id", args.playbook_id).eq("tenant_id", tenantId);
              result = "Playbook atualizado.";
              executedActions.push(`update_playbook:${args.playbook_id}`);
              break;
            }
            case "generate_playbook_ai": {
              const r = await fetch(`${supabaseUrl}/functions/v1/generate-playbook-content`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, membership_id, title: args.title, topic: args.topic, style: args.style || "tutorial" }) });
              const body = await r.json();
              if (r.ok && body.content) {
                const { error } = await supabase.from("playbooks").insert({ title: args.title, content: body.content, emoji: "🤖", visibility: "all_mentees", owner_membership_id: membership_id, tenant_id: tenantId });
                if (error) throw error;
                result = `Playbook "${args.title}" gerado e salvo.`;
              } else {
                result = `Erro ao gerar: ${JSON.stringify(body)}`;
              }
              executedActions.push(`generate_playbook:${args.title}`);
              break;
            }
            case "search_playbook_content": {
              const { data: pbs } = await supabase.from("playbooks").select("id, title, content, emoji").eq("tenant_id", tenantId);
              if (!pbs?.length) { result = "Nenhum playbook."; break; }
              const q = args.query.toLowerCase();
              const matches = pbs.filter(p => `${p.title} ${p.content || ""}`.toLowerCase().includes(q)).slice(0, 5).map(p => {
                const c = (p.content || "").replace(/<[^>]*>/g, "");
                const i = c.toLowerCase().indexOf(q);
                return { titulo: `${p.emoji || "📖"} ${p.title}`, trecho: i >= 0 ? "..." + c.substring(Math.max(0, i - 80), i + 250) + "..." : c.substring(0, 300) };
              });
              result = matches.length ? JSON.stringify({ resultados: matches.length, playbooks: matches }) : `Nada encontrado para "${args.query}".`;
              break;
            }
            case "search_trail_content": {
              const { data: trs } = await supabase.from("trails").select("id, title").eq("tenant_id", tenantId);
              if (!trs?.length) { result = "Nenhuma trilha."; break; }
              const { data: mods } = await supabase.from("trail_modules").select("id, title, trail_id").in("trail_id", trs.map(t => t.id));
              const mids = mods?.map(m => m.id) || [];
              const { data: lessons } = mids.length ? await supabase.from("trail_lessons").select("title, content, module_id").in("module_id", mids) : { data: [] };
              const q = args.query.toLowerCase();
              const matches = (lessons || []).filter(l => `${l.title} ${l.content || ""}`.toLowerCase().includes(q)).slice(0, 5).map(l => {
                const mod = mods?.find(m => m.id === l.module_id);
                const tr = trs.find(t => t.id === mod?.trail_id);
                return { trilha: tr?.title, modulo: mod?.title, aula: l.title, trecho: (l.content || "").replace(/<[^>]*>/g, "").substring(0, 250) };
              });
              result = matches.length ? JSON.stringify({ resultados: matches.length, aulas: matches }) : `Nada encontrado para "${args.query}".`;
              break;
            }
            case "get_tenant_analytics": {
              const totalMentees = mentorados?.length || 0;
              const completedTasks = allTasks.filter((t: any) => t.status_column === "done").length;
              const hotLeads = allProspections.filter((p: any) => p.temperature === "hot").length;
              const { count: lc2 } = await supabase.from("trail_progress").select("id", { count: "exact" }).in("membership_id", menteeIds).eq("completed", true);
              const { count: cc } = await supabase.from("certificates").select("id", { count: "exact" }).in("membership_id", menteeIds);
              const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
              const { count: act7 } = await supabase.from("activity_logs").select("id", { count: "exact" }).eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString());
              const overdueTasks = allTasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status_column !== "done").length;
              result = JSON.stringify({ mentorados: totalMentees, tarefas: { total: allTasks.length, concluidas: completedTasks, atrasadas: overdueTasks, taxa: allTasks.length > 0 ? Math.round(completedTasks / allTasks.length * 100) + "%" : "0%" }, leads: { total: allProspections.length, quentes: hotLeads }, trilhas: { licoes: lc2 || 0, certificados: cc || 0 }, atividade_7d: act7 || 0, automacoes_ativas: `${automations?.filter(a => a.is_enabled).length}/${automations?.length}` });
              break;
            }
            case "award_badge": {
              await supabase.from("membership_badges").insert({ membership_id: args.mentee_membership_id, badge_id: args.badge_id });
              result = "Badge concedido.";
              executedActions.push(`award_badge:${args.badge_id}`);
              break;
            }
            case "create_badge": {
              const { error } = await supabase.from("badges").insert({ name: args.name, description: args.description || null, points_required: args.points_required || 0, criteria: args.criteria || null, tenant_id: tenantId, owner_membership_id: membership_id });
              if (error) throw error;
              result = `Badge "${args.name}" criado.`;
              executedActions.push(`create_badge:${args.name}`);
              break;
            }
            case "get_form_submissions": {
              const { data: subs } = await supabase.from("form_submissions").select("respondent_name, respondent_email, answers, created_at").eq("form_id", args.form_id).order("created_at", { ascending: false }).limit(args.limit || 10);
              result = JSON.stringify({ total: subs?.length || 0, respostas: subs?.map(s => ({ nome: s.respondent_name, email: s.respondent_email, respostas: s.answers, data: s.created_at })) });
              break;
            }
            case "toggle_popup": {
              await supabase.from("tenant_popups").update({ is_active: args.is_active }).eq("id", args.popup_id).eq("tenant_id", tenantId);
              result = `Popup ${args.is_active ? "ativado" : "desativado"}.`;
              executedActions.push(`toggle_popup:${args.popup_id}`);
              break;
            }
            case "toggle_email_flow": {
              await supabase.from("email_flows").update({ is_active: args.is_active }).eq("id", args.flow_id).eq("tenant_id", tenantId);
              result = `Fluxo ${args.is_active ? "ativado" : "desativado"}.`;
              executedActions.push(`toggle_email_flow:${args.flow_id}`);
              break;
            }
            default:
              result = `Ferramenta "${fn.name}" não reconhecida.`;
          }
        } catch (err: any) {
          result = `Erro: ${err.message}`;
          console.error(`Tool error (${fn.name}):`, err);
        }

        toolResults.push({ role: "tool", tool_call_id: toolCall.id, content: result });
      }

      // Stream final response with tool results
      const followUp = [...aiMessages, assistantMessage, ...toolResults];
      const streamResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: followUp, stream: true }),
      });
      if (!streamResp.ok) throw new Error(`Stream error: ${streamResp.status}`);

      const [cs, ss] = streamResp.body!.tee();
      saveChatStream(supabase, ss, convId);

      return new Response(cs, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": convId, "X-Actions-Executed": JSON.stringify(executedActions) },
      });
    }

    // No tool calls — stream directly
    const streamResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: aiMessages, stream: true }),
    });
    if (!streamResp.ok) throw new Error(`Stream error: ${streamResp.status}`);

    const [cs, ss] = streamResp.body!.tee();
    saveChatStream(supabase, ss, convId);

    try { await supabase.from("ai_tool_usage").insert({ tool_type: "jarvis_chat", membership_id, tenant_id: tenantId }); } catch {}

    return new Response(cs, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": convId, "X-Actions-Executed": "[]" },
    });
  } catch (error) {
    console.error("Jarvis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function saveChatStream(supabase: any, stream: ReadableStream, convId: string) {
  const promise = (async () => {
    const reader = stream.getReader();
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
    } catch (e) { console.warn("Save err:", e); }
    if (fullContent) {
      await supabase.from("chat_messages").insert({ conversation_id: convId, role: "assistant", content: fullContent });
    }
  })();
  promise.catch(e => console.warn("Save err:", e));
}
