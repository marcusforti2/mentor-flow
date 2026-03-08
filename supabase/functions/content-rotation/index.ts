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
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: prompt }], max_tokens: 600 }),
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
      const { data: autoConfig } = await supabase.from("tenant_automations").select("id, is_enabled").eq("tenant_id", tenant.id).eq("automation_key", "content_rotation").maybeSingle();
      if (autoConfig && !autoConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);

      // Get published playbooks for this tenant
      const { data: playbooks } = await supabase
        .from("playbooks")
        .select("id, title, description, visibility")
        .eq("tenant_id", tenant.id)
        .eq("is_published", true)
        .limit(10);

      // Get published trails
      const { data: trails } = await supabase
        .from("trails")
        .select("id, title, description")
        .eq("tenant_id", tenant.id)
        .eq("is_published", true)
        .limit(10);

      const contentPool = [
        ...(playbooks || []).map(p => ({ type: "playbook", title: p.title, desc: p.description })),
        ...(trails || []).map(t => ({ type: "trail", title: t.title, desc: t.description })),
      ];

      if (!contentPool.length) continue;

      // Pick random content (rotate weekly)
      const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
      const picked = contentPool[weekNum % contentPool.length];

      // Get mentees
      const { data: mentees } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).eq("role", "mentee").eq("status", "active");
      if (!mentees?.length) continue;

      for (const mentee of mentees) {
        const { data: profile } = await supabase.from("profiles").select("email, full_name, phone").eq("user_id", mentee.user_id).maybeSingle();
        if (!profile) continue;

        let tip = "";
        if (lovableKey) {
          tip = await callAI(lovableKey, `Gere uma dica motivacional curta (2-3 frases) em português sobre este conteúdo "${picked.title}: ${picked.desc || ""}" para um mentorado de vendas. Seja entusiasmante e prático.`);
        }

        const typeLabel = picked.type === "playbook" ? "📖 Playbook" : "🎓 Trilha";

        if (resendKey && profile.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: branding.fromEmail,
              to: [profile.email],
              subject: `${typeLabel} da Semana: ${picked.title} — ${branding.name}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:${branding.primaryColor}">${typeLabel} da Semana</h2><p>Olá ${profile.full_name || ""},</p><h3>${picked.title}</h3><p>${picked.desc || ""}</p>${tip ? `<p><em>${tip}</em></p>` : ""}<p>Acesse a plataforma para conferir! 🚀</p><p style="color:#888;font-size:12px;">Enviado por ${branding.name}</p></div>`,
            }),
          });
        }

        if (profile.phone) {
          await sendWhatsApp(supabase, tenant.id, profile.phone, `${typeLabel === "📖 Playbook" ? "📖" : "🎓"} *${branding.name} — Conteúdo da Semana*\n\n*${picked.title}*\n${picked.desc || ""}\n\n${tip || "Acesse a plataforma para conferir! 🚀"}`);
        }

        totalSent++;
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "content_rotation");
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
