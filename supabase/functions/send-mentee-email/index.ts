import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { mode, tenant_id, mentee_email, mentee_name, mentor_name, emails } = body;
    // mode: 'single' | 'generate' | 'generate_sequence' | 'send_sequence'
    // emails: for single/send_sequence: [{ subject, body_html }] or [{ subject, body_html, send_date }]
    // For generate: { context, tone }
    // For generate_sequence: { context, tone, count, interval_days }

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant branding
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name, branding")
      .eq("id", tenant_id)
      .single();

    const tenantName = tenant?.name || "MentorFlow";
    const branding = (tenant?.branding as any) || {};
    const primaryColor = branding.primary_color || "#6366f1";
    const logoUrl = branding.logo_url || null;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    // === GENERATE SINGLE EMAIL WITH AI ===
    if (mode === "generate") {
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const { context, tone } = body;
      const prompt = `Você é o assistente de comunicação da plataforma "${tenantName}".
Gere um e-mail personalizado para o mentorado.

CONTEXTO:
- Remetente (mentor): ${mentor_name || "Mentor"}
- Destinatário (mentorado): ${mentee_name || "Mentorado"}
- Assunto/contexto fornecido pelo mentor: ${context || "Mensagem geral de acompanhamento"}
- Tom desejado: ${tone || "profissional e motivacional"}

RETORNE um JSON com esta estrutura exata (sem markdown, sem code blocks):
{"subject": "assunto do email", "body_html": "<p>conteúdo HTML inline-styled...</p>"}

REGRAS:
- Assunto curto e atrativo (máx 60 chars), pode ter 1 emoji.
- Body em HTML inline-styled, máximo 8 linhas de texto.
- Tom ${tone || "profissional e motivacional"}.
- Use a cor "${primaryColor}" para destaques.
- NÃO inclua tags html/head/body. Apenas o conteúdo interno.
- NÃO inclua links. O sistema adiciona automaticamente.
- Assine como ${mentor_name || "Seu mentor"}.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "Retorne APENAS JSON válido, sem markdown." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        return new Response(JSON.stringify({ error: "AI generation failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      let content = aiData.choices?.[0]?.message?.content || "";
      content = content.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();

      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({ ok: true, email: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ ok: true, email: { subject: "Mensagem do seu mentor", body_html: content } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // === GENERATE SEQUENCE WITH AI ===
    if (mode === "generate_sequence") {
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const { context, tone, count, interval_days } = body;
      const emailCount = Math.min(count || 3, 7);

      const prompt = `Você é o assistente de comunicação da plataforma "${tenantName}".
Gere uma SEQUÊNCIA de ${emailCount} e-mails para o mentorado, espaçados com intervalo de ${interval_days || 3} dias.

CONTEXTO:
- Remetente (mentor): ${mentor_name || "Mentor"}
- Destinatário (mentorado): ${mentee_name || "Mentorado"}
- Objetivo da sequência: ${context || "Acompanhamento e motivação"}
- Tom: ${tone || "profissional e motivacional"}

RETORNE um JSON array com esta estrutura (sem markdown):
[{"day_offset": 0, "subject": "...", "body_html": "<p>...</p>"}, {"day_offset": ${interval_days || 3}, "subject": "...", "body_html": "..."}, ...]

REGRAS:
- Cada email deve ter assunto único e progressivo.
- day_offset é o número de dias a partir de hoje para enviar.
- Body HTML inline-styled, máximo 6 linhas cada.
- Tom ${tone || "profissional e motivacional"}.
- Use "${primaryColor}" para destaques.
- Cada e-mail deve fazer sentido como parte de uma narrativa progressiva.
- Assine como ${mentor_name || "Seu mentor"}.
- Retorne APENAS o JSON array.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Retorne APENAS JSON array válido, sem markdown." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        return new Response(JSON.stringify({ error: "AI generation failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      let content = aiData.choices?.[0]?.message?.content || "";
      content = content.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();

      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({ ok: true, sequence: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse AI sequence" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // === SEND EMAIL(S) ===
    if (mode === "single" || mode === "send_sequence") {
      if (!RESEND_API_KEY) {
        return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!mentee_email || !emails?.length) {
        return new Response(JSON.stringify({ error: "mentee_email and emails required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const loginUrl = "https://mentorflow.aceleracaoforti.online";
      const results: any[] = [];

      for (const email of emails) {
        const sendDate = email.send_date; // ISO string or null for immediate

        const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:${primaryColor};padding:24px 32px;text-align:center;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${tenantName}" style="max-height:40px;margin-bottom:8px;display:block;margin:0 auto 8px;" />` : ""}
          <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700;">${tenantName}</h1>
        </td></tr>
        <tr><td style="padding:32px;">${email.body_html}</td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;background:${primaryColor};color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Acessar plataforma →</a>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${tenantName}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

        const resendBody: any = {
          from: `${tenantName} <noreply@equipe.aceleracaoforti.online>`,
          to: [mentee_email],
          subject: email.subject,
          html: fullHtml,
        };

        // Resend supports scheduled sending via send_at
        if (sendDate && mode === "send_sequence") {
          resendBody.send_at = sendDate;
        }

        const sendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resendBody),
        });

        if (sendResp.ok) {
          const data = await sendResp.json();
          results.push({ ok: true, email_id: data.id, subject: email.subject });
        } else {
          const errText = await sendResp.text();
          console.error("Resend error:", errText);
          results.push({ ok: false, subject: email.subject, error: errText });
        }
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
