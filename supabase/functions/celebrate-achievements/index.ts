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
        .select("is_enabled")
        .eq("tenant_id", tenant.id)
        .eq("automation_key", "celebrate_achievements")
        .maybeSingle();

      if (automationConfig && !automationConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // 1. New certificates (trail completions)
      const { data: recentCerts } = await supabase
        .from("certificates")
        .select("id, membership_id, trail_id, issued_at")
        .gte("issued_at", oneDayAgo);

      if (recentCerts?.length) {
        for (const cert of recentCerts) {
          // Check already notified
          const { data: alreadySent } = await supabase
            .from("email_logs")
            .select("id")
            .eq("recipient_membership_id", cert.membership_id)
            .eq("subject", `celebrate-cert-${cert.id}`)
            .limit(1);
          if (alreadySent?.length) continue;

          const { data: membership } = await supabase.from("memberships").select("user_id, tenant_id").eq("id", cert.membership_id).single();
          if (!membership || membership.tenant_id !== tenant.id) continue;

          const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", membership.user_id).single();
          if (!profile?.email) continue;

          const { data: trail } = await supabase.from("trails").select("title").eq("id", cert.trail_id).single();
          const firstName = profile.full_name?.split(" ")[0] || "Mentorado";

          const emailHtml = `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 40px; max-width: 180px;" />` : ''}
    <h1 style="font-size: 48px; margin: 16px 0 0;">🏆</h1>
    <h2 style="font-size: 20px; color: ${branding.primaryColor}; margin: 8px 0 0;">Parabéns, ${firstName}!</h2>
  </div>
  <div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a; text-align: center;">
    <p>Você completou a trilha:</p>
    <h3 style="color: ${branding.primaryColor}; font-size: 18px;">${trail?.title || "Trilha"}</h3>
    <p>Seu certificado já está disponível na plataforma! 🎓</p>
    <p style="color: #a1a1aa; font-size: 14px; margin-top: 16px;">Continue assim — cada conquista te aproxima do próximo nível! 🚀</p>
  </div>
  <div style="text-align: center; margin-top: 24px;"><p style="color: #71717a; font-size: 12px;">© ${new Date().getFullYear()} ${branding.name}</p></div>
</div>`;

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: branding.fromEmail, to: [profile.email], subject: `🏆 ${firstName}, parabéns pela conquista!`, html: emailHtml }),
          });

          if (emailRes.ok) {
            await supabase.from("email_logs").insert({ recipient_email: profile.email, recipient_membership_id: cert.membership_id, subject: `celebrate-cert-${cert.id}`, status: "sent", sent_at: new Date().toISOString() });
            totalSent++;
          } else { await emailRes.text(); }
        }
      }

      // 2. New badges
      const { data: recentBadges } = await supabase
        .from("user_badges")
        .select("id, membership_id, badge_id, unlocked_at")
        .gte("unlocked_at", oneDayAgo);

      if (recentBadges?.length) {
        for (const ub of recentBadges) {
          const { data: alreadySent } = await supabase
            .from("email_logs")
            .select("id")
            .eq("recipient_membership_id", ub.membership_id)
            .eq("subject", `celebrate-badge-${ub.id}`)
            .limit(1);
          if (alreadySent?.length) continue;

          const { data: membership } = await supabase.from("memberships").select("user_id, tenant_id").eq("id", ub.membership_id).single();
          if (!membership || membership.tenant_id !== tenant.id) continue;

          const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", membership.user_id).single();
          if (!profile?.email) continue;

          const { data: badge } = await supabase.from("badges").select("name, icon_url").eq("id", ub.badge_id).single();
          const firstName = profile.full_name?.split(" ")[0] || "Mentorado";

          const emailHtml = `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 40px; max-width: 180px;" />` : ''}
    <h1 style="font-size: 48px; margin: 16px 0 0;">🏅</h1>
    <h2 style="font-size: 20px; color: ${branding.primaryColor}; margin: 8px 0 0;">Nova Medalha Desbloqueada!</h2>
  </div>
  <div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a; text-align: center;">
    <p>Parabéns, ${firstName}! Você desbloqueou:</p>
    ${badge?.icon_url ? `<img src="${badge.icon_url}" alt="${badge?.name}" style="width: 64px; height: 64px; margin: 16px auto;" />` : ''}
    <h3 style="color: ${branding.primaryColor}; font-size: 18px;">${badge?.name || "Medalha"}</h3>
    <p style="color: #a1a1aa; font-size: 14px; margin-top: 16px;">Continue desbloqueando conquistas! 💪</p>
  </div>
  <div style="text-align: center; margin-top: 24px;"><p style="color: #71717a; font-size: 12px;">© ${new Date().getFullYear()} ${branding.name}</p></div>
</div>`;

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: branding.fromEmail, to: [profile.email], subject: `🏅 ${firstName}, nova medalha desbloqueada!`, html: emailHtml }),
          });

          if (emailRes.ok) {
            await supabase.from("email_logs").insert({ recipient_email: profile.email, recipient_membership_id: ub.membership_id, subject: `celebrate-badge-${ub.id}`, status: "sent", sent_at: new Date().toISOString() });
            totalSent++;
          } else { await emailRes.text(); }
        }
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "celebrate_achievements");
    }

    return new Response(JSON.stringify({ success: true, celebrations_sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("celebrate-achievements error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
