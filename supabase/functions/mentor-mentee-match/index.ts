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
    let totalSuggestions = 0;

    for (const tenant of tenants) {
      const { data: autoConfig } = await supabase.from("tenant_automations").select("id, is_enabled").eq("tenant_id", tenant.id).eq("automation_key", "mentor_mentee_match").maybeSingle();
      if (autoConfig && !autoConfig.is_enabled) continue;

      const branding = await getTenantBranding(supabase, tenant.id);

      // Get mentors
      const { data: mentors } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).eq("role", "mentor").eq("status", "active");
      if (!mentors?.length || mentors.length < 2) continue;

      // Get unassigned mentees
      const { data: mentees } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).eq("role", "mentee").eq("status", "active");
      if (!mentees?.length) continue;

      // Get current assignments
      const { data: assignments } = await supabase.from("mentor_mentee_assignments").select("mentor_membership_id, mentee_membership_id").eq("status", "active");
      const assignedMentees = new Set((assignments || []).map(a => a.mentee_membership_id));

      // Build mentor profiles
      const mentorProfiles: { id: string; name: string; menteeCount: number }[] = [];
      for (const mentor of mentors) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", mentor.user_id).maybeSingle();
        const count = (assignments || []).filter(a => a.mentor_membership_id === mentor.id).length;
        mentorProfiles.push({ id: mentor.id, name: profile?.full_name || "Mentor", menteeCount: count });
      }

      // Collect data for AI analysis
      const unassigned = mentees.filter(m => !assignedMentees.has(m.id));
      const overloaded = mentorProfiles.filter(m => m.menteeCount > mentees.length / mentors.length * 1.5);

      if (!unassigned.length && !overloaded.length) continue;

      let suggestion = "";
      if (lovableKey) {
        const context = `Mentores:\n${mentorProfiles.map(m => `- ${m.name}: ${m.menteeCount} mentorados`).join("\n")}\n\nMentorados sem mentor: ${unassigned.length}\nMentores sobrecarregados: ${overloaded.map(m => m.name).join(", ") || "nenhum"}`;
        suggestion = await callAI(lovableKey, `Analise a distribuição de mentorados entre mentores e sugira reatribuições para equilibrar. Em português, seja prático:\n${context}`);
      }

      // Notify admins
      const { data: admins } = await supabase.from("memberships").select("id, user_id").eq("tenant_id", tenant.id).in("role", ["admin", "master_admin"]).eq("status", "active");

      for (const admin of admins || []) {
        const { data: ap } = await supabase.from("profiles").select("email, full_name, phone").eq("user_id", admin.user_id).maybeSingle();
        if (!ap) continue;

        if (resendKey && ap.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: branding.fromEmail,
              to: [ap.email],
              subject: `🤝 Sugestão de Redistribuição — ${branding.name}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:${branding.primaryColor}">🤝 Match Mentor-Mentorado</h2><p>Olá ${ap.full_name || ""},</p><p><strong>Mentorados sem mentor:</strong> ${unassigned.length}</p><p><strong>Mentores sobrecarregados:</strong> ${overloaded.length}</p>${suggestion ? `<h3>💡 Recomendação da IA</h3><p>${suggestion}</p>` : ""}<p style="color:#888;font-size:12px;">Enviado por ${branding.name}</p></div>`,
            }),
          });
        }

        if (ap.phone) {
          await sendWhatsApp(supabase, tenant.id, ap.phone, `🤝 *${branding.name} — Match Mentor-Mentorado*\n\n${unassigned.length} mentorado(s) sem mentor atribuído.\n${overloaded.length} mentor(es) sobrecarregado(s).\n\nConfira a sugestão de redistribuição no email!`);
        }
        totalSuggestions++;
      }

      await supabase.from("tenant_automations").update({ last_run_at: new Date().toISOString(), last_run_status: "success" }).eq("tenant_id", tenant.id).eq("automation_key", "mentor_mentee_match");
    }

    return new Response(JSON.stringify({ success: true, suggestions: totalSuggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
