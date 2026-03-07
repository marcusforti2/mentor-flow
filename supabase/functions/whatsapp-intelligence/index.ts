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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { tenant_id, analysis_type, custom_context } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch data for analysis
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get mentees with profiles
    const { data: memberships } = await adminClient
      .from("memberships")
      .select("id, user_id, created_at, status")
      .eq("tenant_id", tenant_id)
      .eq("role", "mentee")
      .eq("status", "active");

    const membershipIds = (memberships || []).map(m => m.id);
    const userIds = (memberships || []).map(m => m.user_id);

    // Fetch profiles
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Fetch recent activity
    const { data: activities } = await adminClient
      .from("activity_logs")
      .select("membership_id, action_type, created_at")
      .eq("tenant_id", tenant_id)
      .in("membership_id", membershipIds)
      .order("created_at", { ascending: false })
      .limit(500);

    // Fetch CRM leads
    const { data: leads } = await adminClient
      .from("crm_prospections")
      .select("membership_id, status, temperature, updated_at")
      .eq("tenant_id", tenant_id)
      .in("membership_id", membershipIds);

    // Fetch tasks
    const { data: tasks } = await adminClient
      .from("campan_tasks")
      .select("mentorado_membership_id, status_column, due_date")
      .eq("tenant_id", tenant_id)
      .in("mentorado_membership_id", membershipIds);

    // Build context for AI
    const menteeSummaries = (memberships || []).map(m => {
      const profile = profileMap.get(m.user_id);
      const memberActivities = (activities || []).filter(a => a.membership_id === m.id);
      const memberLeads = (leads || []).filter(l => l.membership_id === m.id);
      const memberTasks = (tasks || []).filter(t => t.mentorado_membership_id === m.id);
      const lastActivity = memberActivities[0]?.created_at;
      const daysSinceActivity = lastActivity
        ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        name: profile?.full_name || "Sem nome",
        hasPhone: !!profile?.phone,
        daysSinceJoin: Math.floor((Date.now() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        daysSinceActivity,
        totalActivities: memberActivities.length,
        leadsCount: memberLeads.length,
        hotLeads: memberLeads.filter(l => l.temperature === "hot").length,
        pendingTasks: memberTasks.filter(t => t.status_column === "todo" || t.status_column === "in_progress").length,
        overdueTasks: memberTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status_column !== "done").length,
      };
    });

    const analysisLabels: Record<string, string> = {
      follow_up: "Follow-up Inteligente — identifique quem precisa de atenção e crie cadências de acompanhamento",
      reactivation: "Reativação de Inativos — encontre mentorados sumidos e crie sequências para trazê-los de volta",
      onboarding: "Onboarding Sequencial — crie uma jornada de boas-vindas por WhatsApp para novos mentorados",
      nurturing: "Nutrição de Engajamento — mantenha mentorados ativos com conteúdo e lembretes estratégicos",
      upsell: "Upsell e Renovação — identifique mentorados prontos para upgrade ou renovação",
    };

    const systemPrompt = `Você é um especialista em inteligência comercial e automação de WhatsApp para mentorias de negócios.
Analise os dados dos mentorados e crie segmentos com cadências de follow-up personalizadas.

ANÁLISE SOLICITADA: ${analysisLabels[analysis_type] || analysisLabels.follow_up}
${custom_context ? `CONTEXTO ADICIONAL: ${custom_context}` : ""}

REGRAS:
- Crie 2-4 segmentos baseados nos dados reais
- Cada cadência deve ter 3-5 etapas espaçadas de forma inteligente
- Mensagens curtas (máx 300 chars), tom profissional com emojis moderados
- Use {{nome}} como placeholder
- Delays em dias inteiros (1, 2, 3, 7...)
- Seja específico sobre o objetivo de cada etapa
- Priorize por urgência (high > medium > low)`;

    const userPrompt = `Dados da base (${menteeSummaries.length} mentorados):
${JSON.stringify(menteeSummaries, null, 2)}

Gere os segmentos e cadências.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_intelligence_insights",
              description: "Returns segmented insights with follow-up cadences",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        segment: { type: "string", description: "Segment name" },
                        count: { type: "number", description: "Estimated count of contacts in this segment" },
                        recommendation: { type: "string", description: "Strategic recommendation for this segment" },
                        urgency: { type: "string", enum: ["high", "medium", "low"] },
                        cadence: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              day: { type: "number", description: "Day number (1, 2, 3, 7...)" },
                              channel: { type: "string", description: "whatsapp" },
                              message: { type: "string", description: "Message template (max 300 chars)" },
                              objective: { type: "string", description: "Goal of this step" },
                            },
                            required: ["day", "channel", "message", "objective"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["segment", "count", "recommendation", "urgency", "cadence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_intelligence_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao analisar com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou análise válida" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ insights: result.insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
