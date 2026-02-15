import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate auth
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { membership_id, conversation_id, message, lead_context } = await req.json();
    if (!membership_id || !message) throw new Error("membership_id and message required");

    // Resolve tenant
    const { data: membership } = await supabase
      .from("memberships")
      .select("tenant_id, user_id")
      .eq("id", membership_id)
      .single();
    if (!membership) throw new Error("Membership not found");
    const tenantId = membership.tenant_id;

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const title = message.length > 50 ? message.substring(0, 50) + "..." : message;
      const { data: conv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({ membership_id, tenant_id: tenantId, title })
        .select("id")
        .single();
      if (convErr) throw convErr;
      convId = conv.id;
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      conversation_id: convId, role: "user", content: message,
    });

    // Fetch conversation history (last 30 messages)
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(30);

    // ====== BUILD FULL CONTEXT ======
    const contextParts: string[] = [];

    // 1. Profile + business
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", membership.user_id)
      .maybeSingle();

    const { data: businessProfile } = await supabase
      .from("mentorado_business_profiles")
      .select("*")
      .eq("membership_id", membership_id)
      .maybeSingle();

    const { data: menteeProfile } = await supabase
      .from("mentee_profiles")
      .select("business_name, business_profile")
      .eq("membership_id", membership_id)
      .maybeSingle();

    contextParts.push(`PERFIL DO MENTORADO:
- Nome: ${profile?.full_name || "N/A"}
- Email: ${profile?.email || "N/A"}
- Negócio: ${menteeProfile?.business_name || businessProfile?.business_name || "N/A"}`);

    if (businessProfile) {
      contextParts.push(`PERFIL DO NEGÓCIO:
- Tipo: ${businessProfile.business_type || "N/A"}
- Oferta Principal: ${businessProfile.main_offer || "N/A"}
- Público-Alvo: ${businessProfile.target_audience || "N/A"}
- Proposta de Valor: ${businessProfile.unique_value_proposition || "N/A"}
- Faixa de Preço: ${businessProfile.price_range || "N/A"}`);
    }

    // 2. Trail progress
    const { data: trailProgress, count: completedLessons } = await supabase
      .from("trail_progress")
      .select("id", { count: "exact" })
      .eq("membership_id", membership_id)
      .eq("completed", true);

    const { data: certificates } = await supabase
      .from("certificates")
      .select("trail_id")
      .eq("membership_id", membership_id);

    contextParts.push(`PROGRESSO EM TRILHAS:
- Lições concluídas: ${completedLessons || 0}
- Certificados conquistados: ${certificates?.length || 0}`);

    // 3. CRM / Prospections summary
    const { data: prospections } = await supabase
      .from("crm_prospections")
      .select("status, temperature")
      .eq("membership_id", membership_id);

    if (prospections && prospections.length > 0) {
      const hot = prospections.filter(p => p.temperature === "hot").length;
      const warm = prospections.filter(p => p.temperature === "warm").length;
      const closed = prospections.filter(p => p.status === "fechado").length;
      contextParts.push(`CRM / PROSPECÇÕES:
- Total de leads: ${prospections.length}
- Quentes: ${hot} | Mornos: ${warm}
- Fechados: ${closed}
- Taxa de conversão: ${prospections.length > 0 ? ((closed / prospections.length) * 100).toFixed(1) : 0}%`);
    }

    // 4. Tasks summary
    const { data: tasks } = await supabase
      .from("campan_tasks")
      .select("status_column")
      .eq("mentorado_membership_id", membership_id);

    if (tasks && tasks.length > 0) {
      const done = tasks.filter(t => t.status_column === "done").length;
      const inProgress = tasks.filter(t => t.status_column === "doing").length;
      const pending = tasks.filter(t => t.status_column === "todo").length;
      contextParts.push(`TAREFAS:
- Total: ${tasks.length} | Concluídas: ${done} | Em andamento: ${inProgress} | Pendentes: ${pending}`);
    }

    // 5. Streak
    const { data: streak } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("membership_id", membership_id)
      .maybeSingle();

    if (streak) {
      contextParts.push(`ENGAJAMENTO:
- Ofensiva atual: ${streak.current_streak} dias
- Maior ofensiva: ${streak.longest_streak} dias`);
    }

    // 6. Behavioral analysis
    const { data: behavioral } = await supabase
      .from("mentee_behavioral_analyses")
      .select("behavioral_profile, motivation_triggers, execution_blockers")
      .eq("membership_id", membership_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (behavioral) {
      const bp = behavioral.behavioral_profile as any;
      contextParts.push(`PERFIL COMPORTAMENTAL:
- Tipo: ${bp?.type || "N/A"}
- Resumo: ${bp?.summary || "N/A"}`);
    }

    const fullContext = contextParts.join("\n\n");

    // Build system prompt
    const systemPrompt = `Você é um Mentor Virtual inteligente e personalizado. Você conhece profundamente o mentorado e todo seu histórico na plataforma.

${fullContext}

${lead_context ? `\nCONTEXTO DO LEAD SELECIONADO:\n${lead_context}` : ""}

SUAS DIRETRIZES:
- Você é um coach de vendas de alto ticket, disponível 24/7
- Personalize TODAS as respostas com base no contexto acima
- Referencie dados concretos (nº de leads, progresso, streaks) quando relevante
- Seja direto, prático e motivador
- Sempre termine com uma ação clara ou próximo passo
- Formate respostas em Markdown para melhor legibilidade
- Quando não souber algo específico, pergunte ao mentorado
- Celebre conquistas do mentorado quando oportuno (certificados, streak, leads fechados)`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // Stream response
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error("AI Gateway error");
    }

    // Track usage
    try {
      await supabase.from("ai_tool_usage").insert({
        tool_type: "contextual_chat",
        membership_id,
        tenant_id: tenantId,
      });
    } catch (e) {
      console.warn("Failed to track usage:", e);
    }

    // We need to tee the stream: one for client, one to collect full response for saving
    const [clientStream, saveStream] = aiResponse.body!.tee();

    // Save assistant message in background
    const savePromise = (async () => {
      const reader = saveStream.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullContent += content;
            } catch { /* partial */ }
          }
        }
      } catch (e) {
        console.warn("Error reading save stream:", e);
      }

      if (fullContent) {
        await supabase.from("chat_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: fullContent,
        });
      }
    })();

    // Don't await savePromise — let it run in background
    savePromise.catch(e => console.warn("Save message error:", e));

    // Return stream to client with conversation_id header
    return new Response(clientStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Conversation-Id": convId,
      },
    });
  } catch (error) {
    console.error("Contextual chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
