import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── White-label branding helper ──
interface TenantBranding { name: string; logoUrl: string | null; primaryColor: string; fromEmail: string; }
const DEFAULT_BRANDING: TenantBranding = { name: "MentorFlow.io", logoUrl: null, primaryColor: "#d4af37", fromEmail: "MentorFlow.io <noreply@equipe.aceleracaoforti.online>" };

async function getTenantBranding(supabase: any, tenantId: string | null): Promise<TenantBranding> {
  if (!tenantId) return DEFAULT_BRANDING;
  try {
    const { data: tenant } = await supabase.from("tenants").select("name, logo_url, brand_attributes").eq("id", tenantId).maybeSingle();
    if (!tenant) return DEFAULT_BRANDING;
    const attrs = tenant.brand_attributes || {};
    const brandName = tenant.name || DEFAULT_BRANDING.name;
    return { name: brandName, logoUrl: tenant.logo_url || null, primaryColor: attrs.primary_color || "#d4af37", fromEmail: `${brandName} <noreply@equipe.aceleracaoforti.online>` };
  } catch { return DEFAULT_BRANDING; }
}

function logoHtml(b: TenantBranding) {
  return b.logoUrl
    ? `<img src="${b.logoUrl}" alt="${b.name}" style="max-height: 40px; max-width: 180px;" />`
    : `<span style="font-size: 24px; font-weight: 700; color: #0a0a0b;">${b.name}</span>`;
}

