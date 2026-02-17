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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: require authorization header (cron or admin call)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { tenant_id, inactivity_days = 5 } = await req.json().catch(() => ({ inactivity_days: 5 }));

    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, reason: "no_resend_key" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get tenants
    let tenants: { id: string }[];
    if (tenant_id) {
      tenants = [{ id: tenant_id }];
    } else {
      const { data } = await supabase.from("tenants").select("id");
      tenants = data || [];
    }

    const cutoff = new Date(Date.now() - inactivity_days * 24 * 60 * 60 * 1000).toISOString();
    let totalSent = 0;

    for (const tenant of tenants) {
      // Check if automation is enabled for this tenant
      const { data: automationConfig } = await supabase
        .from("tenant_automations")
        .select("id, is_enabled, config")
        .eq("tenant_id", tenant.id)
        .eq("automation_key", "re_engage_inactive")
        .maybeSingle();

      if (automationConfig && !automationConfig.is_enabled) continue;

      // Use tenant-specific inactivity_days from config if available
      const tenantInactivityDays = (automationConfig?.config as any)?.inactivity_days || inactivity_days;
      const tenantCutoff = new Date(Date.now() - tenantInactivityDays * 24 * 60 * 60 * 1000).toISOString();

      const branding = await getTenantBranding(supabase, tenant.id);

      // Get active mentees
      const { data: mentees } = await supabase
        .from("memberships")
        .select("id, user_id")
        .eq("tenant_id", tenant.id)
        .eq("role", "mentee")
        .eq("status", "active");

      if (!mentees?.length) continue;

      for (const mentee of mentees) {
        // Check last activity
        const { data: recentActivity } = await supabase
          .from("activity_logs")
          .select("id")
          .eq("membership_id", mentee.id)
          .gte("created_at", tenantCutoff)
          .limit(1);

        if (recentActivity?.length) continue; // Active, skip

        // Check we haven't already sent a re-engage email recently (7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentEmail } = await supabase
          .from("email_logs")
          .select("id")
          .eq("recipient_membership_id", mentee.id)
          .eq("subject", "re-engage")
          .gte("sent_at", weekAgo)
          .limit(1);

        if (recentEmail?.length) continue; // Already contacted recently

        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", mentee.user_id).single();
        if (!profile?.email) continue;

        const firstName = profile.full_name?.split(" ")[0] || "Mentorado";

        // Generate personalized message
        let messageHtml = "";
        if (lovableKey) {
          try {
            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "system", content: "Você é um coach empático. Gere um email de re-engajamento em HTML (h3, p, strong). Max 150 palavras. Tom: motivador mas não invasivo. NÃO use html/head/body." },
                  { role: "user", content: `${firstName} está inativo há ${inactivity_days}+ dias na plataforma de mentoria. Gere uma mensagem curta e empática para trazê-lo(a) de volta, mencionando que a consistência é mais importante que a intensidade.` },
                ],
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              messageHtml = aiData.choices?.[0]?.message?.content || "";
            }
          } catch (e) { console.error("AI re-engage error:", e); }
        }

        if (!messageHtml) {
          messageHtml = `<h3>👋 Olá ${firstName}, sentimos sua falta!</h3>
<p>Faz alguns dias que você não aparece por aqui. Sabemos que a rotina pode ser intensa, mas lembre-se:</p>
<p><strong>Consistência supera intensidade.</strong> Mesmo 10 minutos por dia fazem diferença.</p>
<p>Que tal dar uma olhada nas suas tarefas pendentes ou registrar um lead novo?</p>
<p>Estamos aqui para te apoiar! 🚀</p>`;
        }

        const logoSection = branding.logoUrl
          ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 40px; max-width: 180px;" />`
          : `<h1 style="font-size: 24px; color: ${branding.primaryColor}; margin: 0;">👋 Sentimos sua falta!</h1>`;

        const emailHtml = `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    ${logoSection}
    ${branding.logoUrl ? `<h1 style="font-size: 20px; color: ${branding.primaryColor}; margin: 12px 0 0;">👋 Sentimos sua falta!</h1>` : ''}
    <p style="color: #a1a1aa; font-size: 14px; margin-top: 8px;">${branding.name}</p>
  </div>
  <div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">${messageHtml}</div>
  <div style="text-align: center; margin-top: 24px;">
    <p style="color: #71717a; font-size: 12px;">© ${new Date().getFullYear()} ${branding.name}</p>
  </div>
</div>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: branding.fromEmail,
            to: [profile.email],
            subject: `👋 ${firstName}, sentimos sua falta!`,
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          // Log the email
          await supabase.from("email_logs").insert({
            recipient_email: profile.email,
            recipient_membership_id: mentee.id,
            subject: "re-engage",
            status: "sent",
            sent_at: new Date().toISOString(),
          });
          totalSent++;
        }
      }
    }

    // Update last_run status
    for (const tenant of tenants) {
      await supabase
        .from("tenant_automations")
        .update({ last_run_at: new Date().toISOString(), last_run_status: "success" })
        .eq("tenant_id", tenant.id)
        .eq("automation_key", "re_engage_inactive");
    }

    return new Response(JSON.stringify({ success: true, emails_sent: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("re-engage-inactive error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
