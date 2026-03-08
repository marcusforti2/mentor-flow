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

    for (const tenant of tenants) {
      const { data: autoConfig } = await supabase.from("tenant_automations").select("id, is_enabled").eq("tenant_id", tenant.id).eq("automation_key", "incomplete_trail_nudge").maybeSingle();
      if (autoConfig && !autoConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);

      // Get published trails with lessons
      const { data: trails } = await supabase.from("trails").select("id, title").eq("tenant_id", tenant.id).eq("is_published", true);
      if (!trails?.length) continue;

      // Get mentees
      const { data: mentees } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).eq("role", "mentee").eq("status", "active");
      if (!mentees?.length) continue;

      for (const mentee of mentees) {
        const { data: profile } = await supabase.from("profiles").select("email, full_name, phone").eq("user_id", mentee.user_id).maybeSingle();
        if (!profile) continue;

        // Check trail progress
        const incompleteTrails: { title: string; completed: number; total: number }[] = [];

        for (const trail of trails) {
          const { count: totalLessons } = await supabase.from("trail_lessons").select("id", { count: "exact", head: true }).eq("trail_id", trail.id);
          if (!totalLessons || totalLessons === 0) continue;

          const { count: completedLessons } = await supabase.from("trail_progress").select("id", { count: "exact", head: true }).eq("membership_id", mentee.id).eq("trail_id", trail.id).not("completed_at", "is", null);

          const completed = completedLessons || 0;
          if (completed > 0 && completed < totalLessons) {
            incompleteTrails.push({ title: trail.title, completed, total: totalLessons });
          }
        }

        if (!incompleteTrails.length) continue;

        const trailList = incompleteTrails.map(t => `• ${t.title}: ${t.completed}/${t.total} aulas`).join("\n");
        const closest = incompleteTrails.reduce((a, b) => (b.completed / b.total > a.completed / a.total) ? b : a);
        const pctClosest = Math.round((closest.completed / closest.total) * 100);

        if (resendKey && profile.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: branding.fromEmail,
              to: [profile.email],
              subject: `🎓 Você está quase lá! ${pctClosest}% da trilha "${closest.title}" — ${branding.name}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:${branding.primaryColor}">🎓 Continue de onde parou!</h2><p>Olá ${profile.full_name || ""},</p><p>Você tem trilhas em andamento esperando por você:</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;">${trailList}</pre><p>A trilha <strong>"${closest.title}"</strong> está em <strong>${pctClosest}%</strong> — falta pouco! 🏆</p><p style="color:#888;font-size:12px;">Enviado por ${branding.name}</p></div>`,
            }),
          });
        }

        if (profile.phone) {
          await sendWhatsApp(supabase, tenant.id, profile.phone, `🎓 *${branding.name}*\n\nOlá ${profile.full_name || ""}! Você está com *${pctClosest}%* da trilha "${closest.title}".\n\nFalta pouco! Continue de onde parou e conquiste seu certificado! 🏆`);
        }

        totalSent++;
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "incomplete_trail_nudge");
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
