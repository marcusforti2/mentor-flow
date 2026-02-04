import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Configuração do domínio verificado
const FROM_EMAIL = "MentorHub <noreply@equipe.aceleracaoforti.online>";

interface EmailContent {
  subject: string;
  body: string;
}

interface TestFlowRequest {
  flowName: string;
  emails: string[];
  emailContents: EmailContent[];
  isTest?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY não configurada" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    const { flowName, emails, emailContents, isTest = true }: TestFlowRequest = await req.json();

    console.log(`Processing email flow: ${flowName}, recipients: ${emails.length}, emails: ${emailContents.length}`);

    // Validate required fields
    if (!emails || emails.length === 0) {
      throw new Error("Nenhum email de destino fornecido");
    }

    if (!emailContents || emailContents.length === 0) {
      throw new Error("Nenhum conteúdo de email fornecido");
    }

    const results = [];

    // Send each email in the flow to all test recipients
    for (let i = 0; i < emailContents.length; i++) {
      const content = emailContents[i];
      
      // Create HTML wrapper for better email rendering
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            }
            .email-container {
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .content {
              padding: 30px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              background: #f3f4f6;
              font-size: 12px;
              color: #6b7280;
            }
            .test-badge {
              display: inline-block;
              background: rgba(255,255,255,0.2);
              color: white;
              padding: 6px 16px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 15px;
            }
            a {
              color: #f59e0b;
            }
            .btn {
              display: inline-block;
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white !important;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              ${isTest ? `<span class="test-badge">🧪 TESTE - Email ${i + 1} de ${emailContents.length}</span>` : ''}
              <h1>${flowName}</h1>
            </div>
            <div class="content">
              ${content.body.replace(/\{\{nome\}\}/g, isTest ? '<strong>João Silva (teste)</strong>' : '{{nome}}')}
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Aceleração Forti. Todos os direitos reservados.</p>
              ${isTest ? `<p style="color: #9ca3af; margin-top: 10px;">Este é um email de teste do fluxo "${flowName}"</p>` : ''}
            </div>
          </div>
        </body>
        </html>
      `;

      const subject = isTest ? `[TESTE] ${content.subject}` : content.subject;

      // Send to all recipients
      const emailResponse = await resend.emails.send({
        from: FROM_EMAIL,
        to: emails,
        subject: subject,
        html: htmlContent,
      });

      results.push({
        emailIndex: i + 1,
        subject: content.subject,
        response: emailResponse,
      });

      console.log(`Email ${i + 1} sent successfully:`, emailResponse);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${emailContents.length} email(s) enviado(s) para ${emails.length} destinatário(s)`,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-test-flow function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
