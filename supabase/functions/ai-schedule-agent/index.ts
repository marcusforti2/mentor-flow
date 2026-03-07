import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { message, membership_id, tenant_id, conversation_history = [] } = await req.json();
    if (!message || !membership_id || !tenant_id) throw new Error("Missing required fields");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get mentor profile
    const { data: membership } = await adminClient
      .from("memberships")
      .select("id, user_id, role")
      .eq("id", membership_id)
      .single();

    if (!membership || !["admin", "mentor", "ops", "master_admin"].includes(membership.role)) {
      throw new Error("Apenas staff pode usar o agente de agendamento");
    }

    const { data: mentorProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", membership.user_id)
      .single();

    // Get tenant mentees for context
    const { data: mentees } = await adminClient
      .from("memberships")
      .select("id, user_id")
      .eq("tenant_id", tenant_id)
      .eq("role", "mentee")
      .eq("status", "active");

    let menteesList = "";
    if (mentees && mentees.length > 0) {
      const menteeUserIds = mentees.map(m => m.user_id);
      const { data: menteeProfiles } = await adminClient
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", menteeUserIds);

      const profileMap = new Map(menteeProfiles?.map(p => [p.user_id, p]) || []);
      menteesList = mentees.map(m => {
        const p = profileMap.get(m.user_id);
        return `- ${p?.full_name || "Sem nome"} (ID: ${m.id}, Email: ${p?.email || "N/A"})`;
      }).join("\n");
    }

    // Check if mentor has Google Calendar
    const { data: gcalToken } = await adminClient
      .from("google_calendar_tokens")
      .select("id, calendar_email")
      .eq("membership_id", membership_id)
      .maybeSingle();

    // Get upcoming events for context
    const today = new Date().toISOString().split("T")[0];
    const { data: upcomingEvents } = await adminClient
      .from("calendar_events")
      .select("title, event_date, event_time, event_type")
      .eq("tenant_id", tenant_id)
      .gte("event_date", today)
      .order("event_date")
      .limit(10);

    const eventsContext = upcomingEvents?.map(e => 
      `- ${e.title} em ${e.event_date}${e.event_time ? ` às ${e.event_time}` : ""} (${e.event_type})`
    ).join("\n") || "Nenhum evento próximo";

    const systemPrompt = `Você é o Assistente de Agendamento da mentoria "${mentorProfile?.full_name || "Mentor"}".

Seu papel é ajudar o mentor a agendar eventos, reuniões e sessões para seus mentorados.

CAPACIDADES:
- Criar eventos na plataforma e no Google Calendar do mentor${gcalToken ? ` (conectado: ${gcalToken.calendar_email})` : " (Google Calendar NÃO conectado)"}
- Atribuir mentorados aos eventos
- Configurar lembretes automáticos (WhatsApp + Email)
- Gerar Google Meet automaticamente

MENTORADOS DISPONÍVEIS:
${menteesList || "Nenhum mentorado cadastrado"}

PRÓXIMOS EVENTOS:
${eventsContext}

FLUXO DE AGENDAMENTO:
1. Pergunte qual tipo de evento (mentoria, reunião, live, treinamento, hotseat)
2. Pergunte data e horário
3. Pergunte quais mentorados participarão
4. Pergunte sobre lembretes (1h, 2h, 6h, 12h, 24h, 48h, 72h, 1 semana antes)
5. Pergunte se quer gerar link do Google Meet automaticamente
6. Confirme todos os detalhes antes de criar

Quando o mentor confirmar, responda com um bloco JSON especial no formato:
\`\`\`SCHEDULE_ACTION
{
  "action": "create_event",
  "title": "...",
  "description": "...",
  "event_date": "YYYY-MM-DD",
  "event_time": "HH:MM",
  "event_type": "mentoria|reuniao|live|treinamento|hotseat|geral",
  "mentee_ids": ["membership_id1", "membership_id2"],
  "reminder_intervals": ["24h", "1h"],
  "create_google_meet": true,
  "push_to_google": true,
  "send_whatsapp": true,
  "send_email": true
}
\`\`\`

REGRAS:
- Seja conversacional e amigável
- Use português brasileiro
- Sempre confirme antes de criar
- Se o mentor mencionar um nome, identifique o mentorado na lista
- Sugira horários inteligentes (evite conflitos com eventos existentes)
- Data de hoje: ${new Date().toLocaleDateString("pt-BR")}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversation_history,
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI error: ${aiRes.status} - ${errText}`);
    }

    // Stream response back
    return new Response(aiRes.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-schedule-agent error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
