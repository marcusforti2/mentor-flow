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

async function callAI(lovableKey: string, prompt: string): Promise<string> {
  try {
    const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: prompt }], max_tokens: 800 }),
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
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const tenant of tenants) {
      const { data: autoConfig } = await supabase.from("tenant_automations").select("id, is_enabled").eq("tenant_id", tenant.id).eq("automation_key", "weekly_whatsapp_summary").maybeSingle();
      if (autoConfig && !autoConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);

      // Get WhatsApp messages from this week
      const { data: messages } = await supabase
        .from("whatsapp_messages")
        .select("id, direction, status, created_at")
        .eq("tenant_id", tenant.id)
        .gte("created_at", weekAgo);

      const { data: incoming } = await supabase
        .from("whatsapp_incoming_messages")
        .select("id, from_number, message_body, created_at")
        .eq("tenant_id", tenant.id)
        .gte("created_at", weekAgo);

      const totalOutgoing = messages?.filter(m => m.direction === "outbound").length || 0;
      const totalIncoming = incoming?.length || 0;
      const totalDelivered = messages?.filter(m => m.status === "delivered" || m.status === "read").length || 0;

      // Get CRM metrics for context
      const { count: newLeads } = await supabase.from("crm_prospections").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).gte("created_at", weekAgo);

      const stats = `📊 Resumo WhatsApp Semanal:\n• Mensagens enviadas: ${totalOutgoing}\n• Mensagens recebidas: ${totalIncoming}\n• Entregues/Lidas: ${totalDelivered}\n• Novos leads na semana: ${newLeads || 0}`;

      let aiAnalysis = "";
      if (lovableKey && (totalOutgoing > 0 || totalIncoming > 0)) {
        aiAnalysis = await callAI(lovableKey, `Analise estas métricas de WhatsApp de uma operação de vendas e dê 3 insights práticos em português:\n${stats}\nSeja conciso e direto.`);
      }

      // Notify staff
      const { data: staffMembers } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).in("role", ["admin", "mentor", "ops", "master_admin"]).eq("status", "active");

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
              subject: `📱 Resumo WhatsApp Semanal — ${branding.name}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:${branding.primaryColor}">📱 Resumo WhatsApp Semanal</h2><p>Olá ${sp.full_name || ""},</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;">${stats}</pre>${aiAnalysis ? `<h3>💡 Insights</h3><p>${aiAnalysis}</p>` : ""}<p style="color:#888;font-size:12px;">Enviado por ${branding.name}</p></div>`,
            }),
          });
        }

        if (sp.phone) {
          await sendWhatsApp(supabase, tenant.id, sp.phone, `📱 *${branding.name} — Resumo Semanal*\n\n${stats}\n\n${aiAnalysis ? `💡 ${aiAnalysis.slice(0, 300)}` : ""}`);
        }
        totalSent++;
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "weekly_whatsapp_summary");
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
