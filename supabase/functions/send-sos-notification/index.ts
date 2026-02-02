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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; }
    .header h1 { margin: 0; color: white; font-size: 24px; }
    .content { padding: 30px; }
    .priority-badge { display: inline-block; background: ${priorityColor}; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; text-transform: uppercase; }
    .category-badge { display: inline-block; background: #334155; color: #94a3b8; padding: 6px 16px; border-radius: 20px; font-size: 14px; margin-left: 8px; }
    .section { margin: 24px 0; padding: 20px; background: #0f172a; border-radius: 12px; }
    .section-title { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 1px; }
    .section-content { color: #e2e8f0; line-height: 1.6; }
    .mentorado-info { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
    .footer { padding: 20px 30px; background: #0f172a; text-align: center; color: #64748b; font-size: 12px; }
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
          <div style="font-weight: 600; font-size: 18px;">${mentoradoName}</div>
          <div style="color: #94a3b8; font-size: 14px;">${mentoradoEmail}</div>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <span class="priority-badge">${sosPriority}</span>
        <span class="category-badge">${sosCategory}</span>
      </div>
      
      <div class="section">
        <div class="section-title">Título do Problema</div>
        <div class="section-content" style="font-size: 18px; font-weight: 600;">${sosTitle}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Descrição Completa</div>
        <div class="section-content">${sosDescription}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Direcionamento Inicial (IA)</div>
        <div class="section-content" style="color: #a5b4fc;">${initialGuidance}</div>
      </div>
    </div>
    <div class="footer">
      Plataforma de Mentoria High Ticket • Chamado recebido via Centro SOS
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #22c55e, #10b981); padding: 30px; text-align: center; }
    .header h1 { margin: 0; color: white; font-size: 24px; }
    .content { padding: 30px; }
    .success-icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
    .message { font-size: 16px; line-height: 1.7; color: #e2e8f0; }
    .guidance-box { margin: 24px 0; padding: 20px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; }
    .guidance-title { font-size: 14px; font-weight: 600; color: #a5b4fc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .guidance-content { color: #e2e8f0; line-height: 1.6; }
    .footer { padding: 20px 30px; background: #0f172a; text-align: center; color: #64748b; font-size: 12px; }
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
        <p style="color: #94a3b8; font-size: 14px;">
          <strong>Categoria:</strong> ${sosCategory} • <strong>Prioridade:</strong> ${sosPriority}
        </p>
      </div>
    </div>
    <div class="footer">
      Plataforma de Mentoria High Ticket • Você receberá uma resposta em breve
    </div>
  </div>
</body>
</html>
    `;

    // Enviar emails para os mentores
    for (const mentorEmail of mentorEmails) {
      try {
        await resend.emails.send({
          from: "SOS Mentoria <sos@equipe.marcusforti.online>",
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
          from: "Mentoria High Ticket <contato@equipe.marcusforti.online>",
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
