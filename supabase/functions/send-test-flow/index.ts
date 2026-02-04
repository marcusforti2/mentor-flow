import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailContent {
  subject: string;
  body: string;
}

interface TestFlowRequest {
  flowName: string;
  emails: string[];
  emailContents: EmailContent[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { flowName, emails, emailContents }: TestFlowRequest = await req.json();

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
            }
            .header {
              background: linear-gradient(135deg, #f59e0b 0%, #3b82f6 100%);
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
              font-size: 12px;
              color: #6b7280;
            }
            .test-badge {
              display: inline-block;
              background: #fef3c7;
              color: #92400e;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="test-badge">🧪 TESTE - Email ${i + 1} de ${emailContents.length}</span>
            <h1 style="margin: 10px 0 0 0; font-size: 20px;">${flowName}</h1>
          </div>
          <div class="content">
            ${content.body.replace(/\{\{nome\}\}/g, 'João Silva (teste)')}
          </div>
          <div class="footer">
            <p>Este é um email de teste enviado pelo sistema de Email Marketing.</p>
            <p>Fluxo: ${flowName}</p>
          </div>
        </body>
        </html>
      `;

      // Send to all recipients
      const emailResponse = await resend.emails.send({
        from: "MentorHub <onboarding@resend.dev>",
        to: emails,
        subject: `[TESTE] ${content.subject}`,
        html: htmlContent,
      });

      results.push({
        emailIndex: i + 1,
        subject: content.subject,
        response: emailResponse,
      });

      console.log(`Test email ${i + 1} sent:`, emailResponse);
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
