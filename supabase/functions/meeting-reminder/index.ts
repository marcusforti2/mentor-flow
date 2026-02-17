import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TenantBranding { name: string; logoUrl: string | null; primaryColor: string; fromEmail: string; }
const DEFAULT_BRANDING: TenantBranding = { name: "MentorFlow.io", logoUrl: null, primaryColor: "#d4af37", fromEmail: "MentorFlow.io <noreply@equipe.aceleracaoforti.online>" };

async function getTenantBranding(sb: any, tenantId: string): Promise<TenantBranding> {
  try {
    const { data: tenant } = await sb.from("tenants").select("name, logo_url, brand_attributes").eq("id", tenantId).maybeSingle();
    if (!tenant) return DEFAULT_BRANDING;
    const attrs = tenant.brand_attributes || {};
    const brandName = tenant.name || DEFAULT_BRANDING.name;
    return { name: brandName, logoUrl: tenant.logo_url || null, primaryColor: attrs.primary_color || "#d4af37", fromEmail: `${brandName} <noreply@equipe.aceleracaoforti.online>` };
  } catch { return DEFAULT_BRANDING; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, reason: "no_resend_key" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id } = body;

    let tenants: { id: string }[];
    if (tenant_id) {
      tenants = [{ id: tenant_id }];
    } else {
      const { data } = await supabase.from("tenants").select("id");
      tenants = data || [];
    }

    let totalSent = 0;

    for (const tenant of tenants) {
      const { data: automationConfig } = await supabase
        .from("tenant_automations")
        .select("is_enabled, config")
        .eq("tenant_id", tenant.id)
        .eq("automation_key", "meeting_reminder")
        .maybeSingle();

      if (automationConfig && !automationConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);
      const reminderHours = (automationConfig?.config as any)?.hours_before || 24;

      // Find events happening within the reminder window
      const now = new Date();
      const windowEnd = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);

      const { data: upcomingEvents } = await supabase
        .from("calendar_events")
        .select("id, title, event_date, event_time, meeting_url, audience_type, audience_membership_ids")
        .eq("tenant_id", tenant.id)
        .gte("event_date", now.toISOString().split("T")[0])
        .lte("event_date", windowEnd.toISOString().split("T")[0]);

      if (!upcomingEvents?.length) continue;

      for (const event of upcomingEvents) {
        // Build event datetime
        const eventDateTime = new Date(`${event.event_date}T${event.event_time || "09:00"}:00`);
        if (eventDateTime <= now || eventDateTime > windowEnd) continue;

        // Check if reminder already sent for this event
        const { data: alreadySent } = await supabase
          .from("email_logs")
          .select("id")
          .eq("subject", `meeting-reminder-${event.id}`)
          .limit(1);

        if (alreadySent?.length) continue;

        // Get recipients
        let recipientMembershipIds: string[] = [];
        if (event.audience_type === "all_mentees") {
          const { data: mentees } = await supabase
            .from("memberships")
            .select("id")
            .eq("tenant_id", tenant.id)
            .eq("role", "mentee")
            .eq("status", "active");
          recipientMembershipIds = mentees?.map((m: any) => m.id) || [];
        } else if (event.audience_membership_ids?.length) {
          recipientMembershipIds = event.audience_membership_ids;
        }

        if (!recipientMembershipIds.length) continue;

        // Get user details
        const { data: memberships } = await supabase
          .from("memberships")
          .select("id, user_id")
          .in("id", recipientMembershipIds);

        if (!memberships?.length) continue;

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", memberships.map((m: any) => m.user_id));

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        const formattedDate = eventDateTime.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
        const formattedTime = eventDateTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        for (const membership of memberships) {
          const profile = profileMap.get(membership.user_id);
          if (!profile?.email) continue;

          const firstName = profile.full_name?.split(" ")[0] || "Mentorado";

          const meetingLink = event.meeting_url
            ? `<p style="text-align:center;margin-top:16px;"><a href="${event.meeting_url}" style="background:${branding.primaryColor};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Entrar na Reunião</a></p>`
            : "";

          const emailHtml = `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 40px; max-width: 180px;" />` : ''}
    <h1 style="font-size: 20px; color: ${branding.primaryColor}; margin: 12px 0 0;">📅 Lembrete de Reunião</h1>
    <p style="color: #a1a1aa; font-size: 14px; margin-top: 8px;">${branding.name}</p>
  </div>
  <div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">
    <h3 style="color: #fafafa; margin-top: 0;">Olá ${firstName}!</h3>
    <p>Você tem uma reunião agendada:</p>
    <div style="background: #27272a; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; font-weight: bold; color: ${branding.primaryColor};">${event.title}</p>
      <p style="margin: 8px 0 0; color: #a1a1aa;">📅 ${formattedDate}</p>
      <p style="margin: 4px 0 0; color: #a1a1aa;">🕐 ${formattedTime}</p>
    </div>
    ${meetingLink}
  </div>
  <div style="text-align: center; margin-top: 24px;"><p style="color: #71717a; font-size: 12px;">© ${new Date().getFullYear()} ${branding.name}</p></div>
</div>`;

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: branding.fromEmail, to: [profile.email], subject: `📅 Lembrete: ${event.title} — ${formattedDate} às ${formattedTime}`, html: emailHtml }),
          });

          if (emailRes.ok) {
            await supabase.from("email_logs").insert({ recipient_email: profile.email, recipient_membership_id: membership.id, subject: `meeting-reminder-${event.id}`, status: "sent", sent_at: new Date().toISOString() });
            totalSent++;
          } else { await emailRes.text(); }
        }
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "meeting_reminder");
    }

    return new Response(JSON.stringify({ success: true, reminders_sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("meeting-reminder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