interface SOSNotificationRequest {
  mentoradoId: string;
  mentoradoName: string;
  mentoradoEmail: string;
  sosTitle: string;
  sosDescription: string;
  sosPriority: string;
  sosCategory: string;
  initialGuidance: string;
  tenantId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { createClient: createAuthClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAuth = createAuthClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { mentoradoId, mentoradoName, mentoradoEmail, sosTitle, sosDescription, sosPriority, sosCategory, initialGuidance, tenantId } = (await req.json()) as SOSNotificationRequest;

    console.log("SOS Notification - Sending emails for:", mentoradoName, "tenant:", tenantId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch tenant branding
    const branding = await getTenantBranding(supabase, tenantId || null);

    const mentorEmails: string[] = [];
    if (tenantId) {
      const { data: mentorMemberships } = await supabase.from("memberships").select("user_id").eq("tenant_id", tenantId).in("role", ["mentor", "admin"]).eq("status", "active");
      if (mentorMemberships && mentorMemberships.length > 0) {
        const userIds = mentorMemberships.map((m: any) => m.user_id);
        const { data: profiles } = await supabase.from("profiles").select("email").in("user_id", userIds);
        if (profiles) for (const p of profiles) { if (p.email) mentorEmails.push(p.email); }
      }
    }
    if (mentorEmails.length === 0) {
      const fallbackEmail = Deno.env.get("SOS_FALLBACK_EMAIL");
      if (fallbackEmail) {
        mentorEmails.push(fallbackEmail);
      } else {
        console.warn("SOS: No mentor emails found and SOS_FALLBACK_EMAIL is not set. Notification may not be delivered.");
      }
    }

    const priorityColors: Record<string, string> = { urgente: "#ef4444", alta: "#f97316", "média": "#eab308", baixa: "#22c55e" };
    const priorityColor = priorityColors[sosPriority] || "#6b7280";

    const mentorEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #e2e8f0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #1a1a1d; border-radius: 16px; overflow: hidden; border: 1px solid #27272a; }
  .header { background: linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryColor}cc); padding: 30px; text-align: center; }
  .content { padding: 30px; }
  .section { margin: 24px 0; padding: 20px; background: #0a0a0b; border-radius: 12px; border: 1px solid #27272a; }
  .section-title { font-size: 12px; text-transform: uppercase; color: #71717a; margin-bottom: 8px; letter-spacing: 1px; }
  .footer { padding: 20px 30px; background: #09090b; text-align: center; color: #52525b; font-size: 12px; border-top: 1px solid #27272a; }
</style></head><body>
  <div class="container">
    <div class="header">
      ${logoHtml(branding)}
      <h1 style="margin: 12px 0 0; color: #0a0a0b; font-size: 20px;">🚨 Novo Chamado SOS</h1>
    </div>
    <div class="content">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryColor}cc); display: flex; align-items: center; justify-content: center; color: #0a0a0b; font-weight: bold; font-size: 18px;">${mentoradoName.charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-weight: 600; font-size: 18px; color: #fafafa;">${mentoradoName}</div>
          <div style="color: #a1a1aa; font-size: 14px;">${mentoradoEmail}</div>
        </div>
      </div>
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; background: ${priorityColor}; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; text-transform: uppercase;">${sosPriority}</span>
        <span style="display: inline-block; background: #27272a; color: #a1a1aa; padding: 6px 16px; border-radius: 20px; font-size: 14px; margin-left: 8px;">${sosCategory}</span>
      </div>
      <div class="section"><div class="section-title">Título do Problema</div><div style="font-size: 18px; font-weight: 600; color: ${branding.primaryColor};">${sosTitle}</div></div>
      <div class="section"><div class="section-title">Descrição Completa</div><div style="color: #e2e8f0; line-height: 1.6;">${sosDescription}</div></div>
      <div class="section"><div class="section-title">Direcionamento Inicial (IA)</div><div style="color: ${branding.primaryColor}; line-height: 1.6;">${initialGuidance}</div></div>
    </div>
    <div class="footer">${branding.name} • Chamado recebido via Centro SOS</div>
  </div>
</body></html>`;

    const mentoradoEmailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #e2e8f0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #1a1a1d; border-radius: 16px; overflow: hidden; border: 1px solid #27272a; }
  .header { background: linear-gradient(135deg, #22c55e, #10b981); padding: 30px; text-align: center; }
  .content { padding: 30px; }
  .footer { padding: 20px 30px; background: #09090b; text-align: center; color: #52525b; font-size: 12px; border-top: 1px solid #27272a; }
</style></head><body>
  <div class="container">
    <div class="header"><h1 style="margin: 0; color: white; font-size: 24px;">✅ Chamado SOS Enviado!</h1></div>
    <div class="content">
      <div style="font-size: 48px; text-align: center; margin-bottom: 20px;">🎯</div>
      <p>Olá <strong>${mentoradoName}</strong>,</p>
      <p>Seu chamado SOS foi enviado com sucesso! Seu mentor foi notificado e entrará em contato em breve.</p>
      <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, rgba(${branding.primaryColor === '#d4af37' ? '212,175,55' : '100,100,255'},0.1), rgba(${branding.primaryColor === '#d4af37' ? '244,208,63' : '100,100,255'},0.1)); border: 1px solid ${branding.primaryColor}44; border-radius: 12px;">
        <div style="font-size: 14px; font-weight: 600; color: ${branding.primaryColor}; margin-bottom: 12px;">💡 Direcionamento Inicial</div>
        <div style="color: #e2e8f0; line-height: 1.6;">${initialGuidance}</div>
      </div>
      <p style="color: #a1a1aa; font-size: 14px;"><strong>Categoria:</strong> ${sosCategory} • <strong>Prioridade:</strong> ${sosPriority}</p>
    </div>
    <div class="footer">${branding.name} • Você receberá uma resposta em breve</div>
  </div>
</body></html>`;

    for (const mentorEmail of mentorEmails) {
      try {
        await resend.emails.send({
          from: `SOS ${branding.name} <sos@equipe.aceleracaoforti.online>`,
          to: [mentorEmail],
          subject: `🚨 [SOS ${sosPriority.toUpperCase()}] ${mentoradoName}: ${sosTitle}`,
          html: mentorEmailHtml,
        });
      } catch (emailError) { console.error(`Failed to send to ${mentorEmail}:`, emailError); }
    }

    if (mentoradoEmail) {
      try {
        await resend.emails.send({
          from: branding.fromEmail,
          to: [mentoradoEmail],
          subject: "✅ Seu chamado SOS foi enviado com sucesso!",
          html: mentoradoEmailHtml,
        });
      } catch (emailError) { console.error(`Failed to send confirmation to ${mentoradoEmail}:`, emailError); }
    }

    return new Response(JSON.stringify({ success: true, message: "Emails enviados com sucesso" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in send-sos-notification:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
