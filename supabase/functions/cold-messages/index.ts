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
    const { 
      leadName, 
      leadContext, 
      platform, 
      tone, 
      businessProfile 
    } = await req.json();

    if (!leadName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome do lead é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating cold messages for:', leadName, 'platform:', platform);

    const toneDescriptions: Record<string, string> = {
      casual: 'casual e leve, como se estivesse conversando com um amigo. Use linguagem informal, emojis moderadamente e seja descontraído.',
      professional: 'profissional mas ainda acessível. Linguagem mais formal, sem emojis exagerados, mantendo cordialidade.',
      direct: 'direto ao ponto, sem rodeios. Seja objetivo mas educado, focando em valor imediato.',
    };

    const platformInstructions: Record<string, string> = {
      instagram: `Para Instagram DM:
- MENSAGEM 1 (Conexão): Simples e humanizada. Apenas "oi, tudo bem" + elogio genuíno sobre algo específico do perfil. NÃO venda nada. Max 3 linhas.
- MENSAGEM 2 (Follow-up): Só enviar APÓS resposta. Introduz o que você faz de forma suave, menciona possível sinergia, convida para conversa sem pressão. Max 5 linhas.`,
      linkedin: `Para LinkedIn:
- CONVITE DE CONEXÃO: Mensagem curta (max 200 caracteres) que menciona algo específico do perfil e por que quer conectar. NÃO venda.
- MENSAGEM PÓS-CONEXÃO: Agradece a conexão, introduz brevemente o que faz, menciona possível valor mútuo, convida para conversa. Max 5 linhas.`,
    };

    const systemPrompt = `Você é um copywriter especialista em prospecção fria e comunicação persuasiva.
Sua tarefa é criar mensagens de prospecção que pareçam NATURAIS e HUMANAS, não robóticas.

REGRAS IMPORTANTES:
- Mensagens devem parecer escritas por uma pessoa real, não um bot
- NUNCA use templates genéricos ou frases clichês de vendas
- Personalize baseado no contexto do lead quando disponível
- Mantenha o tom especificado
- Respeite os limites de tamanho
- Retorne APENAS o JSON válido`;

    const userPrompt = `## CONTEXTO DO NEGÓCIO DO VENDEDOR:
${businessProfile ? `
- Nome do Negócio: ${businessProfile.business_name || 'Não informado'}
- Oferta Principal: ${businessProfile.main_offer || 'Não informado'}
- Público-Alvo: ${businessProfile.target_audience || 'Não informado'}
- Proposta de Valor: ${businessProfile.unique_value_proposition || 'Não informado'}
- Dores que Resolve: ${businessProfile.pain_points_solved?.join(', ') || 'Não informado'}
` : 'Perfil de negócio não configurado - crie mensagens mais genéricas'}

## INFORMAÇÕES DO LEAD:
- Nome: ${leadName}
- Contexto/Observações: ${leadContext || 'Não informado'}
- Plataforma: ${platform}

## TOM DA MENSAGEM:
${toneDescriptions[tone] || toneDescriptions.casual}

## INSTRUÇÕES DA PLATAFORMA:
${platformInstructions[platform] || platformInstructions.instagram}

## TAREFA:
Crie as mensagens de prospecção e retorne no formato JSON:

{
  "message1": {
    "title": "<título descritivo>",
    "content": "<conteúdo da mensagem>",
    "timing": "<quando enviar>"
  },
  "message2": {
    "title": "<título descritivo>",
    "content": "<conteúdo da mensagem>",
    "timing": "<quando enviar>"
  },
  "tips": ["<dica 1>", "<dica 2>", "<dica 3>"]
}`;

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

    const messages = JSON.parse(jsonString.trim());

    console.log('Messages generated successfully');

    return new Response(
      JSON.stringify({ success: true, messages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cold messages error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
