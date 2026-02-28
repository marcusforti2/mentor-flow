import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TenantBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  fromEmail: string;
}

const DEFAULT_BRANDING: TenantBranding = {
  name: "MentorFlow.io",
  logoUrl: null,
  primaryColor: "#d4af37",
  fromEmail: "MentorFlow.io <noreply@equipe.aceleracaoforti.online>",
};

async function getTenantBranding(supabase: any, tenantId: string | null): Promise<TenantBranding> {
  if (!tenantId) return DEFAULT_BRANDING;
  try {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, logo_url, brand_attributes")
      .eq("id", tenantId)
      .maybeSingle();
    if (!tenant) return DEFAULT_BRANDING;
    const attrs = tenant.brand_attributes || {};
    const brandName = tenant.name || DEFAULT_BRANDING.name;
    return {
      name: brandName,
      logoUrl: tenant.logo_url || null,
      primaryColor: attrs.primary_color || "#d4af37",
      fromEmail: `${brandName} <noreply@equipe.aceleracaoforti.online>`,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

function logoHtml(b: TenantBranding) {
  return b.logoUrl
    ? `<img src="${b.logoUrl}" alt="${b.name}" style="max-height: 40px; max-width: 180px;" />`
    : `<span style="font-size: 24px; font-weight: 700; color: #0a0a0b;">${b.name}</span>`;
}

interface NotifyFileUploadRequest {
  uploaderName: string;
  uploaderRole: "mentor" | "mentee";
  recipientEmail: string;
  recipientName: string;
  fileName: string;
  fileType: string;
  tenantId?: string;
}

const fileTypeLabels: Record<string, string> = {
  file: "📄 Documento",
  image: "🖼️ Imagem",
  video: "🎥 Vídeo",
  audio: "🎵 Áudio",
  link: "🔗 Link",
  note: "📝 Nota",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as NotifyFileUploadRequest;
    const { uploaderName, uploaderRole, recipientEmail, recipientName, fileName, fileType, tenantId } = body;

    if (!recipientEmail || !uploaderName || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const branding = await getTenantBranding(adminSupabase, tenantId || null);
    const typeLabel = fileTypeLabels[fileType] || "📎 Arquivo";

    const isMenteeUpload = uploaderRole === "mentee";
    const subject = isMenteeUpload
      ? `📤 ${uploaderName} enviou um arquivo para você`
      : `📥 Seu mentor enviou um novo arquivo`;

    const heading = isMenteeUpload
      ? `${uploaderName} compartilhou um arquivo`
      : `Novo conteúdo do seu mentor`;

    const description = isMenteeUpload
      ? `O mentorado <strong>${uploaderName}</strong> acabou de enviar um novo arquivo. Confira no perfil do aluno.`
      : `Seu mentor <strong>${uploaderName}</strong> compartilhou um novo conteúdo com você. Acesse sua área de arquivos para visualizar.`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr><td style="background-color: ${branding.primaryColor}; padding: 24px; text-align: center;">
          ${logoHtml(branding)}
        </td></tr>
        <!-- Content -->
        <tr><td style="padding: 32px 24px;">
          <h1 style="margin: 0 0 16px; font-size: 20px; color: #0a0a0b; font-weight: 700;">
            ${heading}
          </h1>
          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Olá <strong>${recipientName}</strong>,
          </p>
          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            ${description}
          </p>
          <!-- File card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e4e4e7;">
            <tr><td style="padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 14px; color: #71717a;">${typeLabel}</p>
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0a0a0b;">${fileName}</p>
            </td></tr>
          </table>
          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
            <tr><td align="center">
              <a href="https://mentorflow.aceleracaoforti.online" style="display: inline-block; background-color: ${branding.primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                Acessar Plataforma
              </a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 20px 24px; background-color: #fafafa; border-top: 1px solid #f0f0f0; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
            ${branding.name} • Notificação automática de arquivo
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const { error: sendError } = await resend.emails.send({
      from: branding.fromEmail,
      to: [recipientEmail],
      subject,
      html,
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      throw sendError;
    }

    console.log(`File upload notification sent to ${recipientEmail} (${uploaderRole} upload)`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending file notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
