import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── White-label branding helper ──
interface TenantBranding { name: string; logoUrl: string | null; primaryColor: string; fromEmail: string; }
const DEFAULT_BRANDING: TenantBranding = { name: "MentorFlow.io", logoUrl: null, primaryColor: "#d4af37", fromEmail: "MentorFlow.io <noreply@equipe.aceleracaoforti.online>" };

async function getTenantBranding(supabase: any, tenantId: string | null): Promise<TenantBranding> {
  if (!tenantId) return DEFAULT_BRANDING;
  try {
    const { data: tenant } = await supabase.from("tenants").select("name, logo_url, brand_attributes").eq("id", tenantId).maybeSingle();
    if (!tenant) return DEFAULT_BRANDING;
    const attrs = tenant.brand_attributes || {};
    const brandName = tenant.name || DEFAULT_BRANDING.name;
    return { name: brandName, logoUrl: tenant.logo_url || null, primaryColor: attrs.primary_color || "#d4af37", fromEmail: `${brandName} <noreply@equipe.aceleracaoforti.online>` };
  } catch { return DEFAULT_BRANDING; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mentor_membership_id, mentee_membership_id, scheduled_at, duration_minutes } = await req.json();
    if (!mentor_membership_id || !mentee_membership_id || !scheduled_at) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get mentor info
    const { data: mentorMembership } = await supabase.from("memberships").select("user_id, tenant_id").eq("id", mentor_membership_id).single();
    if (!mentorMembership) return new Response(JSON.stringify({ error: "Mentor not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: mentorProfile } = await supabase.from("profiles").select("full_name, email").eq("user_id", mentorMembership.user_id).single();

    // Get mentee info
    const { data: menteeMembership } = await supabase.from("memberships").select("user_id").eq("id", mentee_membership_id).single();
    let menteeName = "Mentorado";
    let menteeEmail = "";
    if (menteeMembership) {
      const { data: menteeProfile } = await supabase.from("profiles").select("full_name, email").eq("user_id", menteeMembership.user_id).single();
      menteeName = menteeProfile?.full_name || "Mentorado";
      menteeEmail = menteeProfile?.email || "";
    }

    if (!mentorProfile?.email) return new Response(JSON.stringify({ error: "Mentor email not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch tenant branding
    const branding = await getTenantBranding(supabase, mentorMembership.tenant_id || null);

    const date = new Date(scheduled_at);
    const formatted = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

    if (!resendKey) {
      console.log("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const logoSection = branding.logoUrl
      ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 36px; max-width: 160px; margin-bottom: 12px;" />`
      : `<div style="font-size: 20px; font-weight: 700; color: ${branding.primaryColor}; margin-bottom: 12px;">${branding.name}</div>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: branding.fromEmail,
        to: [mentorProfile.email],
        subject: `📅 Nova sessão agendada — ${menteeName}`,
        html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          ${logoSection}
          <h2 style="color: #1a1a2e;">Nova sessão agendada!</h2>
          <p>Olá, <strong>${mentorProfile.full_name || "Mentor"}</strong>!</p>
          <p><strong>${menteeName}</strong>${menteeEmail ? ` (${menteeEmail})` : ''} agendou uma sessão com você:</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${branding.primaryColor};">
            <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${formatted}</p>
            <p style="margin: 4px 0;"><strong>⏱ Duração:</strong> ${duration_minutes || 60} minutos</p>
          </div>
          <p style="color: #666; font-size: 14px;">Acesse a plataforma para ver os detalhes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">© ${new Date().getFullYear()} ${branding.name}</p>
        </div>`,
      }),
    });

    const emailData = await emailRes.json();
    console.log("Email sent:", emailData);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
