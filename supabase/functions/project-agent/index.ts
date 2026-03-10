import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a Elo, assistente inteligente feminina da plataforma MentorFlow. Sua missão é ajudar o mentor a criar projetos completos de forma conversacional.

## Personalidade
- Copiloto executiva: sofisticada, carismática, estratégica
- Respostas curtas (1-3 frases), diretas e acionáveis
- Concordância feminina (ex: "estou pronta", "já organizei")

## Fluxo de conversa
1. Pergunte sobre o objetivo do projeto (qual problema resolve, resultado esperado)
2. Entenda o escopo: quais entregas, prazos, complexidade
3. Pergunte se há metas/OKRs específicas ou se deve sugerir
4. Pergunte sobre metodologia: sprints ou fluxo contínuo
5. Quando tiver informações suficientes, use a tool create_full_project para montar tudo

## Regras
- Nunca crie o projeto sem entender pelo menos: nome, objetivo e entregas principais
- Sugira nomes criativos quando o mentor não tiver um
- Organize tarefas em grupos lógicos com prioridades variadas
- Inclua checklists detalhados nas tarefas mais complexas
- Se o mentor pedir algo simples, adapte (não force sprints/OKRs se não faz sentido)
- Use emojis com moderação para dar vida às respostas`;

const CREATE_PROJECT_TOOL = {
  type: "function",
  function: {
    name: "create_full_project",
    description: "Cria um projeto completo com tarefas, sprints, metas e automações baseado na conversa com o mentor",
    parameters: {
      type: "object",
      properties: {
        project: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nome do projeto" },
            description: { type: "string", description: "Descrição do projeto" },
            color: { type: "string", description: "Cor hex do projeto (ex: #8B5CF6)" },
          },
          required: ["name", "description", "color"],
        },
        statuses: {
          type: "array",
          description: "Status personalizados do projeto (além dos padrão)",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              color: { type: "string" },
              status_key: { type: "string" },
              position: { type: "number" },
              is_done: { type: "boolean" },
            },
            required: ["name", "color", "status_key", "position", "is_done"],
          },
        },
        tasks: {
          type: "array",
          description: "Lista de tarefas do projeto",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
              status_key: { type: "string", description: "Key do status desta tarefa" },
              tags: { type: "array", items: { type: "string" } },
              estimated_minutes: { type: "number" },
              checklist: { type: "array", items: { type: "string" }, description: "Itens de checklist" },
              sprint_index: { type: "number", description: "Índice do sprint (0-based), null se backlog" },
            },
            required: ["title", "priority", "status_key"],
          },
        },
        sprints: {
          type: "array",
          description: "Sprints do projeto",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              start_date: { type: "string", description: "YYYY-MM-DD" },
              end_date: { type: "string", description: "YYYY-MM-DD" },
              goal: { type: "string" },
            },
            required: ["name", "start_date", "end_date"],
          },
        },
        goals: {
          type: "array",
          description: "Metas/OKRs do projeto",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              target_value: { type: "number" },
              unit: { type: "string" },
              due_date: { type: "string" },
              key_results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    target_value: { type: "number" },
                    unit: { type: "string" },
                  },
                  required: ["name"],
                },
              },
            },
            required: ["name"],
          },
        },
      },
      required: ["project", "statuses", "tasks"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Auth
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { messages, membership_id, tenant_id } = await req.json();

    // Call AI
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        tools: [CREATE_PROJECT_TOOL],
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await aiResp.text();
      console.error("AI error:", aiResp.status, txt);
      throw new Error("AI gateway error");
    }

    // Read full response (need to check for tool calls)
    const reader = aiResp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let toolCallArgs = "";
    let toolCallName = "";
    let hasToolCall = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") continue;

        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) fullContent += delta.content;
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.function?.name) toolCallName = tc.function.name;
              if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
              hasToolCall = true;
            }
          }
        } catch {}
      }
    }

    // If tool call, execute it
    if (hasToolCall && toolCallName === "create_full_project") {
      const args = JSON.parse(toolCallArgs);
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // 1. Create project
      const { data: project, error: projErr } = await supabaseAdmin
        .from("mentor_projects")
        .insert({
          name: args.project.name,
          description: args.project.description,
          color: args.project.color,
          tenant_id,
          membership_id,
        })
        .select("id")
        .single();

      if (projErr) throw projErr;
      const projectId = project.id;

      // 2. Create statuses
      const statusMap: Record<string, string> = {};
      if (args.statuses?.length) {
        const { data: createdStatuses } = await supabaseAdmin
          .from("mentor_task_statuses")
          .insert(args.statuses.map((s: any) => ({
            project_id: projectId,
            name: s.name,
            color: s.color,
            status_key: s.status_key,
            position: s.position,
            is_done: s.is_done,
          })))
          .select("id, status_key");

        for (const s of createdStatuses || []) {
          statusMap[s.status_key] = s.id;
        }
      }

      // 3. Create sprints
      const sprintIds: string[] = [];
      if (args.sprints?.length) {
        const { data: createdSprints } = await supabaseAdmin
          .from("mentor_sprints")
          .insert(args.sprints.map((s: any) => ({
            project_id: projectId,
            tenant_id,
            membership_id,
            name: s.name,
            start_date: s.start_date,
            end_date: s.end_date,
            goal: s.goal || null,
          })))
          .select("id");

        for (const s of createdSprints || []) sprintIds.push(s.id);
      }

      // 4. Create tasks
      if (args.tasks?.length) {
        for (const t of args.tasks) {
          const { data: task } = await supabaseAdmin
            .from("mentor_tasks")
            .insert({
              project_id: projectId,
              tenant_id,
              membership_id,
              title: t.title,
              description: t.description || null,
              priority: t.priority,
              status_id: statusMap[t.status_key] || null,
              tags: t.tags || [],
              estimated_minutes: t.estimated_minutes || null,
              sprint_id: t.sprint_index != null && sprintIds[t.sprint_index] ? sprintIds[t.sprint_index] : null,
            })
            .select("id")
            .single();

          // Create checklist items
          if (task && t.checklist?.length) {
            await supabaseAdmin
              .from("mentor_task_checklists")
              .insert(t.checklist.map((item: string, i: number) => ({
                task_id: task.id,
                title: item,
                position: i,
              })));
          }
        }
      }

      // 5. Create goals
      if (args.goals?.length) {
        for (const g of args.goals) {
          const { data: goal } = await supabaseAdmin
            .from("mentor_goals")
            .insert({
              project_id: projectId,
              tenant_id,
              membership_id,
              name: g.name,
              description: g.description || null,
              target_value: g.target_value || 100,
              unit: g.unit || "%",
              due_date: g.due_date || null,
            })
            .select("id")
            .single();

          if (goal && g.key_results?.length) {
            await supabaseAdmin
              .from("mentor_key_results")
              .insert(g.key_results.map((kr: any) => ({
                goal_id: goal.id,
                name: kr.name,
                target_value: kr.target_value || 100,
                unit: kr.unit || "%",
              })));
          }
        }
      }

      // Return success with summary
      const summary = `✅ Projeto "${args.project.name}" criado com sucesso!\n\n` +
        `📋 ${args.tasks?.length || 0} tarefas criadas\n` +
        `🏃 ${args.sprints?.length || 0} sprints configuradas\n` +
        `🎯 ${args.goals?.length || 0} metas definidas\n\n` +
        `Tudo organizado e pronto pra começar! 🚀`;

      return new Response(JSON.stringify({
        content: summary,
        project_id: projectId,
        created: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular chat response
    return new Response(JSON.stringify({
      content: fullContent,
      created: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("project-agent error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
