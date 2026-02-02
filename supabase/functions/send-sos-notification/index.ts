import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SOSNotificationRequest {
  mentoradoId: string;
  mentoradoName: string;
  mentoradoEmail: string;
  sosTitle: string;
  sosDescription: string;
  sosPriority: string;
  sosCategory: string;
  initialGuidance: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      mentoradoId,
      mentoradoName,
      mentoradoEmail,
      sosTitle,
      sosDescription,
      sosPriority,
      sosCategory,
      initialGuidance,
    } = (await req.json()) as SOSNotificationRequest;

    console.log("SOS Notification - Sending emails for:", mentoradoName);

    // Mentors' emails (Jacob and Mari)
    const mentorEmails = [
      "jacob@marcusforti.online", // Email do Jacob
      "mari@marcusforti.online",  // Email da Mari
    ];

    const priorityColors: Record<string, string> = {
      urgente: "#ef4444",
      alta: "#f97316",
      média: "#eab308",
      baixa: "#22c55e",
    };

    const priorityColor = priorityColors[sosPriority] || "#6b7280";

    // Email para os mentores
    const mentorEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #e2e8f0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1a1a1d; border-radius: 16px; overflow: hidden; border: 1px solid #27272a; }
    .header { background: linear-gradient(135deg, #d4af37, #f4d03f); padding: 30px; text-align: center; }
    .header h1 { margin: 0; color: #0a0a0b; font-size: 24px; }
    .content { padding: 30px; }
    .priority-badge { display: inline-block; background: ${priorityColor}; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; text-transform: uppercase; }
    .category-badge { display: inline-block; background: #27272a; color: #a1a1aa; padding: 6px 16px; border-radius: 20px; font-size: 14px; margin-left: 8px; }
    .section { margin: 24px 0; padding: 20px; background: #0a0a0b; border-radius: 12px; border: 1px solid #27272a; }
    .section-title { font-size: 12px; text-transform: uppercase; color: #71717a; margin-bottom: 8px; letter-spacing: 1px; }
    .section-content { color: #e2e8f0; line-height: 1.6; }
    .mentorado-info { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #d4af37, #f4d03f); display: flex; align-items: center; justify-content: center; color: #0a0a0b; font-weight: bold; font-size: 18px; }
    .footer { padding: 20px 30px; background: #09090b; text-align: center; color: #52525b; font-size: 12px; border-top: 1px solid #27272a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Novo Chamado SOS</h1>
    </div>
    <div class="content">
      <div class="mentorado-info">
        <div class="avatar">${mentoradoName.charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-weight: 600; font-size: 18px; color: #fafafa;">${mentoradoName}</div>
          <div style="color: #a1a1aa; font-size: 14px;">${mentoradoEmail}</div>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <span class="priority-badge">${sosPriority}</span>
        <span class="category-badge">${sosCategory}</span>
      </div>
      
      <div class="section">
        <div class="section-title">Título do Problema</div>
        <div class="section-content" style="font-size: 18px; font-weight: 600; color: #d4af37;">${sosTitle}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Descrição Completa</div>
        <div class="section-content">${sosDescription}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Direcionamento Inicial (IA)</div>
        <div class="section-content" style="color: #d4af37;">${initialGuidance}</div>
      </div>
    </div>
    <div class="footer">
      LBV TECH - Plataforma para Mentores • Chamado recebido via Centro SOS
    </div>
  </div>
</body>
</html>
    `;

    // Email de confirmação para o mentorado
    const mentoradoEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #e2e8f0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1a1a1d; border-radius: 16px; overflow: hidden; border: 1px solid #27272a; }
    .header { background: linear-gradient(135deg, #22c55e, #10b981); padding: 30px; text-align: center; }
    .header h1 { margin: 0; color: white; font-size: 24px; }
    .content { padding: 30px; }
    .success-icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
    .message { font-size: 16px; line-height: 1.7; color: #e2e8f0; }
    .guidance-box { margin: 24px 0; padding: 20px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(244, 208, 63, 0.1)); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; }
    .guidance-title { font-size: 14px; font-weight: 600; color: #d4af37; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .guidance-content { color: #e2e8f0; line-height: 1.6; }
    .footer { padding: 20px 30px; background: #09090b; text-align: center; color: #52525b; font-size: 12px; border-top: 1px solid #27272a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Chamado SOS Enviado!</h1>
    </div>
    <div class="content">
      <div class="success-icon">🎯</div>
      
      <div class="message">
        <p>Olá <strong>${mentoradoName}</strong>,</p>
        <p>Seu chamado SOS foi enviado com sucesso para os mentores <strong>Jacob</strong> e <strong>Mari</strong>!</p>
        <p>Eles foram notificados e entrarão em contato em breve. Enquanto isso, já comece a aplicar as orientações abaixo:</p>
      </div>
      
      <div class="guidance-box">
        <div class="guidance-title">💡 Direcionamento Inicial</div>
        <div class="guidance-content">${initialGuidance}</div>
      </div>
      
      <div class="message">
        <p style="color: #a1a1aa; font-size: 14px;">
          <strong>Categoria:</strong> ${sosCategory} • <strong>Prioridade:</strong> ${sosPriority}
        </p>
      </div>
    </div>
    <div class="footer">
      LBV TECH - Plataforma para Mentores • Você receberá uma resposta em breve
    </div>
  </div>
</body>
</html>
    `;

    // Enviar emails para os mentores
    for (const mentorEmail of mentorEmails) {
      try {
        await resend.emails.send({
          from: "SOS LBV TECH <sos@equipe.aceleracaoforti.online>",
          to: [mentorEmail],
          subject: `🚨 [SOS ${sosPriority.toUpperCase()}] ${mentoradoName}: ${sosTitle}`,
          html: mentorEmailHtml,
        });
        console.log(`Email sent to mentor: ${mentorEmail}`);
      } catch (emailError) {
        console.error(`Failed to send to ${mentorEmail}:`, emailError);
      }
    }

    // Enviar email de confirmação para o mentorado
    if (mentoradoEmail) {
      try {
        await resend.emails.send({
          from: "LBV TECH <contato@equipe.aceleracaoforti.online>",
          to: [mentoradoEmail],
          subject: "✅ Seu chamado SOS foi enviado com sucesso!",
          html: mentoradoEmailHtml,
        });
        console.log(`Confirmation email sent to mentorado: ${mentoradoEmail}`);
      } catch (emailError) {
        console.error(`Failed to send confirmation to ${mentoradoEmail}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Emails enviados com sucesso" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-sos-notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
