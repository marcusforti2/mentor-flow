import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OTP_FROM_EMAIL = Deno.env.get("OTP_FROM_EMAIL") || "noreply@equipe.aceleracaoforti.online";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTPCode(): string {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
}

// ── White-label branding helper ──
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
  fromEmail: `MentorFlow.io <${OTP_FROM_EMAIL}>`,
};

function hslToHex(hslStr: string): string {
  const parts = hslStr.trim().split(/\s+/);
  if (parts.length < 3) return "#d4af37";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function resolveColor(raw: string | null | undefined): string {
  if (!raw) return "#d4af37";
  const trimmed = raw.trim();
  if (trimmed.startsWith('#')) return trimmed;
  return hslToHex(trimmed);
}

async function getTenantBranding(supabase: any, tenantId: string | null): Promise<TenantBranding> {
  if (!tenantId) return DEFAULT_BRANDING;
  try {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, logo_url, primary_color, brand_attributes")
      .eq("id", tenantId)
      .maybeSingle();
    if (!tenant) return DEFAULT_BRANDING;
    const primaryColor = resolveColor(tenant.primary_color || tenant.brand_attributes?.primary_color);
    const brandName = tenant.name || DEFAULT_BRANDING.name;
    return {
      name: brandName,
      logoUrl: tenant.logo_url || null,
      primaryColor,
      fromEmail: `${brandName} <${OTP_FROM_EMAIL}>`,
    };
  } catch { return DEFAULT_BRANDING; }
}

function buildOtpEmailHtml(code: string, b: TenantBranding): string {
  const logoHtml = b.logoUrl
    ? `<img src="${b.logoUrl}" alt="${b.name}" style="max-height: 48px; max-width: 200px; margin-bottom: 16px;" />`
    : `<div style="width: 56px; height: 56px; background: linear-gradient(135deg, ${b.primaryColor} 0%, ${b.primaryColor}cc 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <span style="font-size: 28px;">✨</span>
      </div>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0b; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a1d 0%, #0d0d0e 100%); border-radius: 16px; border: 1px solid #27272a; overflow: hidden;">
        <tr><td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #27272a;">
          ${logoHtml}
          <h1 style="margin: 0; color: #fafafa; font-size: 24px; font-weight: 700;">${b.name}</h1>
          <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 14px;">Seu código de acesso chegou</p>
        </td></tr>
        <tr><td style="padding: 32px;">
          <p style="margin: 0 0 16px; color: #d4d4d8; font-size: 15px; line-height: 1.6;">Use o código abaixo para acessar sua conta:</p>
          <div style="background: linear-gradient(135deg, ${b.primaryColor} 0%, ${b.primaryColor}cc 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #0a0a0b; font-family: 'Monaco', 'Consolas', monospace;">${code}</span>
          </div>
          <p style="margin: 24px 0 0; color: #71717a; font-size: 13px; text-align: center;">⏱️ Este código expira em <strong style="color: ${b.primaryColor};">10 minutos</strong></p>
        </td></tr>
        <tr><td style="padding: 24px 32px; background-color: #09090b; border-top: 1px solid #27272a;">
          <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center; line-height: 1.5;">
            Se você não solicitou este código, ignore este email.<br>
            © ${new Date().getFullYear()} ${b.name}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── WhatsApp OTP sender ──
async function sendOtpViaWhatsApp(
  supabase: any,
  tenantId: string,
  phone: string,
  code: string,
  branding: TenantBranding,
): Promise<{ success: boolean; error?: string }> {
  // Get tenant WhatsApp config
  const { data: whatsappConfig } = await supabase
    .from("tenant_whatsapp_config")
    .select("ultramsg_instance_id, ultramsg_token, is_active")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!whatsappConfig?.ultramsg_instance_id || !whatsappConfig?.ultramsg_token) {
    return { success: false, error: "WhatsApp não configurado para este programa" };
  }

  if (!whatsappConfig.is_active) {
    return { success: false, error: "WhatsApp desativado para este programa" };
  }

  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  const message = `🔐 *${branding.name}*\n\nSeu código de acesso:\n\n*${code}*\n\n⏱️ Expira em 10 minutos.\n\nSe você não solicitou, ignore esta mensagem.`;

  const response = await fetch(
    `https://api.ultramsg.com/${whatsappConfig.ultramsg_instance_id}/messages/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: whatsappConfig.ultramsg_token,
        to: formattedPhone,
        body: message,
      }),
    },
  );

  const data = await response.json();
  if (!response.ok || data.error) {
    console.error("WhatsApp OTP send error:", data);
    return { success: false, error: "Erro ao enviar WhatsApp" };
  }

  return { success: true };
}

