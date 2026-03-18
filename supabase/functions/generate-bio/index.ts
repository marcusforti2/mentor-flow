import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      platform, 
      style,
      niche,
      targetAudience,
      mainResult,
      differentiator,
      businessProfile 
    } = await req.json();

    if (!niche) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nicho é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating bio for:', platform, 'style:', style, 'niche:', niche);

    const platformSpecs: Record<string, string> = {
      instagram: `INSTAGRAM (max 150 caracteres):
- Bio CURTA e IMPACTANTE
- Use emojis estrategicamente (3-5 max)
- Inclua CTA claro (link na bio, DM, etc)
- Quebre linhas para facilitar leitura
- Foque em UMA promessa principal
- Pode incluir 1-2 hashtags relevantes`,

      linkedin: `LINKEDIN:
- HEADLINE (max 220 chars): Frase de impacto que aparece abaixo do nome
- BIO/RESUMO (max 300 chars): Versão condensada focada em resultados
- Tom mais profissional mas ainda com personalidade
- Mencione credenciais/números quando possível
- CTA para conexão ou conversa`,

      whatsapp: `WHATSAPP BUSINESS (max 139 caracteres):
- Status comercial ultra-conciso
- Foque no benefício principal
- Use 1-2 emojis no máximo
- Inclua CTA direto (Chame agora, Agende, etc)
- Pode mencionar horário de atendimento`,
    };

    const styleInstructions: Record<string, string> = {
      authority: `ESTILO AUTORIDADE:
- Posicione-se como O especialista
- Use palavras como: especialista, referência, método exclusivo, +X anos
- Tom confiante sem ser arrogante
- Mencione resultados/números impressionantes
- Ideal para high ticket`,

      approachable: `ESTILO ACESSÍVEL:
- Tom amigável e próximo
- Use linguagem do dia-a-dia
- Mostre o lado humano
- Emojis mais casuais
- Conecte com dores de forma empática`,

      results: `ESTILO RESULTADOS:
- Foco em números e transformações
- Use métricas específicas
- Estrutura: Problema → Solução → Resultado
- Social proof implícito
- Ideal para quem tem cases comprovados`,

      storytelling: `ESTILO STORYTELLING:
- Mini-narrativa envolvente
- De X para Y (transformação pessoal)
- Crie curiosidade
- Humanize sua jornada
- Conecte emocionalmente`,
    };

    const systemPrompt = `Você é um COPYWRITER ESPECIALISTA em bios de alta conversão para profissionais de alto ticket.

SEU PAPEL: Criar bios que param o scroll, geram curiosidade e convertem visitantes em seguidores/clientes.

REGRAS CRÍTICAS:
1. RESPEITE os limites de caracteres de cada plataforma RIGOROSAMENTE
2. Cada bio deve ser ÚNICA - não repita estruturas
3. Use emojis com PROPÓSITO, não decoração
4. O CTA deve ser claro e acionável
5. Foque na TRANSFORMAÇÃO, não no processo
6. Evite clichês como "apaixonado por", "ajudo pessoas"
7. Seja específico sobre resultados quando possível

FÓRMULAS DE BIO QUE CONVERTEM:
- [Resultado] para [Público] em [Tempo/Método]
- De [Antes] para [Depois] | [Diferencial]
- [Credencial] | [Promessa] | [CTA]
- Ajudei +[N] [público] a [resultado] com [método]

Retorne APENAS o JSON válido, sem markdown.`;

    const userPrompt = `## INFORMAÇÕES DO PROFISSIONAL:
- Nicho: ${niche}
- Público-Alvo: ${targetAudience || 'Não especificado'}
- Principal Resultado: ${mainResult || 'Não especificado'}
- Diferencial: ${differentiator || 'Não especificado'}
${businessProfile ? `
- Nome do Negócio: ${businessProfile.business_name || ''}
- Oferta: ${businessProfile.main_offer || ''}
- Proposta de Valor: ${businessProfile.unique_value_proposition || ''}
- Dores que Resolve: ${businessProfile.pain_points_solved?.join(', ') || ''}
` : ''}

## PLATAFORMA:
${platformSpecs[platform] || platformSpecs.instagram}

## ESTILO DESEJADO:
${styleInstructions[style] || styleInstructions.authority}

## TAREFA:
Crie 3 opções de bio (1 principal + 2 alternativas) e retorne no formato JSON:

{
  "primary": {
    ${platform === 'linkedin' ? '"headline": "<headline de até 220 chars>",' : ''}
    "bio": "<bio principal otimizada>",
    "callToAction": "<CTA sugerido>",
    "emojis": ["emoji1", "emoji2", "emoji3"],
    ${platform === 'instagram' ? '"hashtags": ["#hashtag1", "#hashtag2"],' : ''}
    "characterCount": <número de caracteres da bio>
  },
  "alternative1": {
    ${platform === 'linkedin' ? '"headline": "<headline alternativa>",' : ''}
    "bio": "<bio alternativa 1>",
    "callToAction": "<CTA sugerido>",
    "emojis": ["emoji1", "emoji2"],
    ${platform === 'instagram' ? '"hashtags": ["#hashtag1"],' : ''}
    "characterCount": <número de caracteres>
  },
  "alternative2": {
    ${platform === 'linkedin' ? '"headline": "<headline alternativa 2>",' : ''}
    "bio": "<bio alternativa 2>",
    "callToAction": "<CTA sugerido>",
    "emojis": ["emoji1", "emoji2"],
    ${platform === 'instagram' ? '"hashtags": ["#hashtag1"],' : ''}
    "characterCount": <número de caracteres>
  },
  "tips": [
    "<dica 1 específica para melhorar performance>",
    "<dica 2>",
    "<dica 3>",
    "<dica 4>"
  ]
}

IMPORTANTE: 
- A bio "primary" deve ser a MELHOR opção
- Cada alternativa deve ter abordagem DIFERENTE
- Conte os caracteres CORRETAMENTE
- Para Instagram: max 150 chars | WhatsApp: max 139 chars | LinkedIn headline: max 220 chars`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos de IA insuficientes. Adicione créditos no workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse JSON response
    let jsonString = content.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.slice(7);
    }
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.slice(0, -3);
    }

    const result = JSON.parse(jsonString.trim());

    console.log('Bio generated successfully for platform:', platform);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bio generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
