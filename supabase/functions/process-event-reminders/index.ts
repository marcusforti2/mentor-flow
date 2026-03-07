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
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get pending reminders that are due
    const now = new Date().toISOString();
    const { data: reminders, error: remError } = await adminClient
      .from("event_mentee_reminders" as any)
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .limit(50);

    if (remError) throw remError;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const reminder of reminders as any[]) {
      try {
        // Get event details
        const { data: event } = await adminClient
          .from("calendar_events")
          .select("title, event_date, event_time, meeting_url, tenant_id")
          .eq("id", reminder.event_id)
          .single();

        if (!event) {
          await adminClient.from("event_mentee_reminders" as any)
            .update({ status: "skipped" })
            .eq("id", reminder.id);
          continue;
        }

        // Get mentee profile
        const { data: membership } = await adminClient
          .from("memberships")
          .select("user_id")
          .eq("id", reminder.mentee_membership_id)
          .single();

        if (!membership) continue;

        const { data: profile } = await adminClient
          .from("profiles")
          .select("full_name, email, phone")
          .eq("user_id", membership.user_id)
          .single();

        if (!profile) continue;

        const { data: tenant } = await adminClient
          .from("tenants")
          .select("name, logo_url, primary_color")
          .eq("id", event.tenant_id)
          .single();

        const firstName = profile.full_name?.split(" ")[0] || "Mentorado";
        const tenantName = tenant?.name || "Mentoria";

        const dateObj = new Date(`${event.event_date}T${event.event_time || "09:00:00"}`);
        const formattedDate = dateObj.toLocaleDateString("pt-BR", {
          weekday: "long", day: "2-digit", month: "long"
        });
        const formattedTime = event.event_time 
          ? dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) 
          : "";

        const hoursLabel = reminder.hours_before >= 24 
          ? `${Math.round(reminder.hours_before / 24)} dia(s)` 
          : `${reminder.hours_before} hora(s)`;

        // Generate reminder message
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        let reminderMsg = `⏰ ${firstName}, lembrete! Faltam *${hoursLabel}* para "${event.title}" (${formattedDate}${formattedTime ? ` às ${formattedTime}` : ""}).${event.meeting_url ? ` Link: ${event.meeting_url}` : ""} - ${tenantName}`;

        if (LOVABLE_API_KEY) {
          try {
            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "system", content: "Gere uma mensagem de lembrete curta (max 200 chars) para WhatsApp. Use emoji moderado, seja direto e motivador." },
                  { role: "user", content: `Lembrete para ${firstName}: evento "${event.title}" em ${hoursLabel}. Data: ${formattedDate} ${formattedTime}. ${event.meeting_url ? `Link: ${event.meeting_url}` : ""} Mentoria: ${tenantName}` },
                ],
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const aiMsg = aiData.choices?.[0]?.message?.content?.trim();
              if (aiMsg) reminderMsg = aiMsg;
            }
          } catch {}
        }

        // Send WhatsApp
        if (profile.phone) {
          const { data: wConfig } = await adminClient
            .from("whatsapp_config")
            .select("instance_id, token")
            .eq("tenant_id", event.tenant_id)
            .maybeSingle();

          if (wConfig) {
            const phone = profile.phone.replace(/\D/g, "");
            if (phone.length >= 10) {
              await fetch(`https://api.ultramsg.com/${wConfig.instance_id}/messages/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token: wConfig.token,
                  to: phone.startsWith("55") ? phone : `55${phone}`,
                  body: reminderMsg,
                }),
              }).catch(console.error);
            }
          }
        }

        // Send Email
        if (profile.email) {
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (RESEND_API_KEY) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "noreply@equipe.aceleracaoforti.online",
                to: [profile.email],
                subject: `⏰ Lembrete: ${event.title} em ${hoursLabel}`,
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                    <h2 style="color:${tenant?.primary_color || '#6366f1'}">${tenantName}</h2>
                    <p>Olá ${firstName},</p>
                    <p>Lembrete: o evento <strong>${event.title}</strong> acontece em <strong>${hoursLabel}</strong>.</p>
                    <p>📅 ${formattedDate} ${formattedTime ? `às ${formattedTime}` : ""}</p>
                    ${event.meeting_url ? `<p><a href="${event.meeting_url}" style="background:${tenant?.primary_color || '#6366f1'};color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Acessar Reunião</a></p>` : ""}
                    <p style="color:#9ca3af;font-size:12px;margin-top:24px;">${tenantName}</p>
                  </div>
                `,
              }),
            }).catch(console.error);
          }
        }

        // Mark as sent
        await adminClient.from("event_mentee_reminders" as any)
          .update({ status: "sent", sent_at: now })
          .eq("id", reminder.id);
        
        processed++;
      } catch (e) {
        console.error("Reminder processing error:", e);
        await adminClient.from("event_mentee_reminders" as any)
          .update({ status: "failed" })
          .eq("id", reminder.id);
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("process-event-reminders error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
