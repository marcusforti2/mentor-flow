import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TenantBranding { name: string; logoUrl: string | null; primaryColor: string; fromEmail: string; }
const DEFAULT_BRANDING: TenantBranding = { name: "MentorFlow.io", logoUrl: null, primaryColor: "#d4af37", fromEmail: "MentorFlow.io <noreply@equipe.aceleracaoforti.online>" };

async function getTenantBranding(supabase: any, tenantId: string): Promise<TenantBranding> {
  try {
    const { data: tenant } = await supabase.from("tenants").select("name, logo_url, brand_attributes").eq("id", tenantId).maybeSingle();
    if (!tenant) return DEFAULT_BRANDING;
    const attrs = tenant.brand_attributes || {};
    const brandName = tenant.name || DEFAULT_BRANDING.name;
    return { name: brandName, logoUrl: tenant.logo_url || null, primaryColor: attrs.primary_color || "#d4af37", fromEmail: `${brandName} <noreply@equipe.aceleracaoforti.online>` };
  } catch { return DEFAULT_BRANDING; }
}

async function sendWhatsApp(supabase: any, tenantId: string, phone: string, message: string) {
  try {
    const { data: config } = await supabase.from("tenant_whatsapp_config").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (!config?.ultramsg_instance_id || !config?.ultramsg_token || !config?.is_active) return;
    await fetch(`https://api.ultramsg.com/${config.ultramsg_instance_id}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: config.ultramsg_token, to: phone, body: message }),
    });
  } catch {}
}

async function callAI(lovableKey: string, prompt: string): Promise<string> {
  try {
    const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: prompt }], max_tokens: 800 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch { return ""; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { tenant_id } = await req.json().catch(() => ({}));
    const tenants = tenant_id ? [{ id: tenant_id }] : ((await supabase.from("tenants").select("id")).data || []);
    let totalSent = 0;

    for (const tenant of tenants) {
      const { data: autoConfig } = await supabase.from("tenant_automations").select("id, is_enabled, config").eq("tenant_id", tenant.id).eq("automation_key", "meeting_prep_briefing").maybeSingle();
      if (autoConfig && !autoConfig.is_enabled) continue;

      const hoursBefore = (autoConfig?.config as any)?.hours_before || 24;
      const branding = await getTenantBranding(supabase, tenant.id);

      // Find meetings within the next X hours
      const now = new Date();
      const windowEnd = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);
      const today = now.toISOString().split("T")[0];
      const tomorrow = windowEnd.toISOString().split("T")[0];

      const { data: events } = await supabase
        .from("calendar_events")
        .select("id, title, event_date, event_time, audience_membership_ids, owner_membership_id, meeting_url")
        .eq("tenant_id", tenant.id)
        .gte("event_date", today)
        .lte("event_date", tomorrow);

      if (!events?.length) continue;

      for (const event of events) {
        // Check if event is within window
        const eventDateTime = new Date(`${event.event_date}T${event.event_time || "09:00"}:00`);
        if (eventDateTime < now || eventDateTime > windowEnd) continue;

        // Get mentor (owner) profile
        const mentorMembershipId = event.owner_membership_id;
        if (!mentorMembershipId) continue;

        const { data: mentorMembership } = await supabase.from("memberships").select("user_id").eq("id", mentorMembershipId).maybeSingle();
        if (!mentorMembership) continue;
        const { data: mentorProfile } = await supabase.from("profiles").select("email, full_name, phone").eq("user_id", mentorMembership.user_id).maybeSingle();

        // Get attendee mentees
        const attendeeIds = event.audience_membership_ids || [];
        if (!attendeeIds.length) continue;

        const briefings: string[] = [];

        for (const attendeeId of attendeeIds.slice(0, 5)) {
          const { data: aMembership } = await supabase.from("memberships").select("id, user_id").eq("id", attendeeId).maybeSingle();
          if (!aMembership) continue;
          const { data: aProfile } = await supabase.from("profiles").select("full_name, business_profile").eq("user_id", aMembership.user_id).maybeSingle();

          // Get mentee metrics
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { count: tasksDone } = await supabase.from("campan_tasks").select("id", { count: "exact", head: true }).eq("mentorado_membership_id", attendeeId).eq("status_column", "done").gte("updated_at", sevenDaysAgo);
          const { count: tasksOverdue } = await supabase.from("campan_tasks").select("id", { count: "exact", head: true }).eq("mentorado_membership_id", attendeeId).lt("due_date", now.toISOString()).neq("status_column", "done");
          const { count: newLeads } = await supabase.from("crm_prospections").select("id", { count: "exact", head: true }).eq("membership_id", attendeeId).gte("created_at", sevenDaysAgo);

          const bp = aProfile?.business_profile as any;
          briefings.push(`👤 ${aProfile?.full_name || "Mentorado"}\n  • Nicho: ${bp?.niche || bp?.segment || "-"}\n  • Tarefas concluídas (7d): ${tasksDone || 0}\n  • Tarefas atrasadas: ${tasksOverdue || 0}\n  • Leads novos (7d): ${newLeads || 0}`);
        }

        const fullBriefing = briefings.join("\n\n");

        let aiPrepTips = "";
        if (lovableKey && briefings.length) {
          aiPrepTips = await callAI(lovableKey, `Você é um coach de mentores. Com base nestes dados dos mentorados que participarão de uma sessão, gere 3-5 pontos de pauta sugeridos e perguntas-chave para o mentor abordar. Em português, seja prático:\n\nReunião: ${event.title}\n\n${fullBriefing}`);
        }

        // Send briefing to mentor
        if (mentorProfile) {
          if (resendKey && mentorProfile.email) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
              body: JSON.stringify({
                from: branding.fromEmail,
                to: [mentorProfile.email],
                subject: `📅 Briefing: ${event.title} — ${branding.name}`,
                html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:${branding.primaryColor}">📅 Prep de Reunião</h2><p>Olá ${mentorProfile.full_name || ""},</p><p>Sua sessão <strong>"${event.title}"</strong> acontece em breve (${event.event_date} às ${event.event_time || "09:00"}).</p><h3>Participantes</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;">${fullBriefing}</pre>${aiPrepTips ? `<h3>💡 Sugestões de Pauta</h3><p style="white-space:pre-wrap;">${aiPrepTips}</p>` : ""}${event.meeting_url ? `<p><a href="${event.meeting_url}" style="color:${branding.primaryColor}">🔗 Link da Reunião</a></p>` : ""}<p style="color:#888;font-size:12px;">Enviado por ${branding.name}</p></div>`,
              }),
            });
          }

          if (mentorProfile.phone) {
            const shortBriefing = briefings.slice(0, 3).map(b => b.split("\n")[0]).join("\n");
            await sendWhatsApp(supabase, tenant.id, mentorProfile.phone, `📅 *${branding.name} — Prep de Reunião*\n\n*${event.title}*\n${event.event_date} às ${event.event_time || "09:00"}\n\nParticipantes:\n${shortBriefing}\n\n${aiPrepTips ? `💡 ${aiPrepTips.slice(0, 300)}...` : ""}\n\nBriefing completo no seu email!`);
          }

          totalSent++;
        }
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "meeting_prep_briefing");
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
