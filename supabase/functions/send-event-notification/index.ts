import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function buildEventEmailHtml(branding: TenantBranding, event: any, reminderLabel: string): string {
  const logoSection = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height:40px;margin-bottom:16px;" />`
    : `<h2 style="color:${branding.primaryColor};margin:0 0 16px;">${branding.name}</h2>`;

  const meetingSection = event.meeting_url
    ? `<a href="${event.meeting_url}" style="display:inline-block;background:${branding.primaryColor};color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Entrar na Reunião</a>`
    : "";

  const timeStr = event.event_time ? event.event_time.slice(0, 5) : "Dia todo";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
<div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:${branding.primaryColor};padding:24px 32px;text-align:center;">${logoSection}</div>
  <div style="padding:32px;">
    <div style="display:inline-block;background:${branding.primaryColor}15;color:${branding.primaryColor};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:16px;">⏰ Lembrete: ${reminderLabel}</div>
    <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">${event.title}</h1>
    <div style="display:flex;gap:16px;margin:16px 0;color:#71717a;font-size:14px;">
      <span>📅 ${event.event_date}</span>
      <span>🕐 ${timeStr}</span>
    </div>
    ${event.description ? `<p style="color:#52525b;font-size:14px;line-height:1.6;margin:16px 0;padding:12px 16px;background:#f9fafb;border-radius:8px;">${event.description}</p>` : ""}
    ${meetingSection}
  </div>
  <div style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;font-size:11px;color:#a1a1aa;">
    Enviado por ${branding.name}
  </div>
</div></body></html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const resend = new Resend(RESEND_API_KEY);

  try {
    const { event_id, tenant_id, remind_before_label } = await req.json();

    if (!event_id || !tenant_id) throw new Error("event_id and tenant_id required");

    // Fetch event
    const { data: event, error: eventErr } = await supabase.from("calendar_events").select("*").eq("id", event_id).single();
    if (eventErr || !event) throw new Error("Event not found");

    // Fetch branding
    const branding = await getTenantBranding(supabase, tenant_id);

    // Determine recipients based on audience
    let recipientEmails: string[] = [];
    const audienceType = event.audience_type || "all_mentees";

    if (audienceType === "staff_only") {
      // Send to staff members
      const { data: staffMembers } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("tenant_id", tenant_id)
        .eq("status", "active")
        .in("role", ["admin", "mentor", "ops", "master_admin"]);
      
      const userIds = (staffMembers || []).map((m: any) => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, email:id").in("id", userIds);
        // Get emails from auth
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        recipientEmails = (users || []).filter((u: any) => userIds.includes(u.id) && u.email).map((u: any) => u.email);
      }
    } else if (audienceType === "specific" && event.audience_membership_ids?.length > 0) {
      // Send to specific members
      const { data: members } = await supabase
        .from("memberships")
        .select("user_id")
        .in("id", event.audience_membership_ids);
      
      const userIds = (members || []).map((m: any) => m.user_id);
      if (userIds.length > 0) {
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        recipientEmails = (users || []).filter((u: any) => userIds.includes(u.id) && u.email).map((u: any) => u.email);
      }
    } else {
      // all_mentees: send to all active mentees + staff
      const { data: allMembers } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("tenant_id", tenant_id)
        .eq("status", "active");
      
      const userIds = (allMembers || []).map((m: any) => m.user_id);
      if (userIds.length > 0) {
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        recipientEmails = (users || []).filter((u: any) => userIds.includes(u.id) && u.email).map((u: any) => u.email);
      }
    }

    if (recipientEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No recipients found" }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const html = buildEventEmailHtml(branding, event, remind_before_label || "Em breve");

    // Send in batches of 50
    let sent = 0;
    for (let i = 0; i < recipientEmails.length; i += 50) {
      const batch = recipientEmails.slice(i, i + 50);
      try {
        await resend.emails.send({
          from: branding.fromEmail,
          to: batch,
          subject: `⏰ Lembrete: ${event.title}`,
          html,
        });
        sent += batch.length;
      } catch (e) {
        console.error("Batch send error:", e);
      }
    }

    return new Response(JSON.stringify({ success: true, sent, total_recipients: recipientEmails.length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