// ── Resolve phone for a user ──
async function resolvePhone(
  supabase: any,
  email: string,
  tenantHint: string | null,
): Promise<string | null> {
  // 1. Try profile phone
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("email", email)
    .maybeSingle();

  if (profile?.phone) return profile.phone;

  // 2. Try invite metadata phone
  const { data: invite } = await supabase
    .from("invites")
    .select("metadata")
    .eq("email", email)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const invitePhone = invite?.metadata?.phone;
  if (invitePhone) return invitePhone;

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const tenant_hint = typeof body.tenant_hint === 'string' ? body.tenant_hint : null;
    const channel = typeof body.channel === 'string' && ['email', 'whatsapp'].includes(body.channel) ? body.channel : 'email';
    const providedPhone = typeof body.phone === 'string' ? body.phone.replace(/[^\d+]/g, '') : null;

    if (!email) throw new Error("Email é obrigatório");
    if (email.length > 255) throw new Error("Email muito longo");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Email inválido");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedEmail = email.toLowerCase().trim();
    const otpChannel = channel || "email"; // "email" | "whatsapp"

    // ── RATE LIMIT: max 5 sends per email in 15 minutes ──
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: sendCount } = await supabase
      .from('otp_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .eq('attempt_type', 'send')
      .gte('created_at', fifteenMinAgo);

    if ((sendCount ?? 0) >= 5) {
      console.log("send-otp: RATE LIMITED -", normalizedEmail, "attempts:", sendCount);
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde 15 minutos antes de solicitar um novo código.' }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log this send attempt
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    void supabase.from('otp_rate_limits').insert({
      email: normalizedEmail,
      attempt_type: 'send',
      ip_address: clientIp,
      user_agent: userAgent,
    });

    console.log("send-otp: Checking permission for:", normalizedEmail, "tenant_hint:", tenant_hint, "channel:", otpChannel);

    const { data: permissionRows, error: permError } = await supabase
      .rpc('can_receive_otp', { _email: normalizedEmail, _tenant_hint: tenant_hint || null });

    if (permError) {
      console.error("Error checking OTP permission:", permError);
      throw new Error("Erro ao verificar permissão de acesso");
    }

    const permission = permissionRows?.[0];
    console.log("send-otp: Permission result:", permission);

    if (!permission?.allowed) {
      if (permission?.reason === 'multiple_invites') {
        return new Response(
          JSON.stringify({ error: 'multiple_tenants', tenants: permission.tenants, message: 'Selecione o programa que deseja acessar' }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Acesso não configurado. Você precisa ser convidado para acessar a plataforma.' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resolvedTenantId = permission.tenant_id || tenant_hint || null;
    const branding = await getTenantBranding(supabase, resolvedTenantId);

    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await supabase.from("otp_codes").delete().eq("email", normalizedEmail).or("used.is.null,used.eq.false");

    const { error: insertError } = await supabase.from("otp_codes").insert({
      email: normalizedEmail, code, expires_at: expiresAt.toISOString(), used: false,
    });
    if (insertError) throw new Error("Erro ao gerar código");

    // ── Send via chosen channel ──
    if (otpChannel === "whatsapp") {
      if (!resolvedTenantId) {
        throw new Error("Tenant não identificado para envio via WhatsApp");
      }

      // Resolve phone: use provided phone, or lookup from profile/invite
      const phone = providedPhone || await resolvePhone(supabase, normalizedEmail, resolvedTenantId);
      if (!phone) {
        throw new Error("Número de WhatsApp não encontrado. Use o envio por email.");
      }

      console.log("send-otp: Sending OTP via WhatsApp to:", phone, "brand:", branding.name);
      const whatsappResult = await sendOtpViaWhatsApp(supabase, resolvedTenantId, phone, code, branding);

      if (!whatsappResult.success) {
        throw new Error(whatsappResult.error || "Erro ao enviar código via WhatsApp");
      }

      return new Response(
        JSON.stringify({ success: true, message: "Código enviado para seu WhatsApp", channel: "whatsapp", tenant_id: permission.tenant_id, role: permission.role }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ── Default: send via email ──
    if (!RESEND_API_KEY) throw new Error("Configuração de email não encontrada");

    console.log("send-otp: Sending branded email via Resend to:", normalizedEmail, "brand:", branding.name);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: branding.fromEmail,
        to: [normalizedEmail],
        subject: `Seu código de acesso - ${branding.name}`,
        html: buildOtpEmailHtml(code, branding),
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("send-otp: Resend API response:", emailResponse.status, JSON.stringify(emailResult));

    if (!emailResponse.ok) {
      console.error("send-otp: Resend API error:", emailResponse.status, emailResult);
      throw new Error(`Erro ao enviar email: ${emailResult?.message || emailResult?.error || 'Resend API error'}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado para seu email", channel: "email", tenant_id: permission.tenant_id, role: permission.role }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
