import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Verify user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const {
      tenant_id,
      campaign_id,
      // For individual send
      phone: singlePhone,
      message: singleMessage,
      recipient_membership_id: singleRecipientId,
      recipient_name: singleRecipientName,
      // For campaign send
      audience_type,
      audience_membership_ids,
      message_template,
      use_ai_personalization,
    } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant WhatsApp config
    const { data: whatsappConfig } = await adminClient
      .from("tenant_whatsapp_config")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (!whatsappConfig || !whatsappConfig.ultramsg_instance_id || !whatsappConfig.ultramsg_token) {
      return new Response(JSON.stringify({ error: "WhatsApp não configurado para este tenant. Configure o Instance ID e Token nas configurações." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!whatsappConfig.is_active) {
      return new Response(JSON.stringify({ error: "Integração WhatsApp está desativada para este tenant." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const INSTANCE_ID = whatsappConfig.ultramsg_instance_id;
    const TOKEN = whatsappConfig.ultramsg_token;
    const senderName = whatsappConfig.sender_name || "MentorFlow";

    // Helper: send via UltraMsg
    async function sendWhatsApp(phone: string, message: string) {
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

      const response = await fetch(`https://api.ultramsg.com/${INSTANCE_ID}/messages/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: TOKEN, to: formattedPhone, body: message }),
      });

      const data = await response.json();
      return { success: !data.error && response.ok, data, formattedPhone };
    }

    // Helper: personalize with AI
    async function personalizeMessage(template: string, recipientName: string): Promise<string> {
      if (!use_ai_personalization || !LOVABLE_API_KEY) {
        return template.replace(/\{\{nome\}\}/g, recipientName).replace(/\{\{[a-z_]+\}\}/g, "");
      }

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Você é um assistente de comunicação de mentoria. Personalize a mensagem de WhatsApp abaixo para o destinatário "${recipientName}". Mantenha o tom motivacional e profissional. Substitua placeholders como {{nome}} pelo nome real. Responda APENAS com a mensagem pronta, sem comentários.`,
              },
              { role: "user", content: template },
            ],
          }),
        });

        if (!response.ok) throw new Error("AI error");
        const data = await response.json();
        return data.choices?.[0]?.message?.content || template.replace(/\{\{nome\}\}/g, recipientName);
      } catch {
        return template.replace(/\{\{nome\}\}/g, recipientName).replace(/\{\{[a-z_]+\}\}/g, "");
      }
    }

    // ======== INDIVIDUAL SEND ========
    if (singlePhone && singleMessage) {
      const result = await sendWhatsApp(singlePhone, singleMessage);

      // Log the message
      await adminClient.from("whatsapp_message_logs").insert({
        tenant_id,
        campaign_id: campaign_id || null,
        recipient_membership_id: singleRecipientId || null,
        recipient_phone: result.formattedPhone,
        recipient_name: singleRecipientName || null,
        message_body: singleMessage,
        status: result.success ? "sent" : "error",
        error_message: result.success ? null : JSON.stringify(result.data),
        sent_at: result.success ? new Date().toISOString() : null,
      });

      return new Response(JSON.stringify({ success: result.success, data: result.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ======== CAMPAIGN SEND ========
    if (!message_template) {
      return new Response(JSON.stringify({ error: "message_template obrigatório para campanha" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get mentees based on audience
    let membershipsQuery = adminClient
      .from("memberships")
      .select("id, user_id, role, status")
      .eq("tenant_id", tenant_id)
      .eq("status", "active")
      .eq("role", "mentee");

    if (audience_type === "specific" && audience_membership_ids?.length > 0) {
      membershipsQuery = membershipsQuery.in("id", audience_membership_ids);
    }

    const { data: mentees } = await membershipsQuery;
    if (!mentees || mentees.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum mentorado encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles with phone numbers
    const userIds = mentees.map((m: any) => m.user_id);
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const results: any[] = [];
    let sentCount = 0;
    let errorCount = 0;

    for (const mentee of mentees) {
      const profile = profileMap.get(mentee.user_id);
      if (!profile?.phone) {
        results.push({ membership_id: mentee.id, name: profile?.full_name || "?", error: "Sem telefone cadastrado" });
        errorCount++;
        continue;
      }

      try {
        const personalizedMsg = await personalizeMessage(message_template, profile.full_name || "");
        const result = await sendWhatsApp(profile.phone, personalizedMsg);

        // Log
        await adminClient.from("whatsapp_message_logs").insert({
          tenant_id,
          campaign_id: campaign_id || null,
          recipient_membership_id: mentee.id,
          recipient_phone: result.formattedPhone,
          recipient_name: profile.full_name,
          message_body: personalizedMsg,
          status: result.success ? "sent" : "error",
          error_message: result.success ? null : JSON.stringify(result.data),
          sent_at: result.success ? new Date().toISOString() : null,
        });

        if (result.success) sentCount++;
        else errorCount++;

        results.push({
          membership_id: mentee.id,
          name: profile.full_name,
          phone: result.formattedPhone,
          success: result.success,
        });

        // Delay between messages
        if (mentees.length > 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (err) {
        errorCount++;
        results.push({
          membership_id: mentee.id,
          name: profile?.full_name,
          error: err instanceof Error ? err.message : "Erro",
        });
      }
    }

    // Update campaign stats if campaign_id
    if (campaign_id) {
      await adminClient
        .from("whatsapp_campaigns")
        .update({
          status: "sent",
          sent_count: sentCount,
          error_count: errorCount,
          sent_at: new Date().toISOString(),
        })
        .eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: mentees.length,
        sent: sentCount,
        errors: errorCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-whatsapp error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
