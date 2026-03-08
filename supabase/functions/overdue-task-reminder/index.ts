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
    if (!config?.ultramsg_instance_id || !config?.ultramsg_token || !config?.is_active) return;
    await fetch(`https://api.ultramsg.com/${config.ultramsg_instance_id}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: config.ultramsg_token, to: phone, body: message }),
    });
  } catch {}
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { tenant_id } = await req.json().catch(() => ({}));
    const tenants = tenant_id ? [{ id: tenant_id }] : ((await supabase.from("tenants").select("id")).data || []);
    let totalSent = 0;
    const now = new Date().toISOString();

    for (const tenant of tenants) {
      const { data: autoConfig } = await supabase.from("tenant_automations").select("id, is_enabled").eq("tenant_id", tenant.id).eq("automation_key", "overdue_task_reminder").maybeSingle();
      if (autoConfig && !autoConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);

      // Find overdue tasks
      const { data: overdueTasks } = await supabase
        .from("campan_tasks")
        .select("id, title, due_date, mentorado_membership_id, priority")
        .eq("tenant_id", tenant.id)
        .lt("due_date", now)
        .neq("status_column", "done")
        .limit(100);

      if (!overdueTasks?.length) continue;

      // Group by mentorado
      const byMentorado: Record<string, typeof overdueTasks> = {};
      for (const task of overdueTasks) {
        const mid = task.mentorado_membership_id;
        if (!byMentorado[mid]) byMentorado[mid] = [];
        byMentorado[mid].push(task);
      }

      for (const [membershipId, tasks] of Object.entries(byMentorado)) {
        const { data: membership } = await supabase.from("memberships").select("user_id").eq("id", membershipId).maybeSingle();
        if (!membership) continue;
        const { data: profile } = await supabase.from("profiles").select("email, full_name, phone").eq("user_id", membership.user_id).maybeSingle();
        if (!profile) continue;

        const taskList = tasks.slice(0, 5).map(t => {
          const daysOverdue = Math.round((Date.now() - new Date(t.due_date!).getTime()) / 86400000);
          return `• ${t.title} (${daysOverdue} dia(s) atrasada — ${t.priority})`;
        }).join("\n");

        // Email
        if (resendKey && profile.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: branding.fromEmail,
              to: [profile.email],
              subject: `⏰ ${tasks.length} tarefa(s) atrasada(s) — ${branding.name}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:${branding.primaryColor}">⏰ Tarefas Atrasadas</h2><p>Olá ${profile.full_name || ""},</p><p>Você tem ${tasks.length} tarefa(s) com prazo vencido:</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;">${taskList}</pre><p>Acesse a plataforma para atualizar o status das suas tarefas! 💪</p><p style="color:#888;font-size:12px;">Enviado por ${branding.name}</p></div>`,
            }),
          });
        }

        // WhatsApp
        if (profile.phone) {
          await sendWhatsApp(supabase, tenant.id, profile.phone, `⏰ *${branding.name} — Tarefas Atrasadas*\n\nOlá ${profile.full_name || ""}! Você tem *${tasks.length} tarefa(s)* com prazo vencido.\n\n${taskList}\n\nBora colocar em dia? 🚀`);
        }

        totalSent++;
      }

      // Also notify mentors about their mentees' overdue tasks
      const { data: staffMembers } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).in("role", ["admin", "mentor", "ops", "master_admin"]).eq("status", "active");
      if (staffMembers?.length && overdueTasks.length >= 3) {
        for (const staff of staffMembers) {
          const { data: sp } = await supabase.from("profiles").select("phone").eq("user_id", staff.user_id).maybeSingle();
          if (sp?.phone) {
            await sendWhatsApp(supabase, tenant.id, sp.phone, `⏰ *${branding.name} — Alerta de Tarefas*\n\n${overdueTasks.length} tarefas atrasadas no sistema. Confira o painel para detalhes.`);
          }
        }
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "overdue_task_reminder");
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
