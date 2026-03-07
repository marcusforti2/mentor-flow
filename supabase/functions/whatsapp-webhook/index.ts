import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const body = await req.json();

    // Support both webhook (from UltraMsg) and authenticated manual trigger
    const isWebhook = body.event_type === "message_received" || body.data?.from;
    
    if (isWebhook) {
      // --- WEBHOOK MODE: receive incoming message from UltraMsg ---
      const msgData = body.data || body;
      const fromPhone = msgData.from?.replace("@c.us", "") || msgData.from_phone;
      const messageBody = msgData.body || msgData.message_body || "";
      const fromName = msgData.pushName || msgData.from_name || null;
      const messageType = msgData.type || "text";
      const mediaUrl = msgData.media || null;
      const ultramsgId = msgData.id || null;

      if (!fromPhone || !messageBody) {
        return new Response(JSON.stringify({ ok: true, skipped: "no content" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Find which tenant this message belongs to by matching phone in profiles
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, phone")
        .ilike("phone", `%${fromPhone.slice(-10)}`);

      let tenantId: string | null = null;
      let matchedMembershipId: string | null = null;

      if (profiles && profiles.length > 0) {
        for (const profile of profiles) {
          const { data: membership } = await adminClient
            .from("memberships")
            .select("id, tenant_id")
            .eq("user_id", profile.user_id)
            .eq("status", "active")
            .limit(1)
            .maybeSingle();

          if (membership) {
            tenantId = membership.tenant_id;
            matchedMembershipId = membership.id;
            break;
          }
        }
      }

      // If no tenant found, try to match via whatsapp_config
      if (!tenantId) {
        const { data: configs } = await adminClient
          .from("whatsapp_config" as any)
          .select("tenant_id")
          .eq("is_active", true);

        if (configs && configs.length === 1) {
          tenantId = (configs[0] as any).tenant_id;
        } else {
          return new Response(JSON.stringify({ ok: true, skipped: "no tenant match" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Save incoming message
      const { data: savedMsg } = await adminClient
        .from("whatsapp_incoming_messages")
        .insert({
          tenant_id: tenantId,
          from_phone: fromPhone,
          from_name: fromName,
          message_body: messageBody,
          message_type: messageType,
          media_url: mediaUrl,
          ultramsg_message_id: ultramsgId,
          matched_membership_id: matchedMembershipId,
        })
        .select()
        .single();

      // Check auto-reply config
      const { data: autoReplyConfig } = await adminClient
        .from("whatsapp_auto_reply_config")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (autoReplyConfig?.is_enabled && LOVABLE_API_KEY) {
        // Check business hours
        const now = new Date();
        const hour = now.getUTCHours() - 3; // BRT approximation
        const inBusinessHours = !autoReplyConfig.only_business_hours ||
          (hour >= autoReplyConfig.business_hours_start && hour < autoReplyConfig.business_hours_end);

        if (inBusinessHours) {
          // Get context about the contact
          let contactContext = "";
          if (matchedMembershipId) {
            const { data: tasks } = await adminClient
              .from("campan_tasks")
              .select("title, status_column, due_date")
              .eq("mentorado_membership_id", matchedMembershipId)
              .neq("status_column", "done")
              .limit(5);

            const { data: events } = await adminClient
              .from("calendar_events")
              .select("title, event_date, event_time")
              .eq("tenant_id", tenantId)
              .gte("event_date", new Date().toISOString().split("T")[0])
              .limit(3);

            contactContext = `
Contexto do contato (${fromName || fromPhone}):
- Mentorado ativo na plataforma
- Tarefas pendentes: ${tasks?.map(t => `${t.title} (${t.status_column})`).join(", ") || "nenhuma"}
- Próximos eventos: ${events?.map(e => `${e.title} em ${e.event_date}`).join(", ") || "nenhum"}`;
          }

          // Fetch recent conversation history
          const { data: recentMsgs } = await adminClient
            .from("whatsapp_incoming_messages")
            .select("from_phone, message_body, ai_reply_text, created_at")
            .eq("tenant_id", tenantId)
            .eq("from_phone", fromPhone)
            .order("created_at", { ascending: false })
            .limit(5);

          const conversationHistory = (recentMsgs || []).reverse().map(m => {
            const parts = [`Cliente: ${m.message_body}`];
            if (m.ai_reply_text) parts.push(`Assistente: ${m.ai_reply_text}`);
            return parts.join("\n");
          }).join("\n");

          const systemPrompt = `Você é ${autoReplyConfig.ai_persona || "um assistente virtual de mentoria"}.
${autoReplyConfig.custom_instructions || ""}

REGRAS:
- Responda de forma curta e direta (máx 200 caracteres)
- Use tom profissional com emojis moderados
- Se o assunto for complexo, diga que vai encaminhar para o mentor
- ${autoReplyConfig.qualify_leads ? "Se parecer um potencial lead, pergunte sobre o negócio" : ""}
- NUNCA invente informações que você não tem
${contactContext}

Histórico recente:
${conversationHistory}`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: messageBody },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const replyText = aiData.choices?.[0]?.message?.content?.trim();

            if (replyText) {
              // Get WhatsApp config to send reply
              const { data: whatsappConfig } = await adminClient
                .from("whatsapp_config" as any)
                .select("ultramsg_instance_id, ultramsg_token")
                .eq("tenant_id", tenantId)
                .maybeSingle();

              if (whatsappConfig) {
                const cfg = whatsappConfig as any;
                // Send via UltraMsg
                const sendResponse = await fetch(
                  `https://api.ultramsg.com/${cfg.ultramsg_instance_id}/messages/chat`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      token: cfg.ultramsg_token,
                      to: fromPhone,
                      body: replyText,
                    }),
                  }
                );

                // Update saved message with AI reply
                if (savedMsg) {
                  await adminClient
                    .from("whatsapp_incoming_messages")
                    .update({
                      ai_reply_sent: true,
                      ai_reply_text: replyText,
                      status: "replied",
                      processed_at: new Date().toISOString(),
                    })
                    .eq("id", savedMsg.id);
                }

                // Log the sent reply
                await adminClient
                  .from("whatsapp_message_logs" as any)
                  .insert({
                    tenant_id: tenantId,
                    recipient_phone: fromPhone,
                    recipient_name: fromName,
                    message_body: replyText,
                    status: "sent",
                    sent_at: new Date().toISOString(),
                  } as any);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, saved: !!savedMsg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- AUTHENTICATED MODE: manual actions ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { action, tenant_id } = body;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "get_config") {
      const { data } = await adminClient
        .from("whatsapp_auto_reply_config")
        .select("*")
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      return new Response(JSON.stringify({ config: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_config") {
      const { config } = body;
      const { data, error } = await adminClient
        .from("whatsapp_auto_reply_config")
        .upsert({
          tenant_id,
          ...config,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ config: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_conversations") {
      // Get grouped conversations
      const { data: messages } = await adminClient
        .from("whatsapp_incoming_messages")
        .select("*")
        .eq("tenant_id", tenant_id)
        .order("created_at", { ascending: false })
        .limit(200);

      // Group by phone
      const grouped: Record<string, any[]> = {};
      for (const msg of (messages || [])) {
        const key = msg.from_phone;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(msg);
      }

      const conversations = Object.entries(grouped).map(([phone, msgs]) => ({
        phone,
        name: msgs[0].from_name || phone,
        lastMessage: msgs[0].message_body,
        lastAt: msgs[0].created_at,
        totalMessages: msgs.length,
        autoReplied: msgs.filter((m: any) => m.ai_reply_sent).length,
        matched: !!msgs[0].matched_membership_id,
      }));

      return new Response(JSON.stringify({ conversations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
