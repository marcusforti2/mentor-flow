import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTPCode(): string {
  // Generate 8 random digits
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  return `LBV-${digits}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Email inválido");
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate OTP code
    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing unused codes for this email
    await supabase
      .from("otp_codes")
      .delete()
      .eq("email", email.toLowerCase())
      .eq("used", false);

    // Insert new OTP code
    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({
        email: email.toLowerCase(),
        code: code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      throw new Error("Erro ao gerar código");
    }

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "LBV TECH <noreply@equipe.aceleracaoforti.online>",
      to: [email],
      subject: "Seu código de acesso - LBV TECH",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0b; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a1d 0%, #0d0d0e 100%); border-radius: 16px; border: 1px solid #27272a; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #27272a;">
                      <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #c9a227 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="font-size: 28px;">✨</span>
                      </div>
                      <h1 style="margin: 0; color: #fafafa; font-size: 24px; font-weight: 700;">LBV TECH</h1>
                      <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 14px;">Seu código de acesso chegou</p>
                    </td>
                  </tr>
                  
                  <!-- Code -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 16px; color: #d4d4d8; font-size: 15px; line-height: 1.6;">
                        Use o código abaixo para acessar sua conta:
                      </p>
                      
                      <div style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #c9a227 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #0a0a0b; font-family: 'Monaco', 'Consolas', monospace;">
                          ${code}
                        </span>
                      </div>
                      
                      <p style="margin: 24px 0 0; color: #71717a; font-size: 13px; text-align: center;">
                        ⏱️ Este código expira em <strong style="color: #d4af37;">10 minutos</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 32px; background-color: #09090b; border-top: 1px solid #27272a;">
                      <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center; line-height: 1.5;">
                        Se você não solicitou este código, ignore este email.<br>
                        © ${new Date().getFullYear()} LBV TECH - Plataforma para Mentores
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Erro ao enviar email. Verifique se o email está correto.");
    }

    console.log(`OTP sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado para seu email" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
