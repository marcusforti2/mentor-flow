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

    const body = await req.json();
    const {
      mentorado_membership_id,
      mentor_membership_id,
      tenant_id,
      action_type, // 'tasks_created' | 'task_created' | 'playbook_shared' | 'trail_assigned' | generic
      action_details, // { count?: number, titles?: string[], description?: string }
    } = body;

    if (!mentorado_membership_id || !tenant_id || !action_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get mentee profile (email + name)
    const { data: menteeM } = await supabaseAdmin
      .from("memberships")
      .select("user_id")
      .eq("id", mentorado_membership_id)
      .single();

    if (!menteeM) {
      return new Response(JSON.stringify({ error: "Mentee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: menteeProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", menteeM.user_id)
      .single();

    if (!menteeProfile?.email) {
      return new Response(JSON.stringify({ ok: false, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get mentor name
    let mentorName = "Seu mentor";
    if (mentor_membership_id) {
      const { data: mentorM } = await supabaseAdmin
        .from("memberships")
        .select("user_id")
        .eq("id", mentor_membership_id)
        .single();
      if (mentorM) {
        const { data: mentorP } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("user_id", mentorM.user_id)
          .single();
        if (mentorP?.full_name) mentorName = mentorP.full_name;
      }
    }

    // 3. Get tenant branding
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name, branding")
      .eq("id", tenant_id)
      .single();

    const tenantName = tenant?.name || "MentorFlow";
    const branding = (tenant?.branding as any) || {};
    const primaryColor = branding.primary_color || "#6366f1";
    const logoUrl = branding.logo_url || null;

    // 4. Use AI to generate a personalized, engaging email body
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const menteeName = menteeProfile.full_name?.split(" ")[0] || "mentorado";
    const details = action_details || {};

    const aiPrompt = `Você é o assistente de comunicação da plataforma "${tenantName}".
Gere o CORPO de um e-mail curto, motivacional e profissional em HTML inline-styled para notificar o mentorado.

CONTEXTO:
- Nome do mentorado: ${menteeName}
- Nome do mentor: ${mentorName}
- Ação realizada: ${action_type}
- Detalhes: ${JSON.stringify(details)}

REGRAS:
- Máximo 6 linhas de texto.
- Tom amigável, encorajador, direto.
- Use emojis com moderação (1-2 no máximo).
- NÃO inclua <html>, <head>, <body> tags — apenas o conteúdo interno.
- NÃO inclua links (o sistema adiciona automaticamente).
- Use a cor primária "${primaryColor}" para destaques.
- Termine com uma frase motivacional curta.
- Retorne SOMENTE o HTML, sem explicações.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você gera HTML de e-mail. Retorne APENAS HTML, sem markdown, sem code blocks." },
          { role: "user", content: aiPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      console.error("AI error:", aiResp.status);
      // Fallback: simple email without AI
    }

    let emailBody = "";
    if (aiResp.ok) {
      const aiData = await aiResp.json();
      emailBody = aiData.choices?.[0]?.message?.content || "";
      // Strip markdown code blocks if present
      emailBody = emailBody.replace(/```html?\n?/gi, "").replace(/```/g, "").trim();
    }

    // Fallback body
    if (!emailBody) {
      emailBody = `<p>Olá ${menteeName}! 👋</p>
<p><strong>${mentorName}</strong> acabou de atualizar seu painel na plataforma <strong>${tenantName}</strong>.</p>
<p>Acesse agora para conferir as novidades!</p>`;
    }

    // 5. Generate subject line based on action
    const subjectMap: Record<string, string> = {
      tasks_created: `📋 ${mentorName} criou novas tarefas para você!`,
      task_created: `📋 Nova tarefa de ${mentorName}`,
      playbook_shared: `📖 ${mentorName} compartilhou um playbook com você`,
      trail_assigned: `🎯 ${mentorName} atribuiu uma trilha para você`,
    };
    const subject = subjectMap[action_type] || `🔔 Novidade de ${mentorName} na ${tenantName}`;

    // 6. Build full branded email HTML
    const loginUrl = "https://mentorflow.aceleracaoforti.online";
    const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
          <td style="background:${primaryColor};padding:24px 32px;text-align:center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${tenantName}" style="max-height:40px;margin-bottom:8px;display:block;margin:0 auto 8px;" />` : ""}
            <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700;">${tenantName}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${emailBody}
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="${loginUrl}" style="display:inline-block;background:${primaryColor};color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
              Acessar plataforma →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} ${tenantName}. Todos os direitos reservados.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // 7. Send via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ ok: false, reason: "no_resend_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${tenantName} <noreply@equipe.aceleracaoforti.online>`,
        to: [menteeProfile.email],
        subject,
        html: fullHtml,
      }),
    });

    if (!sendResp.ok) {
      const errText = await sendResp.text();
      console.error("Resend error:", sendResp.status, errText);
      return new Response(JSON.stringify({ ok: false, reason: "resend_error", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendData = await sendResp.json();
    console.log("Email sent:", sendData.id);

    return new Response(JSON.stringify({ ok: true, email_id: sendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-mentee-action:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao enviar notificação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
