import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TenantBranding { name: string; logoUrl: string | null; primaryColor: string; fromEmail: string; }
const DEFAULT_BRANDING: TenantBranding = { name: "MentorFlow.io", logoUrl: null, primaryColor: "#d4af37", fromEmail: "MentorFlow.io <noreply@equipe.aceleracaoforti.online>" };

async function getTenantBranding(sb: any, tenantId: string | null): Promise<TenantBranding> {
  if (!tenantId) return DEFAULT_BRANDING;
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

    const body = await req.json().catch(() => ({}));
    const isCronMode = !body.membership_id;

    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, reason: "no_resend_key" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === CRON MODE: iterate all tenants ===
    if (isCronMode) {
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
          .eq("automation_key", "send_prospection_tips")
          .maybeSingle();

        if (automationConfig && !automationConfig.is_enabled) continue;

        const branding = await getTenantBranding(supabase, tenant.id);

        // Get mentees with business profiles
        const { data: mentees } = await supabase
          .from("memberships")
          .select("id, user_id")
          .eq("tenant_id", tenant.id)
          .eq("role", "mentee")
          .eq("status", "active");

        if (!mentees?.length) continue;

        for (const mentee of mentees) {
          const { data: bp } = await supabase.from("mentee_profiles").select("business_name, business_profile").eq("membership_id", mentee.id).maybeSingle();
          if (!bp) continue;

          const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", mentee.user_id).single();
          if (!profile?.email) continue;

          // Check we haven't sent tips recently (7 days)
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: recentEmail } = await supabase
            .from("email_logs")
            .select("id")
            .eq("recipient_membership_id", mentee.id)
            .eq("subject", "prospection-tips")
            .gte("sent_at", weekAgo)
            .limit(1);
          if (recentEmail?.length) continue;

          const firstName = profile.full_name?.split(" ")[0] || "Mentorado";
          let aiTips = "";

          if (lovableKey) {
            try {
              const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-lite",
                  messages: [
                    { role: "system", content: "Você é um coach de vendas. Gere 3 dicas práticas de prospecção em HTML (h3, ul, li, strong). Max 150 palavras. NÃO use html/head/body." },
                    { role: "user", content: `Dicas de prospecção para ${firstName}. Negócio: ${bp.business_name || "não informado"}.` },
                  ],
                }),
              });
              if (aiRes.ok) {
                const aiData = await aiRes.json();
                aiTips = aiData.choices?.[0]?.message?.content || "";
              }
            } catch (e) { console.error("AI error:", e); }
          }

          if (!aiTips) {
            aiTips = `<h3>🎯 Dicas de Prospecção</h3>
<ul>
  <li><strong>Bloqueie horários fixos</strong> para prospecção diária</li>
  <li><strong>Use a regra dos 5 minutos</strong> — comece e o momentum vem</li>
  <li><strong>Registre cada contato</strong> no CRM para medir progresso</li>
</ul>`;
          }

          const logoSection = branding.logoUrl
            ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 40px; max-width: 180px;" />`
            : `<h1 style="font-size: 24px; color: ${branding.primaryColor}; margin: 0;">🎯 Dicas de Prospecção</h1>`;

          const emailHtml = `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    ${logoSection}
    ${branding.logoUrl ? `<h1 style="font-size: 20px; color: ${branding.primaryColor}; margin: 12px 0 0;">🎯 Dicas de Prospecção</h1>` : ''}
    <p style="color: #a1a1aa; font-size: 14px; margin-top: 8px;">${branding.name}</p>
  </div>
  <div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">${aiTips}</div>
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
              subject: `🎯 ${firstName}, dicas de prospecção para você!`,
              html: emailHtml,
            }),
          });

          if (emailRes.ok) {
            await supabase.from("email_logs").insert({
              recipient_email: profile.email,
              recipient_membership_id: mentee.id,
              subject: "prospection-tips",
              status: "sent",
              sent_at: new Date().toISOString(),
            });
            totalSent++;
          } else {
            await emailRes.text();
          }
        }

        await supabase
          .from("tenant_automations")
          .update({ last_run_at: new Date().toISOString(), last_run_status: "success" })
          .eq("tenant_id", tenant.id)
          .eq("automation_key", "send_prospection_tips");
      }

      return new Response(JSON.stringify({ success: true, emails_sent: totalSent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === MANUAL MODE: specific membership_id (requires auth) ===
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: ownerCheck } = await supabase
      .from("memberships")
      .select("id, tenant_id, user_id")
      .eq("id", body.membership_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!ownerCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", ownerCheck.user_id).single();
    if (!profile?.email) throw new Error("Email not found");

    const branding = await getTenantBranding(supabase, ownerCheck.tenant_id);
    const firstName = profile.full_name?.split(" ")[0] || "Mentorado";

    let aiTips = "";
    if (lovableKey) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Você é um coach de vendas. Gere 3 dicas práticas de prospecção em HTML (h3, ul, li, strong). Max 150 palavras. NÃO use html/head/body." },
              { role: "user", content: `Dicas para ${firstName}.` },
            ],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          aiTips = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) { console.error("AI error:", e); }
    }

    if (!aiTips) {
      aiTips = `<h3>🎯 Dicas de Prospecção</h3><ul><li><strong>Bloqueie horários fixos</strong></li><li><strong>Use a regra dos 5 minutos</strong></li><li><strong>Registre cada contato</strong> no CRM</li></ul>`;
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: branding.fromEmail,
        to: [profile.email],
        subject: `🎯 ${firstName}, dicas de prospecção para você!`,
        html: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;"><div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">${aiTips}</div></div>`,
      }),
    });

    const emailResult = await emailRes.json();
    return new Response(JSON.stringify({ success: true, email_sent: emailRes.ok, result: emailResult }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-prospection-tips error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
