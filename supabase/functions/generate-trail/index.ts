import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const {
      idea, numModules, numLessonsPerModule, equipment, recordStyle, videoFormat,
      extraNotes, sourceUrl, sourceText
    } = await req.json();

    if (!idea && !sourceUrl && !sourceText) throw new Error("idea, sourceUrl or sourceText is required");

    const hasCustomStructure = numModules && numLessonsPerModule;
    const structureRules = hasCustomStructure
      ? `- Crie EXATAMENTE ${numModules} módulos\n- Cada módulo deve ter EXATAMENTE ${numLessonsPerModule} aulas\n- Total de aulas: ${numModules * numLessonsPerModule}`
      : `- Máximo de 15 aulas no total (distribuídas entre os módulos)\n- Cada módulo deve ter 2-5 aulas\n- Máximo de 5 módulos`;

    const equipmentMap: Record<string, string> = {
      celular: "celular/smartphone", webcam: "webcam ou câmera do notebook",
      camera_pro: "câmera profissional (DSLR/mirrorless)", tela: "gravação de tela (screencast)",
    };
    const styleMap: Record<string, string> = {
      talking_head: "talking head (pessoa falando para câmera)", tela_narrada: "gravação de tela com narração",
      roleplay: "roleplay/simulação de cenários reais", slides: "slides com narração em off",
      misto: "formato misto (variar entre talking head, tela e simulação conforme a aula)",
    };
    const formatMap: Record<string, string> = {
      curto: "3-5 minutos por aula", medio: "5-10 minutos por aula", longo: "10-20 minutos por aula",
    };

    const equipDesc = equipmentMap[equipment] || "celular/smartphone";
    const styleDesc = styleMap[recordStyle] || "talking head";
    const formatDesc = formatMap[videoFormat] || "5-10 minutos por aula";
    const extraSection = extraNotes ? `\n\nINSTRUÇÕES EXTRAS DO MENTOR:\n${extraNotes}` : "";

    // Build source context
    let sourceContext = "";
    if (sourceUrl) {
      sourceContext = `\n\nFONTE DE REFERÊNCIA (URL): ${sourceUrl}\nExtraia os temas, conceitos e tópicos desta URL para estruturar a trilha.`;
    }
    if (sourceText) {
      const truncated = sourceText.length > 8000 ? sourceText.substring(0, 8000) + "..." : sourceText;
      sourceContext = `\n\nCONTEÚDO DE REFERÊNCIA (transcrição/texto):\n---\n${truncated}\n---\nExtraia os temas, conceitos e tópicos deste conteúdo para estruturar a trilha. Organize de forma pedagógica progressiva.`;
    }

    const systemPrompt = `Você é um especialista em design instrucional para mentorias de negócios e vendas.

O usuário vai descrever uma ideia de trilha de conteúdo (ou fornecer conteúdo de referência) e você deve gerar a estrutura completa.

CONTEXTO DE GRAVAÇÃO:
- Equipamento disponível: ${equipDesc}
- Estilo de gravação preferido: ${styleDesc}
- Duração ideal: ${formatDesc}${extraSection}${sourceContext}

REGRAS IMPORTANTES:
${structureRules}
- Títulos curtos e objetivos (máx 50 chars)
- Descrições práticas e diretas (1-2 frases)
- Cada aula deve ter uma "dica_gravacao" com sugestões práticas de como gravar aquela aula, CONSIDERANDO o equipamento (${equipDesc}), estilo (${styleDesc}) e duração (${formatDesc}). Inclua: setup do equipamento, iluminação, enquadramento, roteiro resumido e duração sugerida em minutos.
- Cada aula deve ter "duration_minutes" com a duração estimada em minutos (número inteiro).
- A trilha deve ser progressiva (do básico ao avançado)
- Foque em conteúdo prático e aplicável para mentorados

RESPONDA usando a tool "create_trail_structure".`;

    const userPrompt = idea
      ? `Ideia da trilha: ${idea}`
      : sourceText
        ? "Crie uma trilha de conteúdo baseada no material de referência fornecido."
        : `Crie uma trilha baseada no conteúdo da URL: ${sourceUrl}`;

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
        temperature: 0.4,
        max_tokens: 6000,
        tools: [{
          type: "function",
          function: {
            name: "create_trail_structure",
            description: "Create the full trail structure with modules and lessons",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Trail title (max 50 chars)" },
                description: { type: "string", description: "Brief trail description (1-2 sentences)" },
                modules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      lessons: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            dica_gravacao: { type: "string" },
                            duration_minutes: { type: "integer" },
                          },
                          required: ["title", "description", "dica_gravacao", "duration_minutes"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["title", "description", "lessons"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "description", "modules"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_trail_structure" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      throw new Error(`AI error: ${response.status} - ${t}`);
    }

    const data = await response.json();

    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try content as JSON
    let raw = data.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(raw);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-trail error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});