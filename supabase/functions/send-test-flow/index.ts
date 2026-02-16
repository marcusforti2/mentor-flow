import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

interface EmailContent { subject: string; body: string; }
interface TestFlowRequest { flowName: string; emails: string[]; emailContents: EmailContent[]; isTest?: boolean; tenantId?: string; }

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const resend = new Resend(RESEND_API_KEY);

  try {
    const { flowName, emails, emailContents, isTest = true, tenantId }: TestFlowRequest = await req.json();

    if (!emails || emails.length === 0) throw new Error("Nenhum email de destino fornecido");
    if (!emailContents || emailContents.length === 0) throw new Error("Nenhum conteúdo de email fornecido");

    // Fetch tenant branding
    let branding = DEFAULT_BRANDING;
    if (tenantId) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      branding = await getTenantBranding(supabase, tenantId);
    }

    const logoSection = branding.logoUrl
      ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 40px; max-width: 180px; margin-bottom: 12px;" />`
      : '';

    const results = [];
    const errors = [];
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < emailContents.length; i++) {
      const content = emailContents[i];
      if (i > 0) await delay(600);

      try {
        const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
  .email-container { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.primaryColor}cc 100%); color: white; padding: 30px 20px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
  .content { padding: 30px; }
  .footer { text-align: center; padding: 20px; background: #f3f4f6; font-size: 12px; color: #6b7280; }
  .test-badge { display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 15px; }
  a { color: ${branding.primaryColor}; }
  .btn { display: inline-block; background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.primaryColor}cc 100%); color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 15px 0; }
</style></head><body>
  <div class="email-container">
    <div class="header">
      ${logoSection}
      ${isTest ? `<span class="test-badge">🧪 TESTE - Email ${i + 1} de ${emailContents.length}</span>` : ''}
      <h1>${flowName}</h1>
    </div>
    <div class="content">${content.body.replace(/\{\{nome\}\}/g, isTest ? '<strong>João Silva (teste)</strong>' : '{{nome}}')}</div>
    <div class="footer">
      <p style="margin-bottom: 10px; color: #4b5563;">Com carinho,<br/><strong>Seu Mentor</strong></p>
      <p>© ${new Date().getFullYear()} ${branding.name}. Todos os direitos reservados.</p>
      ${isTest ? `<p style="color: #9ca3af; margin-top: 10px;">Este é um email de teste do fluxo "${flowName}"</p>` : ''}
    </div>
  </div>
</body></html>`;

        const subject = isTest ? `[TESTE] ${content.subject}` : content.subject;
        const emailResponse = await resend.emails.send({ from: branding.fromEmail, to: emails, subject, html: htmlContent });
        results.push({ emailIndex: i + 1, subject: content.subject, status: 'success', response: emailResponse });
      } catch (emailError: any) {
        errors.push({ emailIndex: i + 1, subject: content.subject, error: emailError.message });
        results.push({ emailIndex: i + 1, subject: content.subject, status: 'failed', error: emailError.message });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    return new Response(JSON.stringify({
      success: errors.length === 0,
      message: errors.length > 0 ? `${successCount} de ${emailContents.length} email(s) enviado(s). ${errors.length} falhou.` : `${emailContents.length} email(s) enviado(s) para ${emails.length} destinatário(s)`,
      results, errors: errors.length > 0 ? errors : undefined,
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in send-test-flow:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
