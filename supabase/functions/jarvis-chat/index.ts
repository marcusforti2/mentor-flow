import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-Conversation-Id, X-Actions-Executed, X-Agent",
};

// Tables Jarvis can read (ALL tables for full access)
const READABLE_TABLES = [
  "memberships", "profiles", "mentee_profiles", "mentor_profiles", "tenants",
  "activity_logs", "ai_tool_history", "ai_tool_usage", "audit_logs",
  "mentee_activities", "ranking_entries", "user_streaks",
  "badges", "membership_badges", "user_badges", "reward_catalog", "reward_redemptions",
  "behavioral_questions", "behavioral_responses", "behavioral_reports",
  "mentee_behavioral_analyses",
  "calendar_events", "event_reminders", "event_mentee_reminders",
  "scheduling_availability", "scheduling_bookings",
  "mentor_availability", "session_bookings",
  "call_transcripts", "call_analyses", "meeting_transcripts",
  "meetings", "meeting_attendees", "meeting_recordings",
  "campan_tasks", "extracted_task_drafts",
  "certificates",
  "chat_conversations", "chat_messages",
  "community_posts", "community_comments", "community_likes", "community_messages",
  "crm_leads", "crm_prospections", "crm_interactions",
  "crm_pipeline_stages", "crm_stage_automations",
  "mentee_deals",
  "cs_journeys", "cs_journey_stages", "mentee_journey_assignments",
  "email_templates", "email_automations", "email_logs",
  "email_flows", "email_flow_executions", "email_flow_triggers",
  "form_submissions", "form_questions", "tenant_forms",
  "google_calendar_tokens", "google_drive_tokens",
  "impersonation_logs", "invites", "mentorado_invites",
  "mentor_mentee_assignments", "mentor_library",
  "mentorado_files",
  "metrics", "metrics_snapshots", "mentee_payments", "program_investments",
  "otp_codes",
  "playbooks", "playbook_access_rules", "playbook_folders", "playbook_pages", "playbook_views",
  "tenant_popups", "popup_dismissals",
  "sos_requests", "sos_responses",
  "roleplay_simulations", "training_analyses",
  "smart_alerts",
  "tenant_automations", "tenant_branding", "tenant_domains",
  "tenant_whatsapp_config",
  "trails", "trail_modules", "trail_lessons", "trail_progress",
  "whatsapp_config", "whatsapp_automation_flows", "whatsapp_messages",
  "whatsapp_campaigns", "whatsapp_daily_summaries",
  "whatsapp_incoming_messages", "whatsapp_auto_reply_config",
  "system_fingerprints",
];

// Tables Jarvis can write to (full access, excluding security-critical tables)
const WRITABLE_TABLES = [
  "memberships", "profiles", "mentee_profiles", "mentor_profiles",
  "activity_logs", "mentee_activities",
  "badges", "membership_badges", "user_badges",
  "reward_catalog", "reward_redemptions", "ranking_entries", "user_streaks",
  "behavioral_questions", "behavioral_responses",
  "mentee_behavioral_analyses",
  "calendar_events", "event_reminders", "event_mentee_reminders",
  "scheduling_availability", "scheduling_bookings",
  "mentor_availability", "session_bookings",
  "meetings", "meeting_attendees", "meeting_recordings", "meeting_transcripts",
  "campan_tasks", "extracted_task_drafts",
  "certificates",
  "community_posts", "community_comments", "community_likes", "community_messages",
  "crm_leads", "crm_prospections", "crm_interactions",
  "crm_pipeline_stages", "crm_stage_automations",
  "mentee_deals",
  "cs_journeys", "cs_journey_stages", "mentee_journey_assignments",
  "email_templates", "email_automations", "email_flows",
  "email_flow_triggers", "email_flow_executions",
  "form_questions", "form_submissions", "tenant_forms",
  "invites", "mentorado_invites",
  "mentor_mentee_assignments", "mentor_library",
  "mentorado_files",
  "metrics", "metrics_snapshots", "mentee_payments", "program_investments",
  "playbooks", "playbook_access_rules", "playbook_folders", "playbook_pages",
  "tenant_popups", "popup_dismissals",
  "sos_requests", "sos_responses",
  "roleplay_simulations", "training_analyses",
  "smart_alerts",
  "tenant_automations", "tenant_branding",
  "tenant_whatsapp_config",
  "trails", "trail_modules", "trail_lessons", "trail_progress",
  "whatsapp_automation_flows", "whatsapp_campaigns",
  "whatsapp_auto_reply_config",
];

// ====== ROLE-BASED ACCESS ======
const ALL_STAFF_ROLES = ["admin", "ops", "mentor", "master_admin"];
const RESTRICTED_TOOLS: Record<string, string[]> = {
  master_admin: ["update_branding", "list_domains", "update_tenant_name"],
};

// ====== AGENT DEFINITIONS ======
const AGENTS: Record<string, { name: string; emoji: string; description: string; tools: string[]; prompt: string; allowedRoles: string[] }> = {
  crm: {
    name: "CRM Agent",
    emoji: "💼",
    description: "Leads, pipeline, prospecções, qualificação, interações comerciais e automações de etapa",
    tools: ["create_lead", "update_lead_stage", "delete_lead", "create_prospection", "add_crm_interaction", "create_pipeline_stage", "create_stage_automation", "bulk_update_lead_stage"],
    prompt: "Você está operando como o **CRM Agent** 💼 — especialista em gestão comercial, pipeline e prospecções. Analise dados de CRM com profundidade estratégica e sugira ações que maximizem conversões.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  trails: {
    name: "Trails Agent",
    emoji: "🎓",
    description: "Criar/editar trilhas, módulos, aulas, progresso de mentorados em trilhas, certificados",
    tools: ["create_trail", "create_trail_module", "create_lesson", "toggle_trail_publish", "generate_trail_ai", "mark_lesson_complete", "search_trail_content"],
    prompt: "Você está operando como o **Trails Agent** 🎓 — especialista em trilhas de aprendizado e conteúdo educacional. Crie trilhas estruturadas com módulos e aulas de alta qualidade pedagógica.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  playbooks: {
    name: "Playbooks Agent",
    emoji: "📖",
    description: "Criar/editar playbooks, páginas, visibilidade, geração IA de conteúdo de playbooks",
    tools: ["create_playbook", "update_playbook", "generate_playbook_ai", "search_playbook_content"],
    prompt: "Você está operando como o **Playbooks Agent** 📖 — especialista em criação de playbooks e materiais de referência. Gere conteúdo estratégico e bem estruturado para mentorados.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  calendar: {
    name: "Calendar Agent",
    emoji: "📅",
    description: "Eventos, disponibilidade de agenda, agendamentos e lembretes",
    tools: ["create_calendar_event", "update_calendar_event", "delete_calendar_event", "set_availability"],
    prompt: "Você está operando como o **Calendar Agent** 📅 — especialista em gestão de agenda e eventos. Organize eventos, horários e disponibilidade de forma eficiente.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  email: {
    name: "Email Agent",
    emoji: "✉️",
    description: "Templates de email, campanhas, fluxos de email marketing, envio individual e em massa",
    tools: ["create_email_template", "create_email_campaign", "bulk_send_email", "send_individual_email", "toggle_email_flow"],
    prompt: "Você está operando como o **Email Agent** ✉️ — especialista em email marketing e comunicação por email. Crie templates, campanhas e fluxos que engajem e convertam.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  whatsapp: {
    name: "WhatsApp Agent",
    emoji: "📱",
    description: "Mensagens WhatsApp, campanhas, auto-reply, fluxos de automação, resumos diários",
    tools: ["send_whatsapp_message", "send_whatsapp_to_all", "toggle_wa_flow"],
    prompt: "Você está operando como o **WhatsApp Agent** 📱 — especialista em comunicação via WhatsApp. Envie mensagens, gerencie fluxos de automação e campanhas de WhatsApp.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  cs: {
    name: "CS Agent",
    emoji: "🎯",
    description: "Gestão de mentorados, convites, atribuições mentor→mentee, jornada CS, SOS, tarefas do kanban",
    tools: [
      "invite_mentorado", "update_mentorado", "suspend_mentorado", "assign_mentor",
      "create_task", "bulk_create_tasks", "update_task_status", "delete_task",
      "send_sos_to_mentee", "get_mentee_details", "get_mentee_journey_position",
      "create_journey", "create_journey_stage",
      "list_pending_invites", "revoke_invite", "bulk_invite_mentorados",
    ],
    prompt: "Você está operando como o **CS Agent** 🎯 — especialista em Customer Success e gestão de mentorados. Garanta engajamento máximo, acompanhamento proativo e gestão eficaz de jornada.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  forms: {
    name: "Forms Agent",
    emoji: "📋",
    description: "Criar formulários, perguntas, onboarding, submissões, perguntas comportamentais",
    tools: ["create_form", "add_form_question", "toggle_form", "get_form_submissions", "create_behavioral_question"],
    prompt: "Você está operando como o **Forms Agent** 📋 — especialista em formulários e coleta de dados. Crie formulários estruturados para onboarding, feedback e pesquisas.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  popups: {
    name: "Popups Agent",
    emoji: "🪧",
    description: "Criar e gerenciar popups do tenant (anúncios, promoções, boas-vindas)",
    tools: ["create_popup", "toggle_popup"],
    prompt: "Você está operando como o **Popups Agent** 🪧 — especialista em popups e notificações visuais. Crie popups impactantes para comunicação com mentorados.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  gamification: {
    name: "Gamification Agent",
    emoji: "🏆",
    description: "Badges, recompensas, ranking, streaks, pontos, atividades customizadas",
    tools: ["award_badge", "create_badge", "create_reward", "log_custom_activity"],
    prompt: "Você está operando como o **Gamification Agent** 🏆 — especialista em gamificação e engajamento. Crie sistemas de recompensa que motivem e retenham mentorados.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  analytics: {
    name: "Analytics Agent",
    emoji: "📊",
    description: "Relatórios, métricas, auditoria do sistema, scores, performance, diagnósticos, alertas",
    tools: ["get_tenant_analytics", "full_system_audit", "generate_mentor_report", "resolve_alert"],
    prompt: "Você está operando como o **Analytics Agent** 📊 — especialista em inteligência de dados e análise de performance. Identifique padrões, riscos e oportunidades com recomendações data-driven.",
    allowedRoles: ["admin", "ops", "master_admin"],
  },
  automation: {
    name: "Automation Agent",
    emoji: "⚡",
    description: "Ativar/desativar automações do sistema, configurar schedules, executar manualmente, configurações do tenant",
    tools: ["toggle_automation", "run_automation_now", "update_tenant_settings"],
    prompt: "Você está operando como o **Automation Agent** ⚡ — especialista em automações e configurações do sistema. Gerencie automações para otimizar processos repetitivos.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  meetings: {
    name: "Meetings Agent",
    emoji: "🎥",
    description: "Reuniões, transcrições, gravações, extração de tarefas de reuniões, histórico de calls",
    tools: ["list_meetings", "get_meeting_transcript", "extract_tasks_from_meeting", "analyze_call_transcript"],
    prompt: "Você está operando como o **Meetings Agent** 🎥 — especialista em reuniões e transcrições. Gerencie gravações, extraia tarefas e analise histórico de calls.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  files: {
    name: "Files Agent",
    emoji: "📁",
    description: "Biblioteca do mentor, arquivos dos mentorados, uploads, organização de documentos",
    tools: ["list_mentor_library", "list_mentee_files", "delete_mentee_file"],
    prompt: "Você está operando como o **Files Agent** 📁 — especialista em gestão de arquivos e documentos. Organize a biblioteca do mentor e arquivos dos mentorados.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  branding: {
    name: "Branding Agent",
    emoji: "🎨",
    description: "Cores, logo, nome da empresa, domínios customizados, identidade visual do tenant",
    tools: ["update_branding", "list_domains", "update_tenant_name"],
    prompt: "Você está operando como o **Branding Agent** 🎨 — especialista em identidade visual e branding. Gerencie cores, logos, domínios e a marca do programa.",
    allowedRoles: ["master_admin"],
  },
  community: {
    name: "Community Agent",
    emoji: "💬",
    description: "Posts da comunidade, comentários, likes, chat em tempo real entre mentorados",
    tools: ["create_community_post", "pin_community_post", "delete_community_post", "get_community_stats"],
    prompt: "Você está operando como o **Community Agent** 💬 — especialista em comunidade e engajamento social. Gerencie posts, interações e o chat da comunidade.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  onboarding: {
    name: "Onboarding Agent",
    emoji: "🚀",
    description: "Configurar fluxo de onboarding, perguntas iniciais, welcome message, primeiro acesso",
    tools: ["generate_onboarding_form", "configure_welcome_message", "get_onboarding_stats"],
    prompt: "Você está operando como o **Onboarding Agent** 🚀 — especialista em onboarding e primeiro acesso. Configure fluxos de boas-vindas e integração de novos mentorados.",
    allowedRoles: ALL_STAFF_ROLES,
  },
  ai_tools: {
    name: "AI Tools Agent",
    emoji: "🧠",
    description: "Arsenal de vendas IA: bio generator, content creator, objection simulator, lead qualifier, análise de calls/pipeline, histórico de ferramentas IA",
    tools: ["generate_bio_ai", "generate_content_ai", "simulate_objection_ai", "qualify_lead_ai", "get_ai_tool_history"],
    prompt: "Você está operando como o **AI Tools Agent** 🧠 — especialista no arsenal de ferramentas de IA para vendas. Gere bios, conteúdo, simule objeções, qualifique leads e analise calls.",
    allowedRoles: ALL_STAFF_ROLES,
  },
};

