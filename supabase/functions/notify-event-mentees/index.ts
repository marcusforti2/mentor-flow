import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      event_id,
      tenant_id,
      event_title,
      event_date,
      event_time,
      event_description,
      meeting_url,
      mentee_membership_ids = [],
      reminder_intervals = [],
      send_whatsapp = true,
      send_email = true,
    } = await req.json();

    if (!tenant_id || !event_title || mentee_membership_ids.length === 0) {
      throw new Error("Missing required fields");
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tenant branding
    const { data: tenant } = await adminClient
      .from("tenants")
      .select("name, logo_url, primary_color")
      .eq("id", tenant_id)
      .single();

    const tenantName = tenant?.name || "Mentoria";

    // Get mentee details
    const { data: memberships } = await adminClient
      .from("memberships")
      .select("id, user_id")
      .in("id", mentee_membership_ids);

    if (!memberships || memberships.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Nenhum mentorado encontrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = memberships.map(m => m.user_id);
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Get mentee behavioral data for AI personalization
    const { data: menteeProfiles } = await adminClient
      .from("mentee_profiles")
      .select("membership_id, business_segment, company_name")
      .in("membership_id", mentee_membership_ids);

    const menteeProfileMap = new Map(menteeProfiles?.map(mp => [mp.membership_id, mp]) || []);

    // Get WhatsApp config for tenant
    let whatsappConfig = null;
    if (send_whatsapp) {
      const { data: wConfig } = await adminClient
        .from("whatsapp_config")
        .select("instance_id, token")
        .eq("tenant_id", tenant_id)
        .maybeSingle();
      whatsappConfig = wConfig;
    }

    // Format event date/time for display
    const dateObj = new Date(`${event_date}T${event_time || "09:00:00"}`);
    const formattedDate = dateObj.toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
    const formattedTime = event_time ? dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

    // Generate AI-personalized messages for each mentee
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let sentWhatsApp = 0;
    let sentEmail = 0;

    for (const membership of memberships) {
      const profile = profileMap.get(membership.user_id);
      if (!profile) continue;

      const menteeProfile = menteeProfileMap.get(membership.id);
      const firstName = profile.full_name?.split(" ")[0] || "Mentorado";

      // Generate personalized message via AI
      let whatsappMessage = "";
      let emailBody = "";

      if (LOVABLE_API_KEY) {
        try {
          const aiPrompt = `Gere uma mensagem curta e motivadora para notificar um mentorado sobre um novo evento agendado.

Dados do mentorado:
- Nome: ${profile.full_name || "Mentorado"}
- Segmento: ${menteeProfile?.business_segment || "não informado"}
- Empresa: ${menteeProfile?.company_name || "não informada"}

Dados do evento:
- Título: ${event_title}
- Data: ${formattedDate}
- Horário: ${formattedTime || "A definir"}
- Descrição: ${event_description || "Sem descrição"}
${meeting_url ? `- Link: ${meeting_url}` : ""}

Instruções:
1. Use o primeiro nome do mentorado
2. Seja direto, acolhedor e motivador
3. Máximo 200 caracteres para WhatsApp
4. Inclua data/hora e link se houver
5. Use emoji com moderação (máx 2)
6. Termine com algo motivador sobre o evento

Retorne no formato:
WHATSAPP: [mensagem whatsapp]
EMAIL_SUBJECT: [assunto do email]
EMAIL_BODY: [corpo do email em HTML simples, max 3 parágrafos]`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "Você é um assistente de comunicação de uma plataforma de mentoria. Gere mensagens personalizadas." },
                { role: "user", content: aiPrompt },
              ],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const aiText = aiData.choices?.[0]?.message?.content || "";
            
            const whatsappMatch = aiText.match(/WHATSAPP:\s*(.+?)(?=EMAIL_SUBJECT:|$)/s);
            const emailSubjectMatch = aiText.match(/EMAIL_SUBJECT:\s*(.+?)(?=EMAIL_BODY:|$)/s);
            const emailBodyMatch = aiText.match(/EMAIL_BODY:\s*(.+)/s);

            whatsappMessage = whatsappMatch?.[1]?.trim() || "";
            const emailSubject = emailSubjectMatch?.[1]?.trim() || `Novo evento: ${event_title}`;
            emailBody = emailBodyMatch?.[1]?.trim() || "";

            // If email body generated, wrap in template
            if (emailBody && send_email && profile.email) {
              const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
              if (RESEND_API_KEY) {
                const htmlEmail = `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                    <div style="text-align:center;margin-bottom:24px;">
                      ${tenant?.logo_url ? `<img src="${tenant.logo_url}" alt="${tenantName}" style="max-height:50px;" />` : `<h2 style="color:${tenant?.primary_color || '#6366f1'}">${tenantName}</h2>`}
                    </div>
                    <div style="background:#f9fafb;border-radius:12px;padding:24px;margin-bottom:16px;">
                      ${emailBody}
                    </div>
                    ${meeting_url ? `<div style="text-align:center;margin:16px 0;"><a href="${meeting_url}" style="background:${tenant?.primary_color || '#6366f1'};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Acessar Reunião</a></div>` : ""}
                    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">${tenantName}</p>
                  </div>
                `;

                try {
                  const emailRes = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${RESEND_API_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      from: "noreply@equipe.aceleracaoforti.online",
                      to: [profile.email],
                      subject: emailSubject,
                      html: htmlEmail,
                    }),
                  });
                  if (emailRes.ok) sentEmail++;
                } catch (e) {
                  console.error("Email send error:", e);
                }
              }
            }
          }
        } catch (e) {
          console.error("AI generation error:", e);
        }
      }

      // Fallback message if AI failed
      if (!whatsappMessage) {
        whatsappMessage = `Olá ${firstName}! 📅 Você tem um novo evento agendado: *${event_title}* em ${formattedDate}${formattedTime ? ` às ${formattedTime}` : ""}.${meeting_url ? ` Link: ${meeting_url}` : ""} - ${tenantName}`;
      }

      // Send WhatsApp
      if (send_whatsapp && whatsappConfig && profile.phone) {
        try {
          const phone = profile.phone.replace(/\D/g, "");
          if (phone.length >= 10) {
            const whatsappRes = await fetch(`https://api.ultramsg.com/${whatsappConfig.instance_id}/messages/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: whatsappConfig.token,
                to: phone.startsWith("55") ? phone : `55${phone}`,
                body: whatsappMessage,
              }),
            });
            if (whatsappRes.ok) sentWhatsApp++;
          }
        } catch (e) {
          console.error("WhatsApp send error:", e);
        }
      }

      // Store reminders if intervals provided
      if (reminder_intervals.length > 0 && event_id) {
        const reminders = reminder_intervals.map((interval: string) => {
          const hoursMap: Record<string, number> = {
            "1h": 1, "2h": 2, "6h": 6, "12h": 12, "24h": 24, "48h": 48, "72h": 72, "1w": 168,
          };
          const hours = hoursMap[interval] || 24;
          const scheduledAt = new Date(dateObj.getTime() - hours * 60 * 60 * 1000);

          return {
            event_id,
            tenant_id,
            mentee_membership_id: membership.id,
            reminder_type: "both",
            hours_before: hours,
            interval_key: interval,
            scheduled_at: scheduledAt.toISOString(),
            status: "pending",
            whatsapp_message: whatsappMessage,
          };
        });

        await adminClient.from("event_mentee_reminders" as any).insert(reminders);
      }
    }

    return new Response(JSON.stringify({
      sent_whatsapp: sentWhatsApp,
      sent_email: sentEmail,
      total_mentees: memberships.length,
      message: `Notificações enviadas: ${sentWhatsApp} WhatsApp, ${sentEmail} e-mails`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-event-mentees error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
