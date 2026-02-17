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
        .eq("automation_key", "monthly_mentor_report")
        .maybeSingle();

      if (automationConfig && !automationConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);

      // Get mentors/admins
      const { data: mentors } = await supabase
        .from("memberships")
        .select("id, user_id")
        .eq("tenant_id", tenant.id)
        .in("role", ["admin", "mentor"])
        .eq("status", "active");

      if (!mentors?.length) continue;

      // Collect stats for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: mentees } = await supabase
        .from("memberships")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("role", "mentee")
        .eq("status", "active");

      const totalMentees = mentees?.length || 0;

      const { count: totalActivities } = await supabase
        .from("activity_logs")
        .select("id", { count: "exact" })
        .eq("tenant_id", tenant.id)
        .gte("created_at", thirtyDaysAgo);

      const { count: totalLeads } = await supabase
        .from("crm_prospections")
        .select("id", { count: "exact" })
        .eq("tenant_id", tenant.id)
        .gte("created_at", thirtyDaysAgo);

      const { count: totalCerts } = await supabase
        .from("certificates")
        .select("id", { count: "exact" })
        .gte("issued_at", thirtyDaysAgo);

      // Active mentees (with activity in last 30 days)
      const { data: activeMenteeIds } = await supabase
        .from("activity_logs")
        .select("membership_id")
        .eq("tenant_id", tenant.id)
        .gte("created_at", thirtyDaysAgo);

      const uniqueActive = new Set(activeMenteeIds?.map((a: any) => a.membership_id) || []);
      const activeRate = totalMentees > 0 ? Math.round((uniqueActive.size / totalMentees) * 100) : 0;

      for (const mentor of mentors) {
        // Check if already sent this month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { data: alreadySent } = await supabase
          .from("email_logs")
          .select("id")
          .eq("recipient_membership_id", mentor.id)
          .eq("subject", "monthly-mentor-report")
          .gte("sent_at", monthStart.toISOString())
          .limit(1);

        if (alreadySent?.length) continue;

        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", mentor.user_id).single();
        if (!profile?.email) continue;

        const firstName = profile.full_name?.split(" ")[0] || "Mentor";
        const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

        let aiSummary = "";
        if (lovableKey) {
          try {
            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "system", content: "Você é um analista de mentoria. Gere um parágrafo de análise (max 100 palavras) em HTML (p, strong) com insights e recomendações baseados nos dados. Tom: profissional e encorajador. NÃO use html/head/body." },
                  { role: "user", content: `Dados do mês: ${totalMentees} mentorados, ${activeRate}% ativos, ${totalActivities || 0} atividades, ${totalLeads || 0} leads criados, ${totalCerts || 0} certificações. Analise.` },
                ],
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              aiSummary = aiData.choices?.[0]?.message?.content || "";
            }
          } catch (e) { console.error("AI report error:", e); }
        }

        const statsHtml = `
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0;">
  <div style="background: #27272a; padding: 16px; border-radius: 8px; text-align: center;">
    <p style="font-size: 28px; font-weight: bold; color: ${branding.primaryColor}; margin: 0;">${totalMentees}</p>
    <p style="color: #a1a1aa; font-size: 12px; margin: 4px 0 0;">Mentorados</p>
  </div>
  <div style="background: #27272a; padding: 16px; border-radius: 8px; text-align: center;">
    <p style="font-size: 28px; font-weight: bold; color: ${activeRate >= 70 ? '#22c55e' : activeRate >= 40 ? '#eab308' : '#ef4444'}; margin: 0;">${activeRate}%</p>
    <p style="color: #a1a1aa; font-size: 12px; margin: 4px 0 0;">Taxa de Atividade</p>
  </div>
  <div style="background: #27272a; padding: 16px; border-radius: 8px; text-align: center;">
    <p style="font-size: 28px; font-weight: bold; color: #3b82f6; margin: 0;">${totalLeads || 0}</p>
    <p style="color: #a1a1aa; font-size: 12px; margin: 4px 0 0;">Leads Criados</p>
  </div>
  <div style="background: #27272a; padding: 16px; border-radius: 8px; text-align: center;">
    <p style="font-size: 28px; font-weight: bold; color: #a855f7; margin: 0;">${totalCerts || 0}</p>
    <p style="color: #a1a1aa; font-size: 12px; margin: 4px 0 0;">Certificações</p>
  </div>
</div>`;

        const emailHtml = `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 40px; max-width: 180px;" />` : ''}
    <h1 style="font-size: 20px; color: ${branding.primaryColor}; margin: 12px 0 0;">📊 Relatório Mensal</h1>
    <p style="color: #a1a1aa; font-size: 14px; margin-top: 8px;">${monthName} — ${branding.name}</p>
  </div>
  <div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">
    <h3 style="margin-top: 0; color: #fafafa;">Olá ${firstName}! 👋</h3>
    <p>Aqui está o resumo do seu programa de mentoria:</p>
    ${statsHtml}
    ${aiSummary ? `<div style="margin-top: 16px; padding: 16px; background: #1e1e24; border-radius: 8px; border-left: 3px solid ${branding.primaryColor};">${aiSummary}</div>` : ''}
  </div>
  <div style="text-align: center; margin-top: 24px;"><p style="color: #71717a; font-size: 12px;">© ${new Date().getFullYear()} ${branding.name}</p></div>
</div>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: branding.fromEmail, to: [profile.email], subject: `📊 ${firstName}, relatório mensal de ${monthName}`, html: emailHtml }),
        });

        if (emailRes.ok) {
          await supabase.from("email_logs").insert({ recipient_email: profile.email, recipient_membership_id: mentor.id, subject: "monthly-mentor-report", status: "sent", sent_at: new Date().toISOString() });
          totalSent++;
        } else { await emailRes.text(); }
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "monthly_mentor_report");
    }

    return new Response(JSON.stringify({ success: true, reports_sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("monthly-mentor-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