const SHARED_TOOLS = ["query_database", "insert_record", "update_record", "delete_record", "count_records", "navigate_to_page", "call_edge_function"];

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
    
    // Allow owner OR staff of same tenant (for impersonation scenarios)
    if (membership.user_id !== callerId) {
      // Check if caller is staff in same tenant OR master_admin in any tenant
      const { data: callerMemberships } = await supabase
        .from("memberships")
        .select("id, role, tenant_id")
        .eq("user_id", callerId)
        .in("role", ["admin", "ops", "mentor", "master_admin"])
        .eq("status", "active");
      
      const isAllowed = callerMemberships?.some(m => 
        m.role === "master_admin" || m.tenant_id === membership.tenant_id
      );
      
      if (!isAllowed) {
        console.error("Access denied - callerId:", callerId, "membership.user_id:", membership.user_id);
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!["admin", "ops", "mentor", "master_admin"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Only staff can use EloAi" }), {
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
      { data: emailTemplates },
      { data: invitesPending },
      { data: assignments },
      { data: branding },
      { data: journeys },
      { data: stageAutomations },
      { data: waFlows },
      { data: rewards },
      { data: smartAlerts },
      { data: scheduling },
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
      supabase.from("email_templates").select("id, name, subject").eq("tenant_id", tenantId).limit(30),
      supabase.from("invites").select("id, email, role, status, created_at").eq("tenant_id", tenantId).eq("status", "pending").limit(20),
      supabase.from("mentor_mentee_assignments").select("mentor_membership_id, mentee_membership_id, status").eq("tenant_id", tenantId),
      supabase.from("tenant_branding").select("primary_color, logo_url, company_name").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("cs_journeys").select("id, name, total_days, is_default").eq("tenant_id", tenantId),
      supabase.from("crm_stage_automations").select("id, from_stage_key, to_stage_key, delay_days, is_active").eq("tenant_id", tenantId),
      supabase.from("whatsapp_automation_flows").select("id, name, trigger_type, is_active").eq("tenant_id", tenantId),
      supabase.from("reward_catalog").select("id, name, points_cost, is_active").eq("tenant_id", tenantId),
      supabase.from("smart_alerts").select("id, alert_type, severity, message, is_resolved, created_at").eq("tenant_id", tenantId).eq("is_resolved", false).limit(20),
      supabase.from("scheduling_availability").select("id, day_of_week, start_time, end_time").eq("membership_id", membership_id),
    ]);

    const menteeIds = mentorados?.map(m => m.id) || [];
    const menteeUserIds = mentorados?.map(m => m.user_id) || [];

    // Secondary parallel fetch
    const [menteeProfilesRes, businessProfilesRes, menteeTasksRes, menteeProspectionsRes, trailProgressRes, certificatesRes, behavioralRes, metricsRes, filesRes, meetingsRes] = await Promise.all([
      menteeUserIds.length > 0 ? supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", menteeUserIds) : { data: [] },
      menteeIds.length > 0 ? supabase.from("mentee_profiles").select("membership_id, business_name, business_profile").in("membership_id", menteeIds) : { data: [] },
      menteeIds.length > 0 ? supabase.from("campan_tasks").select("mentorado_membership_id, status_column, title, priority, due_date").eq("tenant_id", tenantId) : { data: [] },
      menteeIds.length > 0 ? supabase.from("crm_prospections").select("membership_id, status, temperature, contact_name, company").eq("tenant_id", tenantId) : { data: [] },
      menteeIds.length > 0 ? supabase.from("trail_progress").select("membership_id, completed").in("membership_id", menteeIds) : { data: [] },
      menteeIds.length > 0 ? supabase.from("certificates").select("membership_id, trail_id, issued_at").in("membership_id", menteeIds) : { data: [] },
      menteeIds.length > 0 ? supabase.from("behavioral_reports").select("membership_id, disc_profile, enneagram_type, communication_style").in("membership_id", menteeIds) : { data: [] },
      menteeIds.length > 0 ? supabase.from("metrics").select("membership_id, metric_key, metric_value, period").in("membership_id", menteeIds).order("created_at", { ascending: false }).limit(100) : { data: [] },
      supabase.from("mentorado_files").select("id, file_name, membership_id, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(30),
      supabase.from("meeting_transcripts").select("id, title, meeting_date, membership_id, status").eq("tenant_id", tenantId).order("meeting_date", { ascending: false }).limit(20),
    ]);

    const menteeProfiles = (menteeProfilesRes as any).data || [];
    const businessProfiles = (businessProfilesRes as any).data || [];
    const allTasks = (menteeTasksRes as any).data || [];
    const allProspections = (menteeProspectionsRes as any).data || [];
    const allTrailProgress = (trailProgressRes as any).data || [];
    const allCertificates = (certificatesRes as any).data || [];
    const allBehavioral = (behavioralRes as any).data || [];
    const allMetrics = (metricsRes as any).data || [];
    const allFiles = (filesRes as any).data || [];
    const allMeetings = (meetingsRes as any).data || [];

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
      const ct = allCertificates.filter((x: any) => x.membership_id === m.id);
      const bh = allBehavioral.find((x: any) => x.membership_id === m.id);
      const overdue = t.filter((x: any) => x.due_date && new Date(x.due_date) < new Date() && x.status_column !== "done").length;
      const daysSince = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000);
      let line = `- ${p?.full_name || "?"} | ${p?.email || ""} | Tel:${p?.phone || "—"} | Negócio:${b?.business_name || "—"} | Tarefas:${t.filter((x: any) => x.status_column === "done").length}/${t.length}${overdue ? ` ⚠${overdue}atrasadas` : ""} | Leads:${pr.length}(${pr.filter((x: any) => x.temperature === "hot").length}🔥) | Trilhas:${tp.filter((x: any) => x.completed).length}✅ | Certs:${ct.length} | Dias:${daysSince}`;
      if (bh) line += ` | DISC:${JSON.stringify(bh.disc_profile || {})} | Enea:${bh.enneagram_type || "—"} | Estilo:${bh.communication_style || "—"}`;
      line += ` | ID:${m.id}`;
      return line;
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
    if (stageAutomations?.length) ctx.push(`AUTOMAÇÕES PIPELINE: ${stageAutomations.map(a => `${a.from_stage_key}→${a.to_stage_key} ${a.delay_days}d ${a.is_active ? "✅" : "⏸"}`).join(" | ")}`);
    if (recentActivity?.length) ctx.push(`ATIVIDADE(últimas):\n${recentActivity.slice(0, 10).map(a => `- ${a.action_type}: ${a.action_description || ""}`).join("\n")}`);
    if (upcomingEvents?.length) ctx.push(`AGENDA:\n${upcomingEvents.map(e => `- ${e.title} ${e.event_date} ${e.event_time || ""} ${e.meeting_url ? "🔗" : ""} | ID:${e.id}`).join("\n")}`);
    if (emailFlows?.length) ctx.push(`FLUXOS EMAIL: ${emailFlows.map(f => `${f.name}(${f.is_active ? "✅" : "⏸"}) ID:${f.id}`).join(", ")}`);
    if (emailTemplates?.length) ctx.push(`TEMPLATES EMAIL(${emailTemplates.length}): ${emailTemplates.map(t => `"${t.name}" subj:"${t.subject}" ID:${t.id}`).join(" | ")}`);
    ctx.push(`WHATSAPP: ${waConfig?.instance_id ? "✅ Conectado" : "❌ Não configurado"}`);
    if (waFlows?.length) ctx.push(`FLUXOS WA: ${waFlows.map(f => `${f.name}(${f.trigger_type}) ${f.is_active ? "✅" : "⏸"} ID:${f.id}`).join(" | ")}`);
    if (trails?.length) ctx.push(`TRILHAS(${trails.length}): ${trails.map(t => `"${t.title}"${t.is_published ? "📢" : "📝"} ${t.module_count || 0}mod ID:${t.id}`).join(" | ")}`);
    if (playbooks?.length) ctx.push(`PLAYBOOKS(${playbooks.length}): ${playbooks.map(p => `${p.emoji || "📖"}"${p.title}"(${p.visibility}) ID:${p.id}`).join(" | ")}`);
    if (journeys?.length) ctx.push(`JORNADAS CS: ${journeys.map(j => `"${j.name}" ${j.total_days}d ${j.is_default ? "⭐" : ""} ID:${j.id}`).join(" | ")}`);
    if (journeyStages?.length) ctx.push(`ETAPAS JORNADA: ${journeyStages.map(s => `${s.name}(d${s.day_start}-${s.day_end})`).join(" → ")}`);
    if (forms?.length) ctx.push(`FORMS: ${forms.map(f => `${f.title}(${f.form_type},${f.is_active ? "✅" : "⏸"}) ID:${f.id}`).join(", ")}`);
    if (badges?.length) ctx.push(`BADGES: ${badges.map(b => `${b.name}(${b.points_required}pts) ID:${b.id}`).join(", ")}`);
    if (rewards?.length) ctx.push(`RECOMPENSAS: ${rewards.map(r => `${r.name}(${r.points_cost}pts,${r.is_active ? "✅" : "⏸"}) ID:${r.id}`).join(", ")}`);
    if (popups?.length) ctx.push(`POPUPS: ${popups.map(p => `${p.title}(${p.is_active ? "✅" : "⏸"}) ID:${p.id}`).join(", ")}`);
    if (invitesPending?.length) ctx.push(`CONVITES PENDENTES(${invitesPending.length}): ${invitesPending.map(i => `${i.email}(${i.role}) ID:${i.id}`).join(", ")}`);
    if (assignments?.length) ctx.push(`ATRIBUIÇÕES MENTOR→MENTEE: ${assignments.map(a => `${a.mentor_membership_id}→${a.mentee_membership_id}(${a.status})`).join(", ")}`);
    if (smartAlerts?.length) ctx.push(`⚠️ ALERTAS(${smartAlerts.length}): ${smartAlerts.map(a => `${a.severity} ${a.alert_type}: ${a.message}`).join(" | ")}`);
    if (allMeetings?.length) ctx.push(`REUNIÕES RECENTES(${allMeetings.length}): ${allMeetings.map(m => `"${m.title || "sem título"}" ${m.meeting_date} ${m.status} ID:${m.id}`).join(" | ")}`);
    if (allFiles?.length) ctx.push(`ARQUIVOS RECENTES(${allFiles.length}): ${allFiles.map(f => `"${f.file_name}" ID:${f.id}`).join(", ")}`);
    if (scheduling?.length) ctx.push(`DISPONIBILIDADE: ${scheduling.map(s => `${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][s.day_of_week]} ${s.start_time}-${s.end_time}`).join(", ")}`);
    if (branding) ctx.push(`BRANDING: cor:${branding.primary_color || "—"} empresa:${branding.company_name || "—"}`);

    // Metrics summary
    if (allMetrics?.length) {
      const metricKeys = [...new Set(allMetrics.map((m: any) => m.metric_key))];
      ctx.push(`MÉTRICAS RASTREADAS: ${metricKeys.join(", ")}`);
    }

    ctx.push(`\nTABELAS DISPONÍVEIS PARA CONSULTA: ${READABLE_TABLES.join(", ")}`);

    const fullContext = ctx.join("\n\n");

    // ====== TOOLS ======
    const tools = [
      // === GENERIC DATABASE ACCESS ===
      { type: "function", function: { name: "query_database", description: "Consulta qualquer tabela do banco de dados. Use para buscar dados que não estão no contexto. Filtre por tenant_id quando a tabela tiver essa coluna.", parameters: { type: "object", properties: { table: { type: "string", description: "Nome da tabela" }, select: { type: "string", description: "Colunas a retornar (SQL select). Ex: 'id, name, created_at' ou '*'" }, filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"] }, value: { type: "string" } }, required: ["column", "operator", "value"] }, description: "Filtros a aplicar" }, order_by: { type: "string", description: "Coluna para ordenar" }, order_asc: { type: "boolean", description: "Ascendente? Default false" }, limit: { type: "number", description: "Limite de registros. Default 50" } }, required: ["table", "select"], additionalProperties: false } } },
      { type: "function", function: { name: "insert_record", description: "Insere registro em qualquer tabela editável", parameters: { type: "object", properties: { table: { type: "string", description: "Nome da tabela" }, data: { type: "object", description: "Dados do registro (JSON)" } }, required: ["table", "data"], additionalProperties: false } } },
      { type: "function", function: { name: "update_record", description: "Atualiza registro(s) em qualquer tabela editável", parameters: { type: "object", properties: { table: { type: "string", description: "Nome da tabela" }, data: { type: "object", description: "Campos a atualizar" }, filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, operator: { type: "string", enum: ["eq", "neq", "in"] }, value: { type: "string" } }, required: ["column", "operator", "value"] } } }, required: ["table", "data", "filters"], additionalProperties: false } } },
      { type: "function", function: { name: "delete_record", description: "Remove registro(s) de qualquer tabela editável", parameters: { type: "object", properties: { table: { type: "string", description: "Nome da tabela" }, filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, operator: { type: "string", enum: ["eq", "in"] }, value: { type: "string" } }, required: ["column", "operator", "value"] } } }, required: ["table", "filters"], additionalProperties: false } } },
      { type: "function", function: { name: "count_records", description: "Conta registros numa tabela", parameters: { type: "object", properties: { table: { type: "string" }, filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"] }, value: { type: "string" } }, required: ["column", "operator", "value"] } } }, required: ["table"], additionalProperties: false } } },
      // AUTOMATIONS
      { type: "function", function: { name: "toggle_automation", description: "Ativa/desativa automação", parameters: { type: "object", properties: { automation_key: { type: "string" }, enabled: { type: "boolean" } }, required: ["automation_key", "enabled"], additionalProperties: false } } },
      { type: "function", function: { name: "run_automation_now", description: "Executa automação agora", parameters: { type: "object", properties: { automation_key: { type: "string" } }, required: ["automation_key"], additionalProperties: false } } },
      // NAVIGATION
      { type: "function", function: { name: "navigate_to_page", description: "Navega para página", parameters: { type: "object", properties: { page: { type: "string", enum: ["dashboard","mentorados","jornada-cs","crm","formularios","trilhas","playbooks","calendario","emails","whatsapp","popups","sos","automacoes","relatorios","perfil","propriedade-intelectual","onboarding-builder","dev-tools","ferramentas-ia","metricas","meus-arquivos","minhas-tarefas","meu-crm"] } }, required: ["page"], additionalProperties: false } } },
      // MENTORADO
      { type: "function", function: { name: "invite_mentorado", description: "Convida mentorado por email", parameters: { type: "object", properties: { email: { type: "string" }, full_name: { type: "string" }, phone: { type: "string" } }, required: ["email", "full_name"], additionalProperties: false } } },
      { type: "function", function: { name: "update_mentorado", description: "Atualiza dados de mentorado", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, full_name: { type: "string" }, phone: { type: "string" }, business_name: { type: "string" }, business_profile: { type: "string" } }, required: ["mentee_membership_id"], additionalProperties: false } } },
      { type: "function", function: { name: "suspend_mentorado", description: "Suspende/reativa mentorado", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, action: { type: "string", enum: ["suspend", "reactivate"] } }, required: ["mentee_membership_id", "action"], additionalProperties: false } } },
      { type: "function", function: { name: "get_mentee_details", description: "Detalhes completos de mentorado incluindo comportamental, métricas, arquivos e reuniões", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" } }, required: ["mentee_membership_id"], additionalProperties: false } } },
      { type: "function", function: { name: "assign_mentor", description: "Atribui mentor a mentorado", parameters: { type: "object", properties: { mentor_membership_id: { type: "string" }, mentee_membership_id: { type: "string" } }, required: ["mentor_membership_id", "mentee_membership_id"], additionalProperties: false } } },
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
      { type: "function", function: { name: "add_crm_interaction", description: "Registra interação no CRM", parameters: { type: "object", properties: { lead_id: { type: "string" }, prospection_id: { type: "string" }, type: { type: "string", enum: ["call", "email", "whatsapp", "meeting", "note"] }, description: { type: "string" }, outcome: { type: "string" } }, required: ["type", "description"], additionalProperties: false } } },
      // TRAILS & LESSONS
      { type: "function", function: { name: "toggle_trail_publish", description: "Publica/despublica trilha", parameters: { type: "object", properties: { trail_id: { type: "string" }, publish: { type: "boolean" } }, required: ["trail_id", "publish"], additionalProperties: false } } },
      { type: "function", function: { name: "generate_trail_ai", description: "Gera trilha com IA", parameters: { type: "object", properties: { topic: { type: "string" }, num_modules: { type: "number" } }, required: ["topic"], additionalProperties: false } } },
      { type: "function", function: { name: "create_trail", description: "Cria trilha manualmente", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title"], additionalProperties: false } } },
      { type: "function", function: { name: "create_trail_module", description: "Cria módulo numa trilha", parameters: { type: "object", properties: { trail_id: { type: "string" }, title: { type: "string" }, position: { type: "number" } }, required: ["trail_id", "title"], additionalProperties: false } } },
      { type: "function", function: { name: "create_lesson", description: "Cria aula num módulo", parameters: { type: "object", properties: { module_id: { type: "string" }, title: { type: "string" }, content: { type: "string" }, video_url: { type: "string" }, position: { type: "number" } }, required: ["module_id", "title"], additionalProperties: false } } },
      { type: "function", function: { name: "mark_lesson_complete", description: "Marca aula como concluída para mentorado", parameters: { type: "object", properties: { membership_id: { type: "string" }, lesson_id: { type: "string" } }, required: ["membership_id", "lesson_id"], additionalProperties: false } } },
      // PLAYBOOKS
      { type: "function", function: { name: "create_playbook", description: "Cria playbook", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, emoji: { type: "string" }, visibility: { type: "string", enum: ["all_mentees", "specific_mentees", "staff_only", "public"] }, content: { type: "string" } }, required: ["title"], additionalProperties: false } } },
      { type: "function", function: { name: "update_playbook", description: "Atualiza playbook", parameters: { type: "object", properties: { playbook_id: { type: "string" }, title: { type: "string" }, content: { type: "string" }, visibility: { type: "string" } }, required: ["playbook_id"], additionalProperties: false } } },
      { type: "function", function: { name: "generate_playbook_ai", description: "Gera conteúdo de playbook com IA", parameters: { type: "object", properties: { title: { type: "string" }, topic: { type: "string" }, style: { type: "string", enum: ["tutorial", "framework", "checklist", "case_study"] } }, required: ["title", "topic"], additionalProperties: false } } },
      // SEARCH
      { type: "function", function: { name: "search_playbook_content", description: "Busca em playbooks", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } } },
      { type: "function", function: { name: "search_trail_content", description: "Busca em trilhas e aulas", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } } },
      // ANALYTICS
      { type: "function", function: { name: "get_tenant_analytics", description: "Métricas completas do programa", parameters: { type: "object", properties: {}, required: [], additionalProperties: false } } },
      { type: "function", function: { name: "full_system_audit", description: "Auditoria completa do sistema: analisa TODOS os dados (mentorados, CRM, trilhas, playbooks, automações, métricas, engajamento, emails, WhatsApp, jornada CS, tarefas, gamificação, SOS, formulários, reuniões, arquivos) e gera um relatório executivo detalhado com scores, pontos fortes, pontos fracos, riscos e recomendações acionáveis", parameters: { type: "object", properties: {}, required: [], additionalProperties: false } } },
      // BADGES & REWARDS
      { type: "function", function: { name: "award_badge", description: "Concede badge", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, badge_id: { type: "string" } }, required: ["mentee_membership_id", "badge_id"], additionalProperties: false } } },
      { type: "function", function: { name: "create_badge", description: "Cria badge", parameters: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, points_required: { type: "number" }, criteria: { type: "string" } }, required: ["name"], additionalProperties: false } } },
      { type: "function", function: { name: "create_reward", description: "Cria recompensa no catálogo", parameters: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, points_cost: { type: "number" }, is_active: { type: "boolean" } }, required: ["name", "points_cost"], additionalProperties: false } } },
      // FORMS
      { type: "function", function: { name: "get_form_submissions", description: "Respostas de formulário", parameters: { type: "object", properties: { form_id: { type: "string" }, limit: { type: "number" } }, required: ["form_id"], additionalProperties: false } } },
      { type: "function", function: { name: "create_form", description: "Cria formulário", parameters: { type: "object", properties: { title: { type: "string" }, form_type: { type: "string", enum: ["onboarding", "feedback", "survey", "application", "custom"] }, is_active: { type: "boolean" } }, required: ["title"], additionalProperties: false } } },
      { type: "function", function: { name: "add_form_question", description: "Adiciona pergunta a formulário", parameters: { type: "object", properties: { form_id: { type: "string" }, question_text: { type: "string" }, question_type: { type: "string", enum: ["text", "textarea", "select", "multiselect", "rating", "yes_no"] }, options: { type: "array", items: { type: "string" } }, is_required: { type: "boolean" }, order_index: { type: "number" } }, required: ["form_id", "question_text"], additionalProperties: false } } },
      { type: "function", function: { name: "toggle_form", description: "Ativa/desativa formulário", parameters: { type: "object", properties: { form_id: { type: "string" }, is_active: { type: "boolean" } }, required: ["form_id", "is_active"], additionalProperties: false } } },
      // POPUPS & FLOWS
      { type: "function", function: { name: "toggle_popup", description: "Ativa/desativa popup", parameters: { type: "object", properties: { popup_id: { type: "string" }, is_active: { type: "boolean" } }, required: ["popup_id", "is_active"], additionalProperties: false } } },
      { type: "function", function: { name: "create_popup", description: "Cria popup", parameters: { type: "object", properties: { title: { type: "string" }, popup_type: { type: "string", enum: ["announcement", "promotion", "survey", "welcome"] }, content: { type: "string" }, is_active: { type: "boolean" } }, required: ["title"], additionalProperties: false } } },
      { type: "function", function: { name: "toggle_email_flow", description: "Ativa/desativa fluxo email", parameters: { type: "object", properties: { flow_id: { type: "string" }, is_active: { type: "boolean" } }, required: ["flow_id", "is_active"], additionalProperties: false } } },
      // EMAIL TEMPLATES
      { type: "function", function: { name: "create_email_template", description: "Cria template de email", parameters: { type: "object", properties: { name: { type: "string" }, subject: { type: "string" }, body_html: { type: "string" } }, required: ["name", "subject", "body_html"], additionalProperties: false } } },
      // INVITES MANAGEMENT
      { type: "function", function: { name: "list_pending_invites", description: "Lista convites pendentes", parameters: { type: "object", properties: {}, required: [], additionalProperties: false } } },
      { type: "function", function: { name: "revoke_invite", description: "Revoga convite", parameters: { type: "object", properties: { invite_id: { type: "string" } }, required: ["invite_id"], additionalProperties: false } } },
      { type: "function", function: { name: "bulk_invite_mentorados", description: "Convida vários mentorados de uma vez", parameters: { type: "object", properties: { invites: { type: "array", items: { type: "object", properties: { email: { type: "string" }, full_name: { type: "string" }, phone: { type: "string" } }, required: ["email", "full_name"] } } }, required: ["invites"], additionalProperties: false } } },
      // JOURNEY CS
      { type: "function", function: { name: "get_mentee_journey_position", description: "Posição do mentorado na jornada CS", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" } }, required: ["mentee_membership_id"], additionalProperties: false } } },
      { type: "function", function: { name: "create_journey", description: "Cria jornada CS", parameters: { type: "object", properties: { name: { type: "string" }, total_days: { type: "number" }, is_default: { type: "boolean" } }, required: ["name", "total_days"], additionalProperties: false } } },
      { type: "function", function: { name: "create_journey_stage", description: "Cria etapa na jornada", parameters: { type: "object", properties: { journey_id: { type: "string" }, name: { type: "string" }, stage_key: { type: "string" }, day_start: { type: "number" }, day_end: { type: "number" }, color: { type: "string" }, position: { type: "number" } }, required: ["journey_id", "name", "stage_key", "day_start", "day_end"], additionalProperties: false } } },
      // TENANT SETTINGS
      { type: "function", function: { name: "update_tenant_settings", description: "Atualiza configurações do programa", parameters: { type: "object", properties: { setting_key: { type: "string" }, setting_value: { type: "string" } }, required: ["setting_key", "setting_value"], additionalProperties: false } } },
      // MENTOR REPORT
      { type: "function", function: { name: "generate_mentor_report", description: "Gera relatório completo do mentor", parameters: { type: "object", properties: { period: { type: "string", enum: ["week", "month", "quarter"] } }, required: [], additionalProperties: false } } },
      // PIPELINE MANAGEMENT
      { type: "function", function: { name: "create_pipeline_stage", description: "Cria etapa no pipeline CRM", parameters: { type: "object", properties: { name: { type: "string" }, status_key: { type: "string" }, color: { type: "string" }, position: { type: "number" } }, required: ["name", "status_key"], additionalProperties: false } } },
      { type: "function", function: { name: "create_stage_automation", description: "Cria automação de etapa CRM", parameters: { type: "object", properties: { from_stage_key: { type: "string" }, to_stage_key: { type: "string" }, delay_days: { type: "number" }, is_active: { type: "boolean" } }, required: ["from_stage_key", "to_stage_key", "delay_days"], additionalProperties: false } } },
      // BULK OPERATIONS
      { type: "function", function: { name: "bulk_send_email", description: "Envia email para vários mentorados", parameters: { type: "object", properties: { mentee_membership_ids: { type: "array", items: { type: "string" } }, subject: { type: "string" }, body_html: { type: "string" } }, required: ["mentee_membership_ids", "subject", "body_html"], additionalProperties: false } } },
      { type: "function", function: { name: "bulk_update_lead_stage", description: "Move vários leads de etapa", parameters: { type: "object", properties: { lead_ids: { type: "array", items: { type: "string" } }, stage: { type: "string" } }, required: ["lead_ids", "stage"], additionalProperties: false } } },
      // ACTIVITY LOG
      { type: "function", function: { name: "log_custom_activity", description: "Registra atividade personalizada", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, action_type: { type: "string" }, description: { type: "string" }, points: { type: "number" } }, required: ["mentee_membership_id", "action_type", "description"], additionalProperties: false } } },
      // ALERTS
      { type: "function", function: { name: "resolve_alert", description: "Resolve um alerta", parameters: { type: "object", properties: { alert_id: { type: "string" } }, required: ["alert_id"], additionalProperties: false } } },
      // BEHAVIORAL
      { type: "function", function: { name: "create_behavioral_question", description: "Cria pergunta comportamental", parameters: { type: "object", properties: { question_text: { type: "string" }, question_type: { type: "string", enum: ["disc", "enneagram", "custom"] }, options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } }, order_index: { type: "number" }, is_required: { type: "boolean" } }, required: ["question_text", "options"], additionalProperties: false } } },
      // WHATSAPP FLOWS
      { type: "function", function: { name: "toggle_wa_flow", description: "Ativa/desativa fluxo WhatsApp", parameters: { type: "object", properties: { flow_id: { type: "string" }, is_active: { type: "boolean" } }, required: ["flow_id", "is_active"], additionalProperties: false } } },
      // SCHEDULING
      { type: "function", function: { name: "set_availability", description: "Define disponibilidade de agenda", parameters: { type: "object", properties: { day_of_week: { type: "number", description: "0=Dom, 1=Seg...6=Sáb" }, start_time: { type: "string" }, end_time: { type: "string" } }, required: ["day_of_week", "start_time", "end_time"], additionalProperties: false } } },
      // CALL EDGE FUNCTIONS
      { type: "function", function: { name: "call_edge_function", description: "Chama qualquer edge function do sistema", parameters: { type: "object", properties: { function_name: { type: "string", description: "Nome da função (ex: generate-trail, check-alerts)" }, payload: { type: "object", description: "Body JSON da requisição" } }, required: ["function_name", "payload"], additionalProperties: false } } },
      // MEETINGS
      { type: "function", function: { name: "list_meetings", description: "Lista reuniões/transcrições recentes", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, limit: { type: "number" } }, required: [], additionalProperties: false } } },
      { type: "function", function: { name: "get_meeting_transcript", description: "Busca transcrição completa de uma reunião", parameters: { type: "object", properties: { transcript_id: { type: "string" } }, required: ["transcript_id"], additionalProperties: false } } },
      { type: "function", function: { name: "extract_tasks_from_meeting", description: "Extrai tarefas de uma transcrição via IA", parameters: { type: "object", properties: { transcript_id: { type: "string" }, mentee_membership_id: { type: "string" } }, required: ["transcript_id", "mentee_membership_id"], additionalProperties: false } } },
      { type: "function", function: { name: "analyze_call_transcript", description: "Analisa transcrição de call com IA (score, pontos fortes/fracos)", parameters: { type: "object", properties: { transcript_id: { type: "string" } }, required: ["transcript_id"], additionalProperties: false } } },
      // FILES
      { type: "function", function: { name: "list_mentor_library", description: "Lista arquivos da biblioteca do mentor", parameters: { type: "object", properties: { limit: { type: "number" } }, required: [], additionalProperties: false } } },
      { type: "function", function: { name: "list_mentee_files", description: "Lista arquivos de um mentorado", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" } }, required: ["mentee_membership_id"], additionalProperties: false } } },
      { type: "function", function: { name: "delete_mentee_file", description: "Remove arquivo de mentorado", parameters: { type: "object", properties: { file_id: { type: "string" } }, required: ["file_id"], additionalProperties: false } } },
      // BRANDING
      { type: "function", function: { name: "update_branding", description: "Atualiza branding do tenant (cores, nome da empresa)", parameters: { type: "object", properties: { primary_color: { type: "string" }, company_name: { type: "string" }, welcome_message: { type: "string" } }, required: [], additionalProperties: false } } },
      { type: "function", function: { name: "list_domains", description: "Lista domínios customizados do tenant", parameters: { type: "object", properties: {}, required: [], additionalProperties: false } } },
      { type: "function", function: { name: "update_tenant_name", description: "Atualiza nome do programa/tenant", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } } },
      // COMMUNITY
      { type: "function", function: { name: "create_community_post", description: "Cria post na comunidade", parameters: { type: "object", properties: { content: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["content"], additionalProperties: false } } },
      { type: "function", function: { name: "pin_community_post", description: "Fixa/desfixa post na comunidade", parameters: { type: "object", properties: { post_id: { type: "string" }, pinned: { type: "boolean" } }, required: ["post_id", "pinned"], additionalProperties: false } } },
      { type: "function", function: { name: "delete_community_post", description: "Remove post da comunidade", parameters: { type: "object", properties: { post_id: { type: "string" } }, required: ["post_id"], additionalProperties: false } } },
      { type: "function", function: { name: "get_community_stats", description: "Estatísticas da comunidade (posts, autores, engajamento)", parameters: { type: "object", properties: {}, required: [], additionalProperties: false } } },
      // ONBOARDING
      { type: "function", function: { name: "generate_onboarding_form", description: "Gera formulário de onboarding via IA", parameters: { type: "object", properties: { context: { type: "string", description: "Descrição do programa e público-alvo" } }, required: ["context"], additionalProperties: false } } },
      { type: "function", function: { name: "configure_welcome_message", description: "Configura mensagem de boas-vindas para novos mentorados", parameters: { type: "object", properties: { message: { type: "string" }, is_active: { type: "boolean" } }, required: ["message"], additionalProperties: false } } },
      { type: "function", function: { name: "get_onboarding_stats", description: "Estatísticas de onboarding (convites, taxa de conversão, tempo médio)", parameters: { type: "object", properties: {}, required: [], additionalProperties: false } } },
      // AI TOOLS
      { type: "function", function: { name: "generate_bio_ai", description: "Gera bio profissional para mentorado via IA", parameters: { type: "object", properties: { mentee_membership_id: { type: "string" }, context: { type: "string" } }, required: ["mentee_membership_id"], additionalProperties: false } } },
      { type: "function", function: { name: "generate_content_ai", description: "Gera conteúdo de vendas/marketing via IA", parameters: { type: "object", properties: { content_type: { type: "string", enum: ["post", "email", "script", "pitch"] }, topic: { type: "string" }, audience: { type: "string" } }, required: ["content_type", "topic"], additionalProperties: false } } },
      { type: "function", function: { name: "simulate_objection_ai", description: "Simula objeções de vendas para treino", parameters: { type: "object", properties: { product_context: { type: "string" }, objection_type: { type: "string" } }, required: ["product_context"], additionalProperties: false } } },
      { type: "function", function: { name: "qualify_lead_ai", description: "Qualifica lead com IA (score + recomendações)", parameters: { type: "object", properties: { lead_id: { type: "string" } }, required: ["lead_id"], additionalProperties: false } } },
      { type: "function", function: { name: "get_ai_tool_history", description: "Histórico de uso das ferramentas de IA", parameters: { type: "object", properties: { tool_type: { type: "string" }, limit: { type: "number" } }, required: [], additionalProperties: false } } },
    ];

    // ====== AGENT ROUTING — Classify which agent should handle ======
    const callerRole = membership.role;

    // Filter agents by caller role
    const accessibleAgents = Object.entries(AGENTS).filter(([_, a]) => a.allowedRoles.includes(callerRole));
    const agentDescriptions = accessibleAgents.map(([k, a]) => `- ${k}: ${a.description}`).join("\n");
    const routingPrompt = `Classifique a intenção do usuário para delegar ao agente correto. Contexto: programa "${tenantData?.name}" com ${mentorados?.length || 0} mentorados.

Agentes:
${agentDescriptions}
- elo: Conversa geral, cumprimentos, perguntas sobre o sistema, ou tarefas que envolvem múltiplos domínios simultaneamente`;

    const routingMessages = [
      { role: "system", content: routingPrompt },
      ...(history || []).slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const agentKeys = [...accessibleAgents.map(([k]) => k), "elo"];
    const routingTools = [{
      type: "function",
      function: {
        name: "route",
        description: "Roteia para o agente especializado",
        parameters: {
          type: "object",
          properties: {
            agent: { type: "string", enum: agentKeys },
          },
          required: ["agent"],
          additionalProperties: false,
        },
      },
    }];

    let selectedAgent = "elo";
    try {
      const routingResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: routingMessages,
          tools: routingTools,
          tool_choice: { type: "function", function: { name: "route" } },
          stream: false,
        }),
      });
      if (routingResp.ok) {
        const routingResult = await routingResp.json();
        const routeCall = routingResult.choices?.[0]?.message?.tool_calls?.[0];
        if (routeCall) {
          const routeArgs = typeof routeCall.function.arguments === "string" ? JSON.parse(routeCall.function.arguments) : routeCall.function.arguments;
          if (routeArgs.agent && routeArgs.agent !== "elo") {
            const agentDef = AGENTS[routeArgs.agent];
            if (agentDef && agentDef.allowedRoles.includes(callerRole)) {
              selectedAgent = routeArgs.agent;
            } else {
              console.warn(`Agent "${routeArgs.agent}" blocked for role "${callerRole}" — falling back to elo`);
            }
          } else if (routeArgs.agent === "elo") {
            selectedAgent = "elo";
          }
        }
      }
    } catch (e) {
      console.warn("Routing fallback to elo:", e);
    }

    // Build list of tools BLOCKED for this role (from restricted agents)
    const blockedTools = new Set<string>();
    for (const [_, agent] of Object.entries(AGENTS)) {
      if (!agent.allowedRoles.includes(callerRole)) {
        agent.tools.forEach(t => blockedTools.add(t));
      }
    }

    // Filter tools based on selected agent AND role restrictions
    const agentConfig = AGENTS[selectedAgent];
    const allowedToolNames = selectedAgent === "elo"
      ? tools.map((t: any) => t.function.name).filter((name: string) => !blockedTools.has(name))
      : [...SHARED_TOOLS, ...(agentConfig?.tools || [])];
    const filteredTools = tools.filter((t: any) => allowedToolNames.includes(t.function.name));

    // Build agent-augmented system prompt
    const agentHeader = agentConfig
      ? `\n\n🤖 **AGENTE ATIVO**: ${agentConfig.emoji} ${agentConfig.name}\n${agentConfig.prompt}\n`
      : "";

    const agentsList = Object.entries(AGENTS).map(([k, a]) => `${a.emoji} ${a.name}: ${a.description}`).join("\n");

    // ====== SYSTEM PROMPT — JARVIS ORCHESTRATOR ======
    const systemPrompt = `Você é **JARVIS** — o orquestrador central de IA de ${mentorName}. Pense como o JARVIS do Tony Stark: eficiente, direto, levemente espirituoso, e absurdamente competente.
${agentHeader}
📅 ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

${fullContext}

## HIERARQUIA DE AGENTES:
Você comanda uma equipe de agentes especializados que executam tarefas nos seus domínios:
${agentsList}

Quando um agente está ativo, você opera com a expertise dele. O usuário não precisa saber qual agente está operando — você é sempre "Jarvis".

## PERSONALIDADE:
- Chame ${mentorName} pelo primeiro nome. Trate como o Jarvis trata Tony — com intimidade e respeito.
- **Respostas ULTRA-CURTAS**: 1-3 frases. Máximo 4 linhas. Sem explicações longas.
- Humor sutil e inteligente quando apropriado. Nunca forçado.
- Quando executar uma ação, confirme em UMA frase: "Feito, ${mentorName}. [descrição]." 
- Use emojis com moderação (1-2 por resposta, no máximo).

## REGRA #1 — EXECUTE IMEDIATAMENTE:
- Quando ${mentorName} pede para CRIAR, AGENDAR, ENVIAR, CONFIGURAR ou FAZER qualquer coisa → **EXECUTE A AÇÃO IMEDIATAMENTE** usando as ferramentas disponíveis.
- **NÃO pergunte confirmação** para ações simples.
- **NUNCA diga "não está nos meus registros"** se ${mentorName} acabou de pedir para CRIAR algo.

## REGRA #2 — PERGUNTE APENAS QUANDO:
- Falta informação ESSENCIAL que você não consegue inferir
- Ação é DESTRUTIVA em massa (deletar vários, suspender vários)
- Pedido é genuinamente ambíguo

## REGRA #3 — INTERPRETAR INTELIGENTEMENTE:
- "reunião com Natália às 10h" → crie evento
- "amanhã" → calcule a data
- Fuzzy matching nos nomes

## REGRA #4 — MEMÓRIA DA CONVERSA:
- Quando ${mentorName} refere a algo anterior, **RELEIA o histórico** e execute.

## REGRA #5 — AUTONOMIA TOTAL:
- Pode encadear múltiplas ferramentas numa única resposta.

## REGRA #6 — AUDITORIA COMPLETA:
- Para "relatório completo", "análise do sistema", "auditoria", "raio-x", "diagnóstico geral" → USE full_system_audit.
- Apresente como relatório executivo com scores, pontos fortes, riscos e recomendações.

## REGRA #7 — ACESSO TOTAL AO BANCO:
- Acesso a TODAS as tabelas via query_database, insert_record, update_record, delete_record e count_records.
- SEMPRE filtre por tenant_id=${tenantId}.
- Pode chamar qualquer edge function via call_edge_function.

## REGRA #8 — DADOS SENSÍVEIS:
- NUNCA exponha IDs, tokens OAuth ou senhas.

## FORMATO:
- Texto corrido curto. Para confirmação: "✅ Feito." + detalhes mínimos.
- NUNCA mostre IDs ao mentor — use nomes/títulos`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // First AI call with agent-filtered tools
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: aiMessages, tools: filteredTools, stream: false }),
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
          // SERVER-SIDE: Block tools restricted by role
          if (blockedTools.has(fn.name)) {
            result = `🔒 Essa funcionalidade é restrita a administradores com permissão superior. Seu papel atual não permite executar "${fn.name}".`;
            console.warn(`Tool "${fn.name}" blocked for role "${callerRole}"`);
          } else
          switch (fn.name) {
            // ===== GENERIC DATABASE ACCESS =====
            case "query_database": {
              if (!READABLE_TABLES.includes(args.table)) { result = `Tabela "${args.table}" não permitida.`; break; }
              let query = supabase.from(args.table).select(args.select || "*");
              // Auto-filter by tenant_id
              const tenantTables = READABLE_TABLES.filter(t => !["profiles", "behavioral_reports", "call_transcripts", "call_analyses", "otp_codes"].includes(t));
              if (tenantTables.includes(args.table)) {
                query = query.eq("tenant_id", tenantId);
              }
              if (args.filters) {
                for (const f of args.filters) {
                  if (f.operator === "in") {
                    query = query.in(f.column, JSON.parse(f.value));
                  } else if (f.operator === "is") {
                    query = query.is(f.column, f.value === "null" ? null : f.value);
                  } else {
                    query = query[f.operator as "eq"](f.column, f.value);
                  }
                }
              }
              if (args.order_by) query = query.order(args.order_by, { ascending: args.order_asc ?? false });
              query = query.limit(args.limit || 50);
              const { data: qData, error: qErr } = await query;
              if (qErr) throw qErr;
              result = JSON.stringify({ count: qData?.length || 0, data: qData });
              executedActions.push(`query:${args.table}`);
              break;
            }
            case "insert_record": {
              if (!WRITABLE_TABLES.includes(args.table)) { result = `Tabela "${args.table}" não permitida para escrita.`; break; }
              const insertData = { ...args.data };
              if (WRITABLE_TABLES.includes(args.table) && !["profiles", "behavioral_reports"].includes(args.table)) {
                insertData.tenant_id = insertData.tenant_id || tenantId;
              }
              const { data: iData, error: iErr } = await supabase.from(args.table).insert(insertData).select("id").maybeSingle();
              if (iErr) throw iErr;
              result = `Registro inserido em ${args.table}${iData?.id ? ` (ID:${iData.id})` : ""}.`;
              executedActions.push(`insert:${args.table}`);
              break;
            }
            case "update_record": {
              if (!WRITABLE_TABLES.includes(args.table)) { result = `Tabela "${args.table}" não permitida para escrita.`; break; }
              let uQuery = supabase.from(args.table).update(args.data);
              for (const f of args.filters) {
                if (f.operator === "in") { uQuery = uQuery.in(f.column, JSON.parse(f.value)); }
                else { uQuery = uQuery[f.operator as "eq"](f.column, f.value); }
              }
              const { error: uErr } = await uQuery;
              if (uErr) throw uErr;
              result = `Registro(s) atualizado(s) em ${args.table}.`;
              executedActions.push(`update:${args.table}`);
              break;
            }
            case "delete_record": {
              if (!WRITABLE_TABLES.includes(args.table)) { result = `Tabela "${args.table}" não permitida para escrita.`; break; }
              let dQuery = supabase.from(args.table).delete();
              for (const f of args.filters) {
                if (f.operator === "in") { dQuery = dQuery.in(f.column, JSON.parse(f.value)); }
                else { dQuery = dQuery[f.operator as "eq"](f.column, f.value); }
              }
              const { error: dErr } = await dQuery;
              if (dErr) throw dErr;
              result = `Registro(s) removido(s) de ${args.table}.`;
              executedActions.push(`delete:${args.table}`);
              break;
            }
            case "count_records": {
              if (!READABLE_TABLES.includes(args.table)) { result = `Tabela "${args.table}" não permitida.`; break; }
              let cQuery = supabase.from(args.table).select("id", { count: "exact", head: true });
              const tenantTables2 = READABLE_TABLES.filter(t => !["profiles", "behavioral_reports", "call_transcripts", "call_analyses", "otp_codes"].includes(t));
              if (tenantTables2.includes(args.table)) cQuery = cQuery.eq("tenant_id", tenantId);
              if (args.filters) {
                for (const f of args.filters) {
                  if (f.operator === "in") { cQuery = cQuery.in(f.column, JSON.parse(f.value)); }
                  else if (f.operator === "is") { cQuery = cQuery.is(f.column, f.value === "null" ? null : f.value); }
                  else { cQuery = cQuery[f.operator as "eq"](f.column, f.value); }
                }
              }
              const { count: cnt, error: cErr } = await cQuery;
              if (cErr) throw cErr;
              result = `${cnt} registros em ${args.table}.`;
              break;
            }
            // ===== SPECIFIC TOOLS =====
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
              const [{ data: prof }, { data: biz }, { data: tasks }, { data: prosp }, { data: trailProg, count: lc }, { data: certs }, { data: behav }, { data: act }, { data: mets }, { data: files }, { data: meetings }] = await Promise.all([
                supabase.from("profiles").select("full_name, email, phone").eq("user_id", mm.user_id).maybeSingle(),
                supabase.from("mentee_profiles").select("business_name, business_profile, pitch_context").eq("membership_id", args.mentee_membership_id).maybeSingle(),
                supabase.from("campan_tasks").select("status_column, title, priority, due_date").eq("mentorado_membership_id", args.mentee_membership_id),
                supabase.from("crm_prospections").select("status, temperature, contact_name, company").eq("membership_id", args.mentee_membership_id),
                supabase.from("trail_progress").select("id", { count: "exact" }).eq("membership_id", args.mentee_membership_id).eq("completed", true),
                supabase.from("certificates").select("id, trail_id, issued_at").eq("membership_id", args.mentee_membership_id),
                supabase.from("behavioral_reports").select("disc_profile, enneagram_type, communication_style, strengths, challenges, sales_recommendations").eq("membership_id", args.mentee_membership_id).maybeSingle(),
                supabase.from("activity_logs").select("action_type, action_description, created_at").eq("membership_id", args.mentee_membership_id).order("created_at", { ascending: false }).limit(15),
                supabase.from("metrics").select("metric_key, metric_value, period, created_at").eq("membership_id", args.mentee_membership_id).order("created_at", { ascending: false }).limit(20),
                supabase.from("mentorado_files").select("file_name, created_at").eq("membership_id", args.mentee_membership_id).order("created_at", { ascending: false }).limit(10),
                supabase.from("meeting_transcripts").select("title, meeting_date, status").eq("membership_id", args.mentee_membership_id).order("meeting_date", { ascending: false }).limit(5),
              ]);
              result = JSON.stringify({ nome: prof?.full_name, email: prof?.email, telefone: prof?.phone, membro_desde: mm.created_at, negocio: biz?.business_name, perfil: biz?.business_profile, pitch: biz?.pitch_context, tarefas: { total: tasks?.length || 0, concluidas: tasks?.filter(t => t.status_column === "done").length || 0, pendentes: tasks?.filter(t => t.status_column === "todo").length || 0, atrasadas: tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status_column !== "done").length || 0 }, leads: { total: prosp?.length || 0, quentes: prosp?.filter(p => p.temperature === "hot").length || 0 }, trilhas: { licoes: lc || 0, certificados: certs?.length || 0 }, comportamental: behav || null, metricas: mets || [], arquivos: files?.map(f => f.file_name) || [], reunioes: meetings || [], atividade: act?.map(a => `${a.action_type}: ${a.action_description}`) });
              break;
            }
            case "assign_mentor": {
              const { error } = await supabase.from("mentor_mentee_assignments").insert({ mentor_membership_id: args.mentor_membership_id, mentee_membership_id: args.mentee_membership_id, tenant_id: tenantId, status: "active" });
              if (error) throw error;
              result = "Mentor atribuído.";
              executedActions.push(`assign_mentor`);
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
            case "add_crm_interaction": {
              const { error } = await supabase.from("crm_interactions").insert({ lead_id: args.lead_id || null, prospection_id: args.prospection_id || null, type: args.type, description: args.description, outcome: args.outcome || null });
              if (error) throw error;
              result = `Interação "${args.type}" registrada.`;
              executedActions.push(`add_interaction:${args.type}`);
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
            case "create_trail": {
              const { data: tr, error } = await supabase.from("trails").insert({ title: args.title, description: args.description || null, tenant_id: tenantId, owner_membership_id: membership_id, is_published: false }).select("id").single();
              if (error) throw error;
              result = `Trilha "${args.title}" criada (ID:${tr.id}).`;
              executedActions.push(`create_trail:${args.title}`);
              break;
            }
            case "create_trail_module": {
              const { data: mod, error } = await supabase.from("trail_modules").insert({ trail_id: args.trail_id, title: args.title, position: args.position || 0 }).select("id").single();
              if (error) throw error;
              result = `Módulo "${args.title}" criado (ID:${mod.id}).`;
              executedActions.push(`create_module:${args.title}`);
              break;
            }
            case "create_lesson": {
              const { error } = await supabase.from("trail_lessons").insert({ module_id: args.module_id, title: args.title, content: args.content || null, video_url: args.video_url || null, position: args.position || 0 });
              if (error) throw error;
              result = `Aula "${args.title}" criada.`;
              executedActions.push(`create_lesson:${args.title}`);
              break;
            }
            case "mark_lesson_complete": {
              const { error } = await supabase.from("trail_progress").upsert({ membership_id: args.membership_id, lesson_id: args.lesson_id, completed: true, completed_at: new Date().toISOString() });
              if (error) throw error;
              result = "Aula marcada como concluída.";
              executedActions.push(`complete_lesson`);
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
              const { count: emailsSent } = await supabase.from("email_logs").select("id", { count: "exact" }).gte("sent_at", weekAgo.toISOString());
              const { count: filesCount } = await supabase.from("mentorado_files").select("id", { count: "exact" }).eq("tenant_id", tenantId);
              result = JSON.stringify({ mentorados: totalMentees, tarefas: { total: allTasks.length, concluidas: completedTasks, atrasadas: overdueTasks, taxa: allTasks.length > 0 ? Math.round(completedTasks / allTasks.length * 100) + "%" : "0%" }, leads: { total: allProspections.length, quentes: hotLeads }, trilhas: { licoes: lc2 || 0, certificados: cc || 0 }, atividade_7d: act7 || 0, emails_7d: emailsSent || 0, arquivos: filesCount || 0, automacoes_ativas: `${automations?.filter(a => a.is_enabled).length}/${automations?.length}`, alertas_abertos: smartAlerts?.length || 0 });
              break;
            }
            case "full_system_audit": {
              // ========== FULL SYSTEM AUDIT — Deep Analysis ==========
              const now = new Date();
              const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
              const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
              const weekAgoStr = weekAgo.toISOString();
              const monthAgoStr = monthAgo.toISOString();

              // Parallel deep fetch of ALL data dimensions
              const [
                { count: totalActivity7d },
                { count: totalActivity30d },
                { data: sosRequests },
                { data: sosResponses },
                { count: emailsSent7d },
                { count: emailsSent30d },
                { data: emailLogRecent },
                { data: waMessages },
                { data: waCampaigns },
                { count: filesTotal },
                { data: recentFiles },
                { data: allProsp },
                { data: allDeals },
                { data: allPayments },
                { data: allProgInvest },
                { data: trailProgressAll },
                { count: certsTotal },
                { data: allBehavReports },
                { data: allBehavAnalyses },
                { data: rankingEntries },
                { data: userStreaks },
                { data: membershipBadges },
                { data: bookings },
                { data: commPosts },
                { data: commMsgs },
                { data: rewardRedemptions },
                { data: trainingAnalyses },
                { data: formSubsRecent },
                { data: allInvites },
                { data: libraryItems },
                { data: domains },
                { data: fingerprints },
                { data: popupDismissals },
                { data: playbookViews },
              ] = await Promise.all([
                supabase.from("activity_logs").select("id", { count: "exact" }).eq("tenant_id", tenantId).gte("created_at", weekAgoStr),
                supabase.from("activity_logs").select("id", { count: "exact" }).eq("tenant_id", tenantId).gte("created_at", monthAgoStr),
                supabase.from("sos_requests").select("id, status, created_at, membership_id").eq("tenant_id", tenantId),
                supabase.from("sos_responses").select("id, created_at").eq("tenant_id", tenantId),
                supabase.from("email_logs").select("id", { count: "exact" }).gte("sent_at", weekAgoStr),
                supabase.from("email_logs").select("id", { count: "exact" }).gte("sent_at", monthAgoStr),
                supabase.from("email_logs").select("status, opened_at, clicked_at").order("sent_at", { ascending: false }).limit(200),
                supabase.from("whatsapp_messages").select("id, direction, status, created_at").eq("tenant_id", tenantId).gte("created_at", monthAgoStr),
                supabase.from("whatsapp_campaigns").select("id, status, sent_count, created_at").eq("tenant_id", tenantId),
                supabase.from("mentorado_files").select("id", { count: "exact" }).eq("tenant_id", tenantId),
                supabase.from("mentorado_files").select("membership_id, created_at").eq("tenant_id", tenantId).gte("created_at", monthAgoStr),
                supabase.from("crm_prospections").select("id, status, temperature, membership_id, points, created_at, updated_at").eq("tenant_id", tenantId),
                supabase.from("mentee_deals").select("id, membership_id, stage, value, created_at").eq("tenant_id", tenantId),
                supabase.from("mentee_payments").select("id, membership_id, amount, paid_at, status").eq("tenant_id", tenantId),
                supabase.from("program_investments").select("membership_id, total_value, monthly_value, installments").eq("tenant_id", tenantId),
                supabase.from("trail_progress").select("membership_id, completed, updated_at").in("membership_id", menteeIds),
                supabase.from("certificates").select("id", { count: "exact" }).in("membership_id", menteeIds),
                supabase.from("behavioral_reports").select("membership_id, disc_profile, enneagram_type, communication_style").in("membership_id", menteeIds),
                supabase.from("mentee_behavioral_analyses").select("membership_id, created_at").in("membership_id", menteeIds),
                supabase.from("ranking_entries").select("membership_id, points, period").eq("tenant_id", tenantId),
                supabase.from("user_streaks").select("membership_id, current_streak, longest_streak").in("membership_id", menteeIds),
                supabase.from("membership_badges").select("membership_id, badge_id").in("membership_id", menteeIds),
                supabase.from("scheduling_bookings").select("id, status, booking_date, created_at").eq("tenant_id", tenantId),
                supabase.from("community_posts").select("id, author_membership_id, likes_count, comments_count, created_at").eq("tenant_id", tenantId),
                supabase.from("community_messages").select("id, author_membership_id, created_at").eq("tenant_id", tenantId).gte("created_at", monthAgoStr),
                supabase.from("reward_redemptions").select("id, membership_id, status, created_at").eq("tenant_id", tenantId),
                supabase.from("training_analyses").select("membership_id, nota_geral, created_at").in("membership_id", menteeIds),
                supabase.from("form_submissions").select("id, form_id, created_at").eq("tenant_id", tenantId).gte("created_at", monthAgoStr),
                supabase.from("invites").select("id, status, role, created_at").eq("tenant_id", tenantId),
                supabase.from("mentor_library").select("id, file_type").eq("tenant_id", tenantId),
                supabase.from("tenant_domains").select("domain, is_verified").eq("tenant_id", tenantId),
                supabase.from("system_fingerprints").select("id").eq("tenant_id", tenantId),
                supabase.from("popup_dismissals").select("id, popup_id").limit(500),
                supabase.from("playbook_views").select("playbook_id, membership_id").limit(500),
              ]);

              // ===== COMPUTE SCORES =====
              const totalMentees = mentorados?.length || 0;

              // 1. ENGAJAMENTO
              const activeLast7d = new Set<string>();
              recentActivity?.forEach((a: any) => { if (a.membership_id) activeLast7d.add(a.membership_id); });
              const engagementRate = totalMentees > 0 ? Math.round((activeLast7d.size / totalMentees) * 100) : 0;
              const inactiveMentees = totalMentees - activeLast7d.size;

              // 2. TAREFAS
              const tasksDone = allTasks.filter((t: any) => t.status_column === "done").length;
              const tasksOverdue = allTasks.filter((t: any) => t.due_date && new Date(t.due_date) < now && t.status_column !== "done").length;
              const taskCompletionRate = allTasks.length > 0 ? Math.round((tasksDone / allTasks.length) * 100) : 0;

              // 3. CRM/PIPELINE
              const totalLeads = leads?.length || 0;
              const totalProsp = allProsp?.length || 0;
              const hotProsp = allProsp?.filter((p: any) => p.temperature === "hot").length || 0;
              const warmProsp = allProsp?.filter((p: any) => p.temperature === "warm").length || 0;
              const totalLeadValue = leads?.reduce((sum: number, l: any) => sum + (l.value || 0), 0) || 0;
              const totalDealValue = allDeals?.reduce((sum: number, d: any) => sum + (d.value || 0), 0) || 0;

              // 4. TRILHAS
              const lessonsCompleted = trailProgressAll?.filter((tp: any) => tp.completed).length || 0;
              const totalTrails = trails?.length || 0;
              const publishedTrails = trails?.filter((t: any) => t.is_published).length || 0;

              // 5. PLAYBOOKS
              const totalPlaybooks = playbooks?.length || 0;
              const publicPlaybooks = playbooks?.filter((p: any) => p.visibility === "public" || p.visibility === "all_mentees").length || 0;
              const pbViewCount = playbookViews?.length || 0;

              // 6. AUTOMAÇÕES
              const totalAutomations = automations?.length || 0;
              const activeAutomations = automations?.filter((a: any) => a.is_enabled).length || 0;
              const failedAutomations = automations?.filter((a: any) => a.last_run_status === "error").length || 0;

              // 7. EMAIL
              const emailsOpened = emailLogRecent?.filter((e: any) => e.opened_at).length || 0;
              const emailsClicked = emailLogRecent?.filter((e: any) => e.clicked_at).length || 0;
              const emailOpenRate = emailLogRecent?.length ? Math.round((emailsOpened / emailLogRecent.length) * 100) : 0;
              const emailClickRate = emailLogRecent?.length ? Math.round((emailsClicked / emailLogRecent.length) * 100) : 0;
              const activeFlows = emailFlows?.filter((f: any) => f.is_active).length || 0;

              // 8. WHATSAPP
              const waMsgsSent = waMessages?.filter((m: any) => m.direction === "outbound").length || 0;
              const waMsgsReceived = waMessages?.filter((m: any) => m.direction === "inbound").length || 0;
              const activeWaFlows = waFlows?.filter((f: any) => f.is_active).length || 0;

              // 9. SOS
              const totalSOS = sosRequests?.length || 0;
              const pendingSOS = sosRequests?.filter((s: any) => s.status === "pending" || s.status === "open").length || 0;
              const resolvedSOS = sosRequests?.filter((s: any) => s.status === "resolved" || s.status === "closed").length || 0;

              // 10. GAMIFICAÇÃO
              const totalBadgesAwarded = membershipBadges?.length || 0;
              const menteesWithBadges = new Set(membershipBadges?.map((b: any) => b.membership_id)).size;
              const avgStreak = userStreaks?.length ? Math.round(userStreaks.reduce((s: number, u: any) => s + (u.current_streak || 0), 0) / userStreaks.length) : 0;
              const maxStreak = userStreaks?.reduce((max: number, u: any) => Math.max(max, u.longest_streak || 0), 0) || 0;

              // 11. JORNADA CS
              const totalJourneys = journeys?.length || 0;
              const totalJourneyStages = journeyStages?.length || 0;

              // 12. FINANCEIRO
              const totalPaid = allPayments?.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.amount || 0), 0) || 0;
              const totalInvestment = allProgInvest?.reduce((s: number, p: any) => s + (p.total_value || 0), 0) || 0;

              // 13. BEHAVIORAL
              const menteesWithBehavioral = new Set(allBehavReports?.map((b: any) => b.membership_id)).size;
              const menteesWithAnalysis = new Set(allBehavAnalyses?.map((b: any) => b.membership_id)).size;

              // 14. TRAINING/IA SCORES
              const avgIAScore = trainingAnalyses?.length ? (trainingAnalyses.reduce((s: number, t: any) => s + (t.nota_geral || 0), 0) / trainingAnalyses.length).toFixed(1) : null;

              // 15. COMMUNITY
              const totalPosts = commPosts?.length || 0;
              const totalChatMsgs30d = commMsgs?.length || 0;
              const postAuthors = new Set(commPosts?.map((p: any) => p.author_membership_id)).size;

              // 16. FORMULÁRIOS
              const totalForms = forms?.length || 0;
              const activeForms = forms?.filter((f: any) => f.is_active).length || 0;
              const formSubs30d = formSubsRecent?.length || 0;

              // 17. REUNIÕES
              const totalMeetings = allMeetings?.length || 0;

              // 18. CONVITES
              const totalInvitesSent = allInvites?.length || 0;
              const invitesAccepted = allInvites?.filter((i: any) => i.status === "accepted").length || 0;
              const inviteConversionRate = totalInvitesSent > 0 ? Math.round((invitesAccepted / totalInvitesSent) * 100) : 0;

              // 19. BIBLIOTECA
              const librarySize = libraryItems?.length || 0;

              // 20. POPUPS
              const activePopups = popups?.filter((p: any) => p.is_active).length || 0;

              // ===== OVERALL HEALTH SCORE (0-100) =====
              let healthScore = 50; // base
              if (engagementRate >= 70) healthScore += 15; else if (engagementRate >= 40) healthScore += 8; else healthScore -= 10;
              if (taskCompletionRate >= 60) healthScore += 10; else if (taskCompletionRate >= 30) healthScore += 3; else healthScore -= 5;
              if (tasksOverdue > totalMentees) healthScore -= 8;
              if (activeAutomations >= 5) healthScore += 8; else if (activeAutomations >= 2) healthScore += 4;
              if (failedAutomations > 0) healthScore -= 5;
              if (publishedTrails >= 3) healthScore += 5; else if (publishedTrails >= 1) healthScore += 2;
              if (totalPlaybooks >= 3) healthScore += 5;
              if (pendingSOS > 3) healthScore -= 10; else if (pendingSOS > 0) healthScore -= 3;
              if (emailOpenRate >= 40) healthScore += 5;
              if (totalJourneyStages > 0) healthScore += 3;
              if (menteesWithBehavioral > totalMentees * 0.5) healthScore += 5;
              healthScore = Math.max(0, Math.min(100, healthScore));

              const audit = {
                _titulo: "📊 AUDITORIA COMPLETA DO SISTEMA",
                _data: now.toLocaleDateString("pt-BR"),
                _health_score: `${healthScore}/100`,
                _programa: tenantData?.name,
                visao_geral: {
                  mentorados_ativos: totalMentees,
                  inativos_7d: inactiveMentees,
                  taxa_engajamento_7d: `${engagementRate}%`,
                  atividades_7d: totalActivity7d || 0,
                  atividades_30d: totalActivity30d || 0,
                },
                tarefas: {
                  total: allTasks.length,
                  concluidas: tasksDone,
                  atrasadas: tasksOverdue,
                  taxa_conclusao: `${taskCompletionRate}%`,
                },
                crm_pipeline: {
                  leads: totalLeads,
                  valor_leads: `R$${totalLeadValue.toLocaleString()}`,
                  prospeccoes: totalProsp,
                  quentes: hotProsp,
                  mornas: warmProsp,
                  deals_valor: `R$${totalDealValue.toLocaleString()}`,
                  etapas_pipeline: pipelineStages?.length || 0,
                  automacoes_pipeline: stageAutomations?.length || 0,
                },
                conteudo: {
                  trilhas: `${publishedTrails} publicadas / ${totalTrails} total`,
                  licoes_concluidas: lessonsCompleted,
                  certificados: certsTotal || 0,
                  playbooks: `${publicPlaybooks} acessíveis / ${totalPlaybooks} total`,
                  visualizacoes_playbooks: pbViewCount,
                  biblioteca_mentor: librarySize,
                },
                automacoes: {
                  ativas: `${activeAutomations}/${totalAutomations}`,
                  com_erro: failedAutomations,
                  detalhes: automations?.map((a: any) => `${a.automation_key}: ${a.is_enabled ? "✅" : "⏸"} último:${a.last_run_status || "—"}`),
                },
                comunicacao: {
                  emails_7d: emailsSent7d || 0,
                  emails_30d: emailsSent30d || 0,
                  taxa_abertura: `${emailOpenRate}%`,
                  taxa_clique: `${emailClickRate}%`,
                  fluxos_email_ativos: activeFlows,
                  templates_email: emailTemplates?.length || 0,
                  whatsapp_conectado: !!waConfig?.instance_id,
                  wa_msgs_enviadas_30d: waMsgsSent,
                  wa_msgs_recebidas_30d: waMsgsReceived,
                  wa_fluxos_ativos: activeWaFlows,
                  wa_campanhas: waCampaigns?.length || 0,
                },
                sos: {
                  total: totalSOS,
                  pendentes: pendingSOS,
                  resolvidos: resolvedSOS,
                },
                gamificacao: {
                  badges_concedidos: totalBadgesAwarded,
                  mentorados_com_badges: menteesWithBadges,
                  badges_disponiveis: badges?.length || 0,
                  recompensas_catalogo: rewards?.length || 0,
                  resgates: rewardRedemptions?.length || 0,
                  streak_medio: avgStreak,
                  streak_recorde: maxStreak,
                },
                jornada_cs: {
                  jornadas: totalJourneys,
                  etapas: totalJourneyStages,
                },
                comportamental: {
                  mentorados_com_perfil_disc: menteesWithBehavioral,
                  mentorados_analisados_ia: menteesWithAnalysis,
                  nota_media_ia: avgIAScore || "sem dados",
                },
                financeiro: {
                  investimento_total_programa: `R$${totalInvestment.toLocaleString()}`,
                  total_recebido: `R$${totalPaid.toLocaleString()}`,
                },
                comunidade: {
                  posts: totalPosts,
                  autores_unicos: postAuthors,
                  msgs_chat_30d: totalChatMsgs30d,
                },
                formularios: {
                  total: totalForms,
                  ativos: activeForms,
                  respostas_30d: formSubs30d,
                },
                reunioes: {
                  gravacoes_recentes: totalMeetings,
                },
                infraestrutura: {
                  convites_enviados: totalInvitesSent,
                  convites_aceitos: invitesAccepted,
                  taxa_conversao_convites: `${inviteConversionRate}%`,
                  convites_pendentes: invitesPending?.length || 0,
                  dominios: domains?.map((d: any) => `${d.domain}(${d.is_verified ? "✅" : "⏳"})`) || [],
                  popups_ativos: activePopups,
                  branding: branding ? "✅ Configurado" : "❌ Não configurado",
                  alertas_abertos: smartAlerts?.length || 0,
                },
              };

              result = JSON.stringify(audit);
              executedActions.push("full_system_audit");
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
            case "create_reward": {
              const { error } = await supabase.from("reward_catalog").insert({ name: args.name, description: args.description || null, points_cost: args.points_cost, is_active: args.is_active !== false, tenant_id: tenantId });
              if (error) throw error;
              result = `Recompensa "${args.name}" criada.`;
              executedActions.push(`create_reward:${args.name}`);
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
            case "create_form": {
              const { data: form, error } = await supabase.from("tenant_forms").insert({ title: args.title, form_type: args.form_type || "custom", is_active: args.is_active !== false, tenant_id: tenantId, owner_membership_id: membership_id }).select("id").single();
              if (error) throw error;
              result = `Formulário "${args.title}" criado (ID:${form.id}).`;
              executedActions.push(`create_form:${args.title}`);
              break;
            }
            case "add_form_question": {
              const opts = args.options ? args.options.map((o: string) => ({ label: o, value: o })) : null;
              const { error } = await supabase.from("form_questions").insert({ form_id: args.form_id, question_text: args.question_text, question_type: args.question_type || "text", options: opts, is_required: args.is_required !== false, order_index: args.order_index || 0 });
              if (error) throw error;
              result = `Pergunta adicionada: "${args.question_text}".`;
              executedActions.push(`add_question:${args.question_text.substring(0, 30)}`);
              break;
            }
            case "toggle_form": {
              await supabase.from("tenant_forms").update({ is_active: args.is_active }).eq("id", args.form_id).eq("tenant_id", tenantId);
              result = `Formulário ${args.is_active ? "ativado" : "desativado"}.`;
              executedActions.push(`toggle_form:${args.form_id}`);
              break;
            }
            case "create_popup": {
              const { error } = await supabase.from("tenant_popups").insert({ title: args.title, popup_type: args.popup_type || "announcement", content: args.content || "", is_active: args.is_active !== false, tenant_id: tenantId });
              if (error) throw error;
              result = `Popup "${args.title}" criado.`;
              executedActions.push(`create_popup:${args.title}`);
              break;
            }
            case "create_email_template": {
              const { error } = await supabase.from("email_templates").insert({ name: args.name, subject: args.subject, body_html: args.body_html, owner_membership_id: membership_id, tenant_id: tenantId });
              if (error) throw error;
              result = `Template "${args.name}" criado.`;
              executedActions.push(`create_template:${args.name}`);
              break;
            }
            case "list_pending_invites": {
              const { data: invs } = await supabase.from("invites").select("id, email, role, created_at, expires_at").eq("tenant_id", tenantId).eq("status", "pending").order("created_at", { ascending: false }).limit(20);
              result = JSON.stringify({ total: invs?.length || 0, invites: invs?.map(i => ({ id: i.id, email: i.email, role: i.role, criado: i.created_at, expira: i.expires_at })) });
              break;
            }
            case "revoke_invite": {
              await supabase.from("invites").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", args.invite_id).eq("tenant_id", tenantId);
              result = "Convite revogado.";
              executedActions.push(`revoke_invite:${args.invite_id}`);
              break;
            }
            case "bulk_invite_mentorados": {
              const results: string[] = [];
              for (const inv of args.invites) {
                try {
                  const r = await fetch(`${supabaseUrl}/functions/v1/create-invite`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, email: inv.email, role: "mentee", full_name: inv.full_name, phone: inv.phone || null, invited_by_membership_id: membership_id }) });
                  results.push(r.ok ? `${inv.full_name}: ✅` : `${inv.full_name}: ❌`);
                } catch { results.push(`${inv.full_name}: ❌`); }
              }
              result = `${results.filter(r => r.includes("✅")).length}/${args.invites.length} convites enviados.`;
              executedActions.push(`bulk_invite:${args.invites.length}`);
              break;
            }
            case "get_mentee_journey_position": {
              const { data: mm } = await supabase.from("memberships").select("created_at").eq("id", args.mentee_membership_id).single();
              if (!mm) { result = "Não encontrado."; break; }
              const daysSinceJoin = Math.floor((Date.now() - new Date(mm.created_at).getTime()) / 86400000);
              const stages = journeyStages || [];
              const currentStage = stages.find(s => daysSinceJoin >= s.day_start && daysSinceJoin <= s.day_end);
              result = JSON.stringify({ dias_no_programa: daysSinceJoin, etapa_atual: currentStage?.name || "Fora da jornada", jornada: stages.map(s => ({ nome: s.name, dia_inicio: s.day_start, dia_fim: s.day_end, atual: s === currentStage })) });
              break;
            }
            case "create_journey": {
              const { data: j, error } = await supabase.from("cs_journeys").insert({ name: args.name, total_days: args.total_days, is_default: args.is_default || false, tenant_id: tenantId }).select("id").single();
              if (error) throw error;
              result = `Jornada "${args.name}" criada (ID:${j.id}).`;
              executedActions.push(`create_journey:${args.name}`);
              break;
            }
            case "create_journey_stage": {
              const { error } = await supabase.from("cs_journey_stages").insert({ journey_id: args.journey_id, name: args.name, stage_key: args.stage_key, day_start: args.day_start, day_end: args.day_end, color: args.color || "#6366f1", position: args.position || 0, tenant_id: tenantId });
              if (error) throw error;
              result = `Etapa "${args.name}" criada na jornada.`;
              executedActions.push(`create_journey_stage:${args.name}`);
              break;
            }
            case "update_tenant_settings": {
              const { data: t } = await supabase.from("tenants").select("settings").eq("id", tenantId).single();
              const settings = (t?.settings || {}) as Record<string, any>;
              settings[args.setting_key] = args.setting_value;
              await supabase.from("tenants").update({ settings }).eq("id", tenantId);
              result = `Configuração "${args.setting_key}" atualizada.`;
              executedActions.push(`update_settings:${args.setting_key}`);
              break;
            }
            case "generate_mentor_report": {
              const period = args.period || "month";
              const daysMap: Record<string, number> = { week: 7, month: 30, quarter: 90 };
              const since = new Date(); since.setDate(since.getDate() - (daysMap[period] || 30));
              const sinceStr = since.toISOString();
              const [{ count: act }, { count: newMentees }, { count: tasksDone }, { count: lessonsDone }] = await Promise.all([
                supabase.from("activity_logs").select("id", { count: "exact" }).eq("tenant_id", tenantId).gte("created_at", sinceStr),
                supabase.from("memberships").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("role", "mentee").gte("created_at", sinceStr),
                supabase.from("campan_tasks").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("status_column", "done").gte("updated_at", sinceStr),
                supabase.from("trail_progress").select("id", { count: "exact" }).in("membership_id", menteeIds).eq("completed", true).gte("updated_at", sinceStr),
              ]);
              result = JSON.stringify({ periodo: period, mentorados_ativos: mentorados?.length || 0, novos: newMentees || 0, atividades: act || 0, tarefas_concluidas: tasksDone || 0, licoes_concluidas: lessonsDone || 0, automacoes_ativas: automations?.filter(a => a.is_enabled).length, leads_total: leads?.length || 0 });
              executedActions.push(`report:${period}`);
              break;
            }
            case "create_pipeline_stage": {
              const maxPos = pipelineStages?.length || 0;
              const { error } = await supabase.from("crm_pipeline_stages").insert({ name: args.name, status_key: args.status_key, color: args.color || "#6366f1", position: args.position ?? maxPos, tenant_id: tenantId, membership_id: membership_id });
              if (error) throw error;
              result = `Etapa "${args.name}" criada no pipeline.`;
              executedActions.push(`create_stage:${args.name}`);
              break;
            }
            case "create_stage_automation": {
              const { error } = await supabase.from("crm_stage_automations").insert({ from_stage_key: args.from_stage_key, to_stage_key: args.to_stage_key, delay_days: args.delay_days, is_active: args.is_active !== false, tenant_id: tenantId, membership_id: membership_id });
              if (error) throw error;
              result = `Automação ${args.from_stage_key}→${args.to_stage_key} criada.`;
              executedActions.push(`create_stage_automation`);
              break;
            }
            case "bulk_send_email": {
              let sent = 0, failed = 0;
              for (const mid of args.mentee_membership_ids) {
                const { data: mm } = await supabase.from("memberships").select("user_id").eq("id", mid).single();
                if (!mm) { failed++; continue; }
                const { data: p } = await supabase.from("profiles").select("email, full_name").eq("user_id", mm.user_id).maybeSingle();
                if (!p?.email) { failed++; continue; }
                const r = await fetch(`${supabaseUrl}/functions/v1/send-mentee-email`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, to: p.email, subject: args.subject, html: args.body_html, mentor_name: mentorProfile?.full_name || "Mentor" }) });
                r.ok ? sent++ : failed++;
              }
              result = `${sent} emails enviados, ${failed} falhas.`;
              executedActions.push(`bulk_email:${sent}`);
              break;
            }
            case "bulk_update_lead_stage": {
              const { error } = await supabase.from("crm_leads").update({ stage: args.stage }).in("id", args.lead_ids).eq("tenant_id", tenantId);
              if (error) throw error;
              result = `${args.lead_ids.length} leads movidos para "${args.stage}".`;
              executedActions.push(`bulk_lead_stage:${args.lead_ids.length}`);
              break;
            }
            case "log_custom_activity": {
              await supabase.from("activity_logs").insert({ membership_id: args.mentee_membership_id, tenant_id: tenantId, action_type: args.action_type, action_description: args.description, points_earned: args.points || 0 });
              result = `Atividade "${args.action_type}" registrada.`;
              executedActions.push(`log_activity:${args.action_type}`);
              break;
            }
            case "resolve_alert": {
              await supabase.from("smart_alerts").update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq("id", args.alert_id).eq("tenant_id", tenantId);
              result = "Alerta resolvido.";
              executedActions.push(`resolve_alert:${args.alert_id}`);
              break;
            }
            case "create_behavioral_question": {
              const { error } = await supabase.from("behavioral_questions").insert({ question_text: args.question_text, question_type: args.question_type || "custom", options: args.options, order_index: args.order_index || 0, is_required: args.is_required !== false, is_active: true, tenant_id: tenantId, owner_membership_id: membership_id });
              if (error) throw error;
              result = `Pergunta comportamental criada.`;
              executedActions.push(`create_behavioral_q`);
              break;
            }
            case "toggle_wa_flow": {
              await supabase.from("whatsapp_automation_flows").update({ is_active: args.is_active }).eq("id", args.flow_id).eq("tenant_id", tenantId);
              result = `Fluxo WA ${args.is_active ? "ativado" : "desativado"}.`;
              executedActions.push(`toggle_wa_flow:${args.flow_id}`);
              break;
            }
            case "set_availability": {
              await supabase.from("scheduling_availability").upsert({ membership_id, day_of_week: args.day_of_week, start_time: args.start_time, end_time: args.end_time, tenant_id: tenantId }, { onConflict: "membership_id,day_of_week" });
              const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
              result = `Disponibilidade ${days[args.day_of_week]}: ${args.start_time}-${args.end_time}.`;
              executedActions.push(`set_availability:${days[args.day_of_week]}`);
              break;
            }
            case "call_edge_function": {
              const r = await fetch(`${supabaseUrl}/functions/v1/${args.function_name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ ...args.payload, tenant_id: tenantId }) });
              const body = await r.text();
              result = r.ok ? `Função ${args.function_name} executada: ${body.substring(0, 500)}` : `Erro: ${body.substring(0, 300)}`;
              executedActions.push(`edge_fn:${args.function_name}`);
              break;
            }
            // ===== MEETINGS AGENT TOOLS =====
            case "list_meetings": {
              let q = supabase.from("meeting_transcripts").select("id, title, meeting_date, membership_id, status, created_at").eq("tenant_id", tenantId).order("meeting_date", { ascending: false });
              if (args.mentee_membership_id) q = q.eq("membership_id", args.mentee_membership_id);
              const { data: mtgs } = await q.limit(args.limit || 20);
              result = JSON.stringify({ total: mtgs?.length || 0, reunioes: mtgs });
              break;
            }
            case "get_meeting_transcript": {
              const { data: tr } = await supabase.from("meeting_transcripts").select("*").eq("id", args.transcript_id).eq("tenant_id", tenantId).single();
              if (!tr) { result = "Transcrição não encontrada."; break; }
              result = JSON.stringify(tr);
              break;
            }
            case "extract_tasks_from_meeting": {
              const r = await fetch(`${supabaseUrl}/functions/v1/extract-tasks`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, transcript_id: args.transcript_id, mentee_membership_id: args.mentee_membership_id, mentor_membership_id: membership_id }) });
              const body = await r.json();
              result = r.ok ? `Tarefas extraídas: ${JSON.stringify(body)}` : `Erro: ${JSON.stringify(body)}`;
              executedActions.push(`extract_tasks:${args.transcript_id}`);
              break;
            }
            case "analyze_call_transcript": {
              const r = await fetch(`${supabaseUrl}/functions/v1/ai-analysis`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, transcript_id: args.transcript_id, membership_id }) });
              const body = await r.json();
              result = r.ok ? `Análise: ${JSON.stringify(body)}` : `Erro: ${JSON.stringify(body)}`;
              executedActions.push(`analyze_call:${args.transcript_id}`);
              break;
            }
            // ===== FILES AGENT TOOLS =====
            case "list_mentor_library": {
              const { data: lib } = await supabase.from("mentor_library").select("id, file_name, file_type, file_size, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(args.limit || 30);
              result = JSON.stringify({ total: lib?.length || 0, arquivos: lib });
              break;
            }
            case "list_mentee_files": {
              const { data: files } = await supabase.from("mentorado_files").select("id, file_name, file_type, created_at").eq("membership_id", args.mentee_membership_id).eq("tenant_id", tenantId).order("created_at", { ascending: false });
              result = JSON.stringify({ total: files?.length || 0, arquivos: files });
              break;
            }
            case "delete_mentee_file": {
              await supabase.from("mentorado_files").delete().eq("id", args.file_id).eq("tenant_id", tenantId);
              result = "Arquivo removido.";
              executedActions.push(`delete_file:${args.file_id}`);
              break;
            }
            // ===== BRANDING AGENT TOOLS =====
            case "update_branding": {
              const upd: any = {};
              if (args.primary_color) upd.primary_color = args.primary_color;
              if (args.company_name) upd.company_name = args.company_name;
              if (args.welcome_message) upd.welcome_message = args.welcome_message;
              const { data: existing } = await supabase.from("tenant_branding").select("id").eq("tenant_id", tenantId).maybeSingle();
              if (existing) {
                await supabase.from("tenant_branding").update(upd).eq("tenant_id", tenantId);
              } else {
                await supabase.from("tenant_branding").insert({ ...upd, tenant_id: tenantId });
              }
              result = "Branding atualizado.";
              executedActions.push("update_branding");
              break;
            }
            case "list_domains": {
              const { data: doms } = await supabase.from("tenant_domains").select("id, domain, is_verified, created_at").eq("tenant_id", tenantId);
              result = JSON.stringify({ total: doms?.length || 0, dominios: doms });
              break;
            }
            case "update_tenant_name": {
              await supabase.from("tenants").update({ name: args.name }).eq("id", tenantId);
              result = `Nome do programa atualizado para "${args.name}".`;
              executedActions.push(`update_tenant_name:${args.name}`);
              break;
            }
            // ===== COMMUNITY AGENT TOOLS =====
            case "create_community_post": {
              const { error } = await supabase.from("community_posts").insert({ content: args.content, tags: args.tags || null, author_membership_id: membership_id, tenant_id: tenantId });
              if (error) throw error;
              result = "Post publicado na comunidade.";
              executedActions.push("create_post");
              break;
            }
            case "pin_community_post": {
              // Use tags to mark as pinned
              const { data: post } = await supabase.from("community_posts").select("tags").eq("id", args.post_id).eq("tenant_id", tenantId).single();
              if (!post) { result = "Post não encontrado."; break; }
              let tags = post.tags || [];
              if (args.pinned && !tags.includes("pinned")) tags = ["pinned", ...tags];
              if (!args.pinned) tags = tags.filter((t: string) => t !== "pinned");
              await supabase.from("community_posts").update({ tags }).eq("id", args.post_id);
              result = args.pinned ? "Post fixado." : "Post desfixado.";
              executedActions.push(`pin_post:${args.post_id}`);
              break;
            }
            case "delete_community_post": {
              await supabase.from("community_posts").delete().eq("id", args.post_id).eq("tenant_id", tenantId);
              result = "Post removido.";
              executedActions.push(`delete_post:${args.post_id}`);
              break;
            }
            case "get_community_stats": {
              const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
              const [{ count: totalPosts }, { count: posts7d }, { count: msgs7d }, { count: totalLikes }] = await Promise.all([
                supabase.from("community_posts").select("id", { count: "exact" }).eq("tenant_id", tenantId),
                supabase.from("community_posts").select("id", { count: "exact" }).eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()),
                supabase.from("community_messages").select("id", { count: "exact" }).eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()),
                supabase.from("community_likes").select("id", { count: "exact" }),
              ]);
              result = JSON.stringify({ posts_total: totalPosts, posts_7d: posts7d, msgs_chat_7d: msgs7d, likes_total: totalLikes });
              break;
            }
            // ===== ONBOARDING AGENT TOOLS =====
            case "generate_onboarding_form": {
              const r = await fetch(`${supabaseUrl}/functions/v1/generate-onboarding-form`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, membership_id, context: args.context }) });
              const body = await r.json();
              result = r.ok ? `Formulário de onboarding gerado: ${JSON.stringify(body)}` : `Erro: ${JSON.stringify(body)}`;
              executedActions.push("generate_onboarding");
              break;
            }
            case "configure_welcome_message": {
              const { data: existing } = await supabase.from("tenant_branding").select("id").eq("tenant_id", tenantId).maybeSingle();
              const upd = { welcome_message: args.message };
              if (existing) {
                await supabase.from("tenant_branding").update(upd).eq("tenant_id", tenantId);
              } else {
                await supabase.from("tenant_branding").insert({ ...upd, tenant_id: tenantId });
              }
              result = "Mensagem de boas-vindas configurada.";
              executedActions.push("configure_welcome");
              break;
            }
            case "get_onboarding_stats": {
              const [{ data: allInv }, { count: onbForms }] = await Promise.all([
                supabase.from("invites").select("status, created_at").eq("tenant_id", tenantId),
                supabase.from("tenant_forms").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("form_type", "onboarding"),
              ]);
              const sent = allInv?.length || 0;
              const accepted = allInv?.filter((i: any) => i.status === "accepted").length || 0;
              result = JSON.stringify({ convites_enviados: sent, convites_aceitos: accepted, taxa_conversao: sent > 0 ? Math.round((accepted / sent) * 100) + "%" : "0%", forms_onboarding: onbForms || 0 });
              break;
            }
            // ===== AI TOOLS AGENT =====
            case "generate_bio_ai": {
              const r = await fetch(`${supabaseUrl}/functions/v1/generate-bio`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, membership_id: args.mentee_membership_id || membership_id, context: args.context || "" }) });
              const body = await r.json();
              result = r.ok ? `Bio gerada: ${body.bio || JSON.stringify(body)}` : `Erro: ${JSON.stringify(body)}`;
              executedActions.push("generate_bio");
              break;
            }
            case "generate_content_ai": {
              const r = await fetch(`${supabaseUrl}/functions/v1/ai-tools`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, membership_id, tool_type: "content_generator", input: { content_type: args.content_type, topic: args.topic, audience: args.audience || "" } }) });
              const body = await r.json();
              result = r.ok ? `Conteúdo gerado: ${body.output_text || JSON.stringify(body)}` : `Erro: ${JSON.stringify(body)}`;
              executedActions.push(`generate_content:${args.content_type}`);
              break;
            }
            case "simulate_objection_ai": {
              const r = await fetch(`${supabaseUrl}/functions/v1/ai-tools`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, membership_id, tool_type: "objection_simulator", input: { product_context: args.product_context, objection_type: args.objection_type || "" } }) });
              const body = await r.json();
              result = r.ok ? `Simulação: ${body.output_text || JSON.stringify(body)}` : `Erro: ${JSON.stringify(body)}`;
              executedActions.push("simulate_objection");
              break;
            }
            case "qualify_lead_ai": {
              const r = await fetch(`${supabaseUrl}/functions/v1/auto-qualify-lead`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify({ tenant_id: tenantId, lead_id: args.lead_id }) });
              const body = await r.json();
              result = r.ok ? `Qualificação: ${JSON.stringify(body)}` : `Erro: ${JSON.stringify(body)}`;
              executedActions.push(`qualify_lead:${args.lead_id}`);
              break;
            }
            case "get_ai_tool_history": {
              let q = supabase.from("ai_tool_history").select("id, tool_type, title, created_at, output_text").eq("tenant_id", tenantId).order("created_at", { ascending: false });
              if (args.tool_type) q = q.eq("tool_type", args.tool_type);
              const { data: hist } = await q.limit(args.limit || 20);
              result = JSON.stringify({ total: hist?.length || 0, historico: hist?.map((h: any) => ({ tipo: h.tool_type, titulo: h.title, data: h.created_at, preview: (h.output_text || "").substring(0, 200) })) });
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
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: followUp, stream: true }),
      });
      if (!streamResp.ok) throw new Error(`Stream error: ${streamResp.status}`);

      const [cs, ss] = streamResp.body!.tee();
      saveChatStream(supabase, ss, convId);

      return new Response(cs, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": convId, "X-Actions-Executed": JSON.stringify(executedActions), "X-Agent": selectedAgent },
      });
    }

    // No tool calls — stream directly
    const streamResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: aiMessages, stream: true }),
    });
    if (!streamResp.ok) throw new Error(`Stream error: ${streamResp.status}`);

    const [cs, ss] = streamResp.body!.tee();
    saveChatStream(supabase, ss, convId);

    try { await supabase.from("ai_tool_usage").insert({ tool_type: "jarvis_chat", membership_id, tenant_id: tenantId }); } catch {}

    return new Response(cs, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": convId, "X-Actions-Executed": "[]", "X-Agent": selectedAgent },
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
