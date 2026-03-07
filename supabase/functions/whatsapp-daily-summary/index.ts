import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { tenant_id, date } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if summary already exists
    const { data: existing } = await adminClient
      .from("whatsapp_daily_summaries")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("summary_date", targetDate)
      .maybeSingle();

    if (existing?.full_summary) {
      return new Response(JSON.stringify({ summary: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch incoming messages for the day
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data: incomingMsgs } = await adminClient
      .from("whatsapp_incoming_messages")
      .select("from_phone, from_name, message_body, ai_reply_sent, ai_reply_text, status, created_at")
      .eq("tenant_id", tenant_id)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: true });

    // Fetch sent messages for the day
    const { data: sentMsgs } = await adminClient
      .from("whatsapp_message_logs" as any)
      .select("recipient_phone, recipient_name, message_body, status, sent_at")
      .eq("tenant_id", tenant_id)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const totalReceived = incomingMsgs?.length || 0;
    const totalSent = sentMsgs?.length || 0;
    const totalAutoReplies = incomingMsgs?.filter(m => m.ai_reply_sent).length || 0;

    if (totalReceived === 0 && totalSent === 0) {
      const emptySummary = {
        tenant_id,
        summary_date: targetDate,
        total_messages_received: 0,
        total_messages_sent: 0,
        total_auto_replies: 0,
        highlights: [],
        pending_items: [],
        next_steps: [],
        full_summary: "Nenhuma atividade de WhatsApp registrada neste dia.",
      };

      const { data: saved } = await adminClient
        .from("whatsapp_daily_summaries")
        .upsert(emptySummary, { onConflict: "tenant_id,summary_date" })
        .select()
        .single();

      return new Response(JSON.stringify({ summary: saved }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group conversations by phone
    const conversations: Record<string, { name: string; messages: string[] }> = {};
    for (const msg of (incomingMsgs || [])) {
      const key = msg.from_phone;
      if (!conversations[key]) conversations[key] = { name: msg.from_name || key, messages: [] };
      conversations[key].messages.push(`[${msg.created_at.slice(11, 16)}] ${msg.from_name || "Cliente"}: ${msg.message_body}`);
      if (msg.ai_reply_text) {
        conversations[key].messages.push(`[${msg.created_at.slice(11, 16)}] Assistente: ${msg.ai_reply_text}`);
      }
    }

    const conversationsSummary = Object.entries(conversations).map(([phone, data]) => 
      `📱 ${data.name} (${phone}):\n${data.messages.join("\n")}`
    ).join("\n\n---\n\n");

    const systemPrompt = `Você é um analista de comunicação de uma mentoria de negócios.
Gere um resumo executivo do dia de WhatsApp.

REGRAS:
- Identifique os destaques mais importantes
- Liste pendências que precisam de ação
- Sugira próximos passos concretos
- Seja conciso e orientado a ação
- Use emojis moderadamente`;

    const userPrompt = `Data: ${targetDate}
Mensagens recebidas: ${totalReceived}
Mensagens enviadas: ${totalSent}
Respostas automáticas: ${totalAutoReplies}

CONVERSAS DO DIA:
${conversationsSummary}

Gere o resumo executivo.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_daily_summary",
              description: "Creates a structured daily summary",
              parameters: {
                type: "object",
                properties: {
                  highlights: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key highlights of the day",
                  },
                  pending_items: {
                    type: "array",
                    items: { type: "string" },
                    description: "Items needing follow-up",
                  },
                  next_steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recommended next steps",
                  },
                  full_summary: {
                    type: "string",
                    description: "Full narrative summary",
                  },
                },
                required: ["highlights", "pending_items", "next_steps", "full_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_daily_summary" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall?.function?.arguments
      ? JSON.parse(toolCall.function.arguments)
      : { highlights: [], pending_items: [], next_steps: [], full_summary: "Erro ao gerar resumo." };

    const summaryData = {
      tenant_id,
      summary_date: targetDate,
      total_messages_received: totalReceived,
      total_messages_sent: totalSent,
      total_auto_replies: totalAutoReplies,
      highlights: result.highlights,
      pending_items: result.pending_items,
      next_steps: result.next_steps,
      full_summary: result.full_summary,
    };

    const { data: saved } = await adminClient
      .from("whatsapp_daily_summaries")
      .upsert(summaryData, { onConflict: "tenant_id,summary_date" })
      .select()
      .single();

    return new Response(JSON.stringify({ summary: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-daily-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
