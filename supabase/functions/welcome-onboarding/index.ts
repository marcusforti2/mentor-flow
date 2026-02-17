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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
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
        .eq("automation_key", "welcome_onboarding")
        .maybeSingle();

      if (automationConfig && !automationConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);

      // Find recently accepted invites (last 24h) that haven't received welcome email
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: newMentees } = await supabase
        .from("memberships")
        .select("id, user_id, created_at")
        .eq("tenant_id", tenant.id)
        .eq("role", "mentee")
        .eq("status", "active")
        .gte("created_at", oneDayAgo);

      if (!newMentees?.length) continue;

      for (const mentee of newMentees) {
        // Check if welcome already sent
        const { data: alreadySent } = await supabase
          .from("email_logs")
          .select("id")
          .eq("recipient_membership_id", mentee.id)
          .eq("subject", "welcome-onboarding")
          .limit(1);

        if (alreadySent?.length) continue;

        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", mentee.user_id).single();
        if (!profile?.email) continue;

        const firstName = profile.full_name?.split(" ")[0] || "Mentorado";

        let messageHtml = "";
        if (lovableKey) {
          try {
            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "system", content: `Você é um coach de mentoria. Gere um email de boas-vindas em HTML (h3, p, ul, li, strong) para um novo mentorado. Tom: caloroso, motivador. Max 200 palavras. Inclua 3 primeiros passos recomendados. NÃO use html/head/body. A plataforma se chama "${branding.name}".` },
                  { role: "user", content: `Boas-vindas para ${firstName} que acabou de entrar na plataforma de mentoria.` },
                ],
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              messageHtml = aiData.choices?.[0]?.message?.content || "";
            }
          } catch (e) { console.error("AI welcome error:", e); }
        }

        if (!messageHtml) {
          messageHtml = `<h3>🎉 Bem-vindo(a), ${firstName}!</h3>
<p>Estamos muito felizes em ter você na <strong>${branding.name}</strong>!</p>
<h4>Seus primeiros passos:</h4>
<ul>
  <li>📋 Complete seu perfil de negócio</li>
  <li>📚 Explore as trilhas de aprendizado</li>
  <li>🎯 Cadastre seus primeiros leads no CRM</li>
</ul>
<p><strong>Consistência é a chave do sucesso.</strong> Estamos aqui para te apoiar! 🚀</p>`;
        }

        const logoSection = branding.logoUrl
          ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 40px; max-width: 180px;" />`
          : `<h1 style="font-size: 24px; color: ${branding.primaryColor}; margin: 0;">🎉 Bem-vindo(a)!</h1>`;

        const emailHtml = `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    ${logoSection}
    ${branding.logoUrl ? `<h1 style="font-size: 20px; color: ${branding.primaryColor}; margin: 12px 0 0;">🎉 Bem-vindo(a)!</h1>` : ''}
    <p style="color: #a1a1aa; font-size: 14px; margin-top: 8px;">${branding.name}</p>
  </div>
  <div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">${messageHtml}</div>
  <div style="text-align: center; margin-top: 24px;"><p style="color: #71717a; font-size: 12px;">© ${new Date().getFullYear()} ${branding.name}</p></div>
</div>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: branding.fromEmail, to: [profile.email], subject: `🎉 ${firstName}, bem-vindo(a) à ${branding.name}!`, html: emailHtml }),
        });

        if (emailRes.ok) {
          await supabase.from("email_logs").insert({ recipient_email: profile.email, recipient_membership_id: mentee.id, subject: "welcome-onboarding", status: "sent", sent_at: new Date().toISOString() });
          totalSent++;
        } else { await emailRes.text(); }
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "welcome_onboarding");
    }

    return new Response(JSON.stringify({ success: true, emails_sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("welcome-onboarding error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
