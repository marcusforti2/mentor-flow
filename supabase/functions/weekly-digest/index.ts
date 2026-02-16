import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── White-label branding helper ──
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

    // Auth: require master_admin or internal cron call
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { tenant_id } = await req.json().catch(() => ({}));

    // Get all active tenants (or specific one)
    let tenants: { id: string }[];
    if (tenant_id) {
      tenants = [{ id: tenant_id }];
    } else {
      const { data } = await supabase.from("tenants").select("id");
      tenants = data || [];
    }

    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, reason: "no_resend_key" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let totalSent = 0;

    for (const tenant of tenants) {
      const branding = await getTenantBranding(supabase, tenant.id);

      // Get active mentees for this tenant
      const { data: mentees } = await supabase
        .from("memberships")
        .select("id, user_id")
        .eq("tenant_id", tenant.id)
        .eq("role", "mentee")
        .eq("status", "active");

      if (!mentees?.length) continue;

      for (const mentee of mentees) {
        try {
          // Get profile
          const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", mentee.user_id).single();
          if (!profile?.email) continue;

          const firstName = profile.full_name?.split(" ")[0] || "Mentorado";

          // Get stats for the week
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

          const [leadsRes, tasksRes, activityRes] = await Promise.all([
            supabase.from("crm_prospections").select("id", { count: "exact" }).eq("membership_id", mentee.id).gte("created_at", weekAgo),
            supabase.from("campan_tasks").select("id, status_column").eq("mentorado_membership_id", mentee.id),
            supabase.from("activity_logs").select("id", { count: "exact" }).eq("membership_id", mentee.id).gte("created_at", weekAgo),
          ]);

          const newLeads = leadsRes.count || 0;
          const tasksDone = tasksRes.data?.filter(t => t.status_column === "done").length || 0;
          const tasksPending = tasksRes.data?.filter(t => t.status_column !== "done").length || 0;
          const totalActivities = activityRes.count || 0;

          // Generate AI summary if available
          let aiSummary = "";
          if (lovableKey) {
            try {
              const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-lite",
                  messages: [
                    { role: "system", content: "Você é um coach de vendas. Gere um resumo semanal motivacional em HTML (h3, p, ul, li, strong). Max 200 palavras. NÃO use tags html/head/body. Foque em progresso e próximos passos." },
                    { role: "user", content: `Resumo da semana de ${firstName}:\n- Novos leads: ${newLeads}\n- Tarefas concluídas: ${tasksDone}\n- Tarefas pendentes: ${tasksPending}\n- Atividades totais: ${totalActivities}\n\nGere um resumo motivacional personalizado.` },
                  ],
                }),
              });
              if (aiRes.ok) {
                const aiData = await aiRes.json();
                aiSummary = aiData.choices?.[0]?.message?.content || "";
              }
            } catch (e) { console.error("AI digest error:", e); }
          }

          if (!aiSummary) {
            aiSummary = `<h3>📊 Seu resumo da semana</h3>
<ul>
  <li><strong>${newLeads}</strong> novos leads adicionados</li>
  <li><strong>${tasksDone}</strong> tarefas concluídas</li>
  <li><strong>${tasksPending}</strong> tarefas pendentes</li>
  <li><strong>${totalActivities}</strong> atividades registradas</li>
</ul>
<p>Continue assim, ${firstName}! Cada ação te aproxima dos seus objetivos. 🚀</p>`;
          }

          const logoSection = branding.logoUrl
            ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 40px; max-width: 180px;" />`
            : `<h1 style="font-size: 24px; color: ${branding.primaryColor}; margin: 0;">📊 Digest Semanal</h1>`;

          const emailHtml = `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    ${logoSection}
    ${branding.logoUrl ? `<h1 style="font-size: 20px; color: ${branding.primaryColor}; margin: 12px 0 0;">📊 Digest Semanal</h1>` : ''}
    <p style="color: #a1a1aa; font-size: 14px; margin-top: 8px;">${branding.name}</p>
  </div>
  <div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">${aiSummary}</div>
  <div style="text-align: center; margin-top: 24px;">
    <p style="color: #71717a; font-size: 12px;">© ${new Date().getFullYear()} ${branding.name}</p>
  </div>
</div>`;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: branding.fromEmail,
              to: [profile.email],
              subject: `📊 ${firstName}, aqui está seu resumo semanal!`,
              html: emailHtml,
            }),
          });

          totalSent++;
        } catch (e) { console.error(`Digest error for ${mentee.id}:`, e); }
      }
    }

    return new Response(JSON.stringify({ success: true, emails_sent: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-digest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
