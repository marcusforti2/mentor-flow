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
    await fetch(`https://api.ultramsg.com/${config.ultramsg_instance_id}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: config.ultramsg_token, to: phone, body: message }),
    });
  } catch {}
}

async function callAI(lovableKey: string, prompt: string): Promise<string> {
  try {
    const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: prompt }], max_tokens: 400 }),
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
    let totalSent = 0;

    for (const tenant of tenants) {
      const { data: autoConfig } = await supabase.from("tenant_automations").select("id, is_enabled, config").eq("tenant_id", tenant.id).eq("automation_key", "cold_lead_followup").maybeSingle();
      if (autoConfig && !autoConfig.is_enabled) continue;

      const staleDays = (autoConfig?.config as any)?.stale_days || 5;
      const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
      const branding = await getTenantBranding(supabase, tenant.id);

      // Find stale prospections (no interaction recently)
      const { data: staleLeads } = await supabase
        .from("crm_prospections")
        .select("id, contact_name, company, membership_id, whatsapp, contact_email, status, temperature, updated_at")
        .eq("tenant_id", tenant.id)
        .lt("updated_at", cutoff)
        .not("status", "eq", "closed_won")
        .not("status", "eq", "closed_lost")
        .limit(50);

      if (!staleLeads?.length) continue;

      // Group by mentorado
      const byMentorado: Record<string, typeof staleLeads> = {};
      for (const lead of staleLeads) {
        if (!lead.membership_id) continue;
        if (!byMentorado[lead.membership_id]) byMentorado[lead.membership_id] = [];
        byMentorado[lead.membership_id].push(lead);
      }

      for (const [membershipId, leads] of Object.entries(byMentorado)) {
        const { data: membership } = await supabase.from("memberships").select("user_id").eq("id", membershipId).maybeSingle();
        if (!membership) continue;
        const { data: profile } = await supabase.from("profiles").select("email, full_name, phone").eq("user_id", membership.user_id).maybeSingle();
        if (!profile) continue;

        const leadList = leads.map(l => `- ${l.contact_name} (${l.company || "sem empresa"}) — parado há ${Math.round((Date.now() - new Date(l.updated_at!).getTime()) / 86400000)} dias`).join("\n");

        let aiSuggestion = "";
        if (lovableKey) {
          aiSuggestion = await callAI(lovableKey, `Você é um coach de vendas. Gere uma sugestão curta e prática de follow-up para cada lead frio abaixo. Em português. Seja direto e acionável:\n${leadList}`);
        }

        // Send email
        if (resendKey && profile.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: branding.fromEmail,
              to: [profile.email],
              subject: `🎯 ${leads.length} lead(s) esfriando — ${branding.name}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:${branding.primaryColor}">🎯 Leads Esfriando</h2><p>Olá ${profile.full_name || ""},</p><p>Estes leads não recebem atenção há ${staleDays}+ dias:</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;">${leadList}</pre>${aiSuggestion ? `<h3>💡 Sugestão de Abordagem</h3><p>${aiSuggestion}</p>` : ""}<p style="color:#888;font-size:12px;">Enviado por ${branding.name}</p></div>`,
            }),
          });
        }

        // WhatsApp
        if (profile.phone) {
          const names = leads.slice(0, 3).map(l => l.contact_name).join(", ");
          await sendWhatsApp(supabase, tenant.id, profile.phone, `🎯 *${branding.name} — Leads Esfriando*\n\nVocê tem ${leads.length} lead(s) sem movimentação há ${staleDays}+ dias: ${names}${leads.length > 3 ? ` e mais ${leads.length - 3}` : ""}.\n\nQue tal retomar o contato hoje? 💪`);
        }

        totalSent++;
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "cold_lead_followup");
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
