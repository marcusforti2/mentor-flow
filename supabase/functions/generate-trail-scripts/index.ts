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

    const { mentorName, trailTitle, moduleTitle, lessons, deadline, equipment, recordStyle, videoDuration, extraNotes } = await req.json();

    const equipmentMap: Record<string, string> = {
      celular: "celular/smartphone", webcam: "webcam do notebook/computador",
      camera_pro: "câmera profissional (DSLR/mirrorless)", tela: "gravação de tela (screencast)",
    };
    const styleMap: Record<string, string> = {
      talking_head: "talking head (rosto na câmera)", tela_narrada: "narração sobre tela",
      roleplay: "simulação/roleplay", slides: "apresentação de slides", misto: "formato misto",
    };
    const durationMap: Record<string, string> = { "3-5": "3 a 5 minutos", "5-10": "5 a 10 minutos", "10-20": "10 a 20 minutos" };
    const equipDesc = equipmentMap[equipment] || "celular/smartphone";
    const styleDesc = styleMap[recordStyle] || "talking head";
    const durationDesc = durationMap[videoDuration] || "5 a 10 minutos";

    const lessonsInfo = lessons.map((l: any, i: number) => {
      return `Aula ${i + 1}: "${l.title}" - ${l.description || "Sem descrição"}`;
    }).join("\n");

    const systemPrompt = `Você é um gestor de conteúdo de mentorias. Escreva uma mensagem de WhatsApp motivacional e profissional para um mentor que vai gravar aulas de uma trilha.

CONTEXTO DE GRAVAÇÃO:
- Equipamento: ${equipDesc}
- Estilo de vídeo: ${styleDesc}
- Duração ideal por aula: ${durationDesc}
${extraNotes ? `- Observações extras: ${extraNotes}` : ""}

A mensagem deve ter:
1. ABERTURA motivacional
2. CONTEXTO da trilha e módulo
3. LISTA DE AULAS com roteiro resumido, dicas de gravação e duração
4. PRAZO (se houver)
5. CHECKLIST FINAL (✅ itens)

REGRAS:
- Formatação WhatsApp: *negrito*, _itálico_
- NÃO use markdown (##, ###)
- Use emojis profissionais
- Quebre em blocos com separadores (───)
- Máximo 2500 caracteres`;

    const userPrompt = `Nome: ${mentorName || "Mentor"}
Trilha: "${trailTitle}"
Módulo: "${moduleTitle || "Módulo único"}"
${deadline ? `Prazo: ${deadline}` : "Sem prazo definido"}

Aulas para gravar:
${lessonsInfo}

Gere a mensagem completa de WhatsApp.`;

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
        temperature: 0.5,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      throw new Error(`AI error: ${response.status} - ${t}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-trail-scripts error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
