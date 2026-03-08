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
    let totalAlerts = 0;

    for (const tenant of tenants) {
      const { data: autoConfig } = await supabase.from("tenant_automations").select("id, is_enabled, config").eq("tenant_id", tenant.id).eq("automation_key", "stale_deal_alert").maybeSingle();
      if (autoConfig && !autoConfig.is_enabled) continue;

      const staleDays = (autoConfig?.config as any)?.stale_days || 7;
      const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
      const branding = await getTenantBranding(supabase, tenant.id);

      // Find stale deals (mentee_deals table or crm_prospections with value)
      const { data: staleDeals } = await supabase
        .from("crm_prospections")
        .select("id, contact_name, company, membership_id, whatsapp, status, temperature, updated_at, points")
        .eq("tenant_id", tenant.id)
        .lt("updated_at", cutoff)
        .not("status", "eq", "closed_won")
        .not("status", "eq", "closed_lost")
        .gt("points", 0)
        .limit(50);

      if (!staleDeals?.length) continue;

      // Notify staff
      const { data: staffMembers } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).in("role", ["admin", "mentor", "ops", "master_admin"]).eq("status", "active");

      const dealList = staleDeals.slice(0, 10).map(d => {
        const days = Math.round((Date.now() - new Date(d.updated_at!).getTime()) / 86400000);
        return `• ${d.contact_name} (${d.company || "-"}) — ${days}d parado — ${d.points || 0}pts`;
      }).join("\n");

      for (const staff of staffMembers || []) {
        const { data: sp } = await supabase.from("profiles").select("email, full_name, phone").eq("user_id", staff.user_id).maybeSingle();
        if (!sp) continue;

        if (resendKey && sp.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: branding.fromEmail,
              to: [sp.email],
              subject: `💰 ${staleDeals.length} deal(s) parado(s) — ${branding.name}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:${branding.primaryColor}">💰 Deals Parados</h2><p>Olá ${sp.full_name || ""},</p><p>${staleDeals.length} deal(s) sem movimentação há ${staleDays}+ dias:</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;">${dealList}</pre><p>Revise com seus mentorados para não perder oportunidades!</p><p style="color:#888;font-size:12px;">Enviado por ${branding.name}</p></div>`,
            }),
          });
        }

        if (sp.phone) {
          await sendWhatsApp(supabase, tenant.id, sp.phone, `💰 *${branding.name} — Deals Parados*\n\n${staleDeals.length} deal(s) sem movimentação há ${staleDays}+ dias.\n\n${dealList}\n\nRevise com seus mentorados!`);
        }
        totalAlerts++;
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "stale_deal_alert");
    }

    return new Response(JSON.stringify({ success: true, alerts: totalAlerts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
