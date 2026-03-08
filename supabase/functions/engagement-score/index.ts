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
    if (!config?.ultramsg_instance_id || !config?.ultramsg_token || !config?.is_active) return null;
    const res = await fetch(`https://api.ultramsg.com/${config.ultramsg_instance_id}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: config.ultramsg_token, to: phone, body: message }),
    });
    return res.ok;
  } catch { return null; }
}

async function callAI(lovableKey: string, prompt: string): Promise<string> {
  try {
    const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: prompt }], max_tokens: 500 }),
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

    let totalProcessed = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const tenant of tenants) {
      const { data: autoConfig } = await supabase.from("tenant_automations").select("id, is_enabled").eq("tenant_id", tenant.id).eq("automation_key", "engagement_score").maybeSingle();
      if (autoConfig && !autoConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);

      // Get active mentees
      const { data: mentees } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).eq("role", "mentee").eq("status", "active");
      if (!mentees?.length) continue;

      // Get staff (mentors) to notify
      const { data: staffMembers } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).in("role", ["admin", "mentor", "ops", "master_admin"]).eq("status", "active");

      const scores: { name: string; score: number; trend: string }[] = [];

      for (const mentee of mentees) {
        const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("user_id", mentee.user_id).maybeSingle();

        // Count activities in last 7 days
        const { count: activityCount } = await supabase.from("activity_logs").select("id", { count: "exact", head: true }).eq("membership_id", mentee.id).gte("created_at", sevenDaysAgo);
        const { count: taskCount } = await supabase.from("campan_tasks").select("id", { count: "exact", head: true }).eq("mentorado_membership_id", mentee.id).eq("status_column", "done").gte("updated_at", sevenDaysAgo);
        const { count: trailProgress } = await supabase.from("trail_progress").select("id", { count: "exact", head: true }).eq("membership_id", mentee.id).gte("completed_at", sevenDaysAgo);
        const { count: crmCount } = await supabase.from("crm_prospections").select("id", { count: "exact", head: true }).eq("membership_id", mentee.id).gte("created_at", sevenDaysAgo);

        // Calculate score 0-100
        const acts = activityCount || 0;
        const tasks = taskCount || 0;
        const trails = trailProgress || 0;
        const crm = crmCount || 0;
        const score = Math.min(100, Math.round((acts * 5 + tasks * 15 + trails * 20 + crm * 10)));

        const trend = score >= 70 ? "🟢 Alto" : score >= 40 ? "🟡 Médio" : "🔴 Baixo";
        scores.push({ name: profile?.full_name || "Mentorado", score, trend });

        // Notify mentee via WhatsApp if score is dropping
        if (score < 30 && profile?.phone) {
          const msg = `📊 *${branding.name} — Score de Engajamento*\n\nOlá ${profile.full_name || ""}! Seu score de engajamento esta semana está em *${score}/100*.\n\nQue tal dedicar um tempinho para avançar nas suas trilhas ou atualizar seu CRM? 💪\n\nEstamos aqui para te ajudar!`;
          await sendWhatsApp(supabase, tenant.id, profile.phone, msg);
        }
      }

      // Sort by score ascending (worst first) and build report for mentor
      scores.sort((a, b) => a.score - b.score);
      const report = scores.map((s, i) => `${i + 1}. ${s.name}: ${s.score}/100 ${s.trend}`).join("\n");

      // Notify staff via email
      if (resendKey && staffMembers?.length) {
        for (const staff of staffMembers) {
          const { data: staffProfile } = await supabase.from("profiles").select("email, full_name, phone").eq("user_id", staff.user_id).maybeSingle();
          if (!staffProfile?.email) continue;

          let aiInsight = "";
          if (lovableKey) {
            aiInsight = await callAI(lovableKey, `Analise este ranking de engajamento de mentorados e dê 3 recomendações práticas em português:\n${report}`);
          }

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: branding.fromEmail,
              to: [staffProfile.email],
              subject: `📊 Score de Engajamento Semanal — ${branding.name}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:${branding.primaryColor}">📊 Score de Engajamento Semanal</h2><p>Olá ${staffProfile.full_name || ""},</p><p>Aqui está o ranking de engajamento dos seus mentorados desta semana:</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;">${report}</pre>${aiInsight ? `<h3>💡 Insights da IA</h3><p>${aiInsight}</p>` : ""}<p style="color:#888;font-size:12px;">Enviado por ${branding.name}</p></div>`,
            }),
          });

          // WhatsApp alert for mentor about critical mentees
          if (staffProfile.phone) {
            const criticals = scores.filter(s => s.score < 30);
            if (criticals.length > 0) {
              const names = criticals.map(s => s.name).join(", ");
              await sendWhatsApp(supabase, tenant.id, staffProfile.phone, `🚨 *${branding.name} — Alerta de Engajamento*\n\n${criticals.length} mentorado(s) com score crítico (<30): ${names}\n\nConfira o relatório completo no seu email.`);
            }
          }

          totalProcessed++;
        }
      }

      // Update last run
      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "engagement_score");
    }

    return new Response(JSON.stringify({ success: true, processed: totalProcessed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
