import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isRateLimited } from "../_shared/rate-limit.ts";

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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const limited = await isRateLimited(user.id, "cold-messages", 50, 60); // 50 req/hora
    if (limited) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log('Generating cold messages for:', leadName, 'platform:', platform, 'tone:', tone);

    const toneDescriptions: Record<string, string> = {
      casual: 'casual e leve, como se estivesse conversando com um amigo. Use linguagem informal, emojis moderadamente e seja descontraído mas ainda profissional.',
      professional: 'profissional e corporativo. Linguagem formal, sem emojis, mantendo cordialidade e respeito. Ideal para executivos e profissionais de alto escalão.',
      direct: 'direto ao ponto, sem rodeios. Seja objetivo mas educado, focando em valor imediato e resultados tangíveis. Não perca tempo com amenidades.',
    };

    const platformInstructions: Record<string, string> = {
      whatsapp: `Para WhatsApp (prospecção de alto ticket):
CONTEXTO: WhatsApp é pessoal e direto. A pessoa verá sua mensagem imediatamente.

MENSAGEM 1 - ABERTURA (max 4 linhas):
- Saudação personalizada com nome
- Mencione algo específico do contexto do lead (se disponível)
- Faça uma pergunta ou observação que desperte curiosidade
- NÃO venda nada ainda, apenas inicie conversa

MENSAGEM 2 - FOLLOW-UP APÓS RESPOSTA (max 6 linhas):
- Só enviar após o lead responder a mensagem 1
- Introduza brevemente o que você faz e como ajuda
- Conecte com uma dor/desejo específico do perfil do lead
- Convide para uma conversa rápida (call de 15 min)
- Seja educado mas confiante`,

      instagram: `Para Instagram DM (prospecção social):
CONTEXTO: Instagram é visual e casual. Leads esperam interação mais leve.

MENSAGEM 1 - CONEXÃO (max 3 linhas):
- "Oi [nome]" + elogio GENUÍNO sobre algo específico do perfil/conteúdo
- Mostre que você realmente viu o perfil da pessoa
- NÃO mencione vendas, apenas crie conexão humana

MENSAGEM 2 - TRANSIÇÃO (max 5 linhas):
- Enviar 24-48h depois OU após resposta
- Mencione algo que vocês têm em comum
- Introduza sutilmente o que você faz
- Convide para trocar uma ideia, sem pressão`,

      linkedin: `Para LinkedIn (networking profissional):
CONTEXTO: LinkedIn é business-focused. Profissionais esperam abordagem mais séria.

MENSAGEM 1 - CONVITE DE CONEXÃO (max 200 caracteres):
- Mensagem curta e direta
- Mencione algo específico do perfil/experiência
- Explique brevemente por que quer conectar
- NÃO venda nada no convite

MENSAGEM 2 - PÓS-CONEXÃO (max 6 linhas):
- Agradeça pela conexão
- Compartilhe brevemente o que você faz
- Mencione como poderia agregar valor
- Convide para uma call rápida de 15 min`,

      email: `Para Email (prospecção formal):
CONTEXTO: Email permite mais detalhamento. Ideal para propostas estruturadas.

EMAIL 1 - COLD EMAIL INICIAL:
- Assunto: Curto (max 50 chars), desperte curiosidade ou mencione resultado específico
- Abertura: Referência pessoal (pesquisa que você fez sobre a pessoa/empresa)
- Corpo: 1 parágrafo sobre dor/problema + 1 parágrafo sobre sua solução + resultado tangível
- CTA: Pergunta simples ou convite para responder
- Max 150 palavras total

EMAIL 2 - FOLLOW-UP 1 (3-4 dias depois):
- Assunto: "Re:" do anterior ou novo ângulo
- Corpo curto: Adicione valor (case, insight, dado relevante)
- Reforce o CTA de forma diferente
- Max 100 palavras

EMAIL 3 - FOLLOW-UP FINAL (5-7 dias depois):
- Assunto: "Última tentativa" ou similar
- Tom: Educado mas direto
- Mencione que não vai mais incomodar
- Deixe porta aberta para futuro
- Max 80 palavras`,
    };

    const systemPrompt = `Você é um copywriter ESPECIALISTA em prospecção fria para vendas de alto ticket (mentorias, consultorias, serviços premium de R$ 10k a R$ 150k).

SEU PAPEL: Criar mensagens que pareçam escritas por um HUMANO REAL, não um robô ou vendedor genérico.

REGRAS CRÍTICAS:
1. NUNCA use templates genéricos ou frases clichês ("espero que esteja bem", "vim aqui te dar uma oportunidade")
2. SEMPRE personalize baseado no contexto do lead quando disponível
3. O objetivo NÃO é vender na primeira mensagem, é ABRIR CONVERSA
4. Cada mensagem deve ter um propósito claro na sequência
5. Respeite RIGOROSAMENTE os limites de tamanho de cada plataforma
6. Para email, SEMPRE inclua campo "subject" com o assunto
7. O tom deve ser confiante mas nunca arrogante
8. Foque em TRANSFORMAÇÃO e RESULTADOS, não em features

CONTEXTO DE HIGH TICKET:
- Leads de alto ticket são ocupados e céticos
- Eles recebem dezenas de abordagens por dia
- Diferenciação vem de PERSONALIZAÇÃO genuína
- O objetivo é marcar uma call, não fechar venda por mensagem

Retorne APENAS o JSON válido, sem markdown ou texto adicional.`;

    const userPrompt = `## CONTEXTO DO NEGÓCIO DO VENDEDOR:
${businessProfile ? `
- Nome do Negócio: ${businessProfile.business_name || 'Não informado'}
- Tipo: ${businessProfile.business_type || 'Não informado'}
- Oferta Principal: ${businessProfile.main_offer || 'Serviço de alto valor'}
- Público-Alvo: ${businessProfile.target_audience || 'Profissionais e empresários'}
- Proposta de Valor: ${businessProfile.unique_value_proposition || 'Não informado'}
- Dores que Resolve: ${businessProfile.pain_points_solved?.join(', ') || 'Não informado'}
- Faixa de Preço: ${businessProfile.price_range || 'Alto ticket'}
` : 'Perfil de negócio não configurado - crie mensagens para venda de mentoria/consultoria de alto ticket'}

## INFORMAÇÕES DO LEAD:
- Nome: ${leadName}
- Contexto/Observações: ${leadContext || 'Nenhum contexto adicional fornecido'}
- Plataforma: ${platform}

## TOM DA MENSAGEM:
${toneDescriptions[tone] || toneDescriptions.direct}

## INSTRUÇÕES ESPECÍFICAS DA PLATAFORMA:
${platformInstructions[platform] || platformInstructions.whatsapp}

## TAREFA:
Crie a sequência de mensagens e retorne no formato JSON:

${platform === 'email' ? `{
  "message1": {
    "title": "Cold Email Inicial",
    "subject": "<assunto do email - max 50 chars>",
    "content": "<corpo do email>",
    "timing": "Enviar imediatamente"
  },
  "message2": {
    "title": "Follow-up 1",
    "subject": "<assunto do follow-up>",
    "content": "<corpo do email>",
    "timing": "Enviar 3-4 dias depois se não responder"
  },
  "message3": {
    "title": "Follow-up Final",
    "subject": "<assunto final>",
    "content": "<corpo do email>",
    "timing": "Enviar 5-7 dias depois do follow-up 1"
  },
  "tips": ["<dica 1>", "<dica 2>", "<dica 3>", "<dica 4>"]
}` : `{
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
}`}`;

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
        temperature: 0.75,
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

    console.log('Cold messages generated successfully for platform:', platform);

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
