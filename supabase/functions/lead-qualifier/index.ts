import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

async function scrapeProfile(url: string): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!FIRECRAWL_API_KEY) {
    return { success: false, error: 'Firecrawl API key não configurada' };
  }

  try {
    console.log('Scraping profile:', url);
    
    const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 5000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', data);
      return { success: false, error: data.error || 'Erro ao fazer scraping do perfil' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Scraping error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

async function analyzeWithAI(profileData: string, businessProfile: any): Promise<any> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY não configurada');
  }

  const systemPrompt = `Você é um especialista em análise de leads, psicologia de vendas e comportamento humano.
Sua tarefa é analisar profundamente um perfil de lead e gerar um relatório completo e acionável para ajudar o vendedor a fechar a venda.

IMPORTANTE:
- Seja EXTREMAMENTE específico e use informações reais do perfil
- NÃO mencione teorias como DISC ou Eneagrama pelo nome - apenas aplique os conceitos
- Foque em insights PRÁTICOS e ACIONÁVEIS
- O relatório deve ser em português brasileiro
- Retorne APENAS o JSON válido, sem markdown ou texto adicional`;

  const userPrompt = `## CONTEXTO DO NEGÓCIO DO VENDEDOR:
${businessProfile ? `
- Nome do Negócio: ${businessProfile.business_name || 'Não informado'}
- Tipo: ${businessProfile.business_type || 'Não informado'}
- Oferta Principal: ${businessProfile.main_offer || 'Não informado'}
- Público-Alvo: ${businessProfile.target_audience || 'Não informado'}
- Proposta de Valor: ${businessProfile.unique_value_proposition || 'Não informado'}
- Dores que Resolve: ${businessProfile.pain_points_solved?.join(', ') || 'Não informado'}
- Faixa de Preço: ${businessProfile.price_range || 'Não informado'}
` : 'Perfil de negócio não configurado'}

## DADOS DO PERFIL DO LEAD (scraped):
${profileData}

## TAREFA:
Analise PROFUNDAMENTE este lead e retorne um JSON com a seguinte estrutura EXATA:

{
  "score": <número de 0-100>,
  "score_breakdown": {
    "fit_with_offer": <0-25>,
    "buying_signals": <0-25>,
    "engagement_level": <0-25>,
    "financial_capacity": <0-25>
  },
  "summary": "<resumo executivo de 2-3 frases>",
  "recommendation": "<pursue_hot|nurture|low_priority|not_fit>",
  "behavioral_profile": {
    "primary_style": "<dominante|influente|estavel|analitico>",
    "secondary_style": "<string>",
    "communication_preference": "<como essa pessoa prefere se comunicar>",
    "decision_making_style": "<como essa pessoa toma decisões>",
    "what_motivates": ["<lista de motivadores>"],
    "what_frustrates": ["<lista de frustrações>"],
    "how_to_build_rapport": "<como criar conexão com essa pessoa>"
  },
  "lead_perspective": {
    "likely_goals": ["<objetivos prováveis>"],
    "current_challenges": ["<desafios atuais>"],
    "fears_and_concerns": ["<medos e preocupações>"],
    "desires_and_aspirations": ["<desejos e aspirações>"]
  },
  "approach_strategy": {
    "opening_hook": "<frase de abertura personalizada>",
    "key_points_to_touch": ["<pontos importantes para mencionar>"],
    "topics_to_avoid": ["<assuntos para evitar>"],
    "best_channel": "<dm_instagram|linkedin|whatsapp|email>",
    "best_time_to_contact": "<melhor momento para contato>"
  },
  "value_anchoring": {
    "pain_to_highlight": "<principal dor para destacar>",
    "result_to_promise": "<resultado específico para prometer>",
    "social_proof_angle": "<ângulo de prova social>",
    "price_justification": "<como justificar o preço>",
    "roi_argument": "<argumento de ROI>"
  },
  "expected_objections": [
    {
      "objection": "<objeção esperada>",
      "likelihood": "<alta|media|baixa>",
      "response_strategy": "<estratégia de resposta>",
      "script_example": "<exemplo de script para responder>"
    }
  ],
  "what_pushes_away": {
    "behaviors_to_avoid": ["<comportamentos a evitar>"],
    "words_to_avoid": ["<palavras/frases a evitar>"],
    "approaches_that_fail": ["<abordagens que não funcionam>"]
  },
  "extracted_data": {
    "name": "<nome extraído>",
    "headline": "<headline/bio>",
    "company": "<empresa se identificada>",
    "industry": "<nicho/indústria>",
    "location": "<localização se disponível>",
    "followers": <número ou null>,
    "content_topics": ["<tópicos do conteúdo>"],
    "recent_posts_summary": "<resumo dos posts recentes>"
  }
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-5.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
    }
    if (response.status === 402) {
      throw new Error('Créditos de IA insuficientes. Adicione créditos no workspace.');
    }
    throw new Error(`Erro na API de IA: ${response.status}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Resposta vazia da IA');
  }

  // Parse JSON response
  try {
    // Remove potential markdown code blocks
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
    
    return JSON.parse(jsonString.trim());
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Content:', content);
    throw new Error('Erro ao processar resposta da IA');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, businessProfile } = await req.json();

    if (!profileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL do perfil é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing lead qualification for:', profileUrl);

    // Step 1: Scrape the profile
    const scrapeResult = await scrapeProfile(profileUrl);
    
    if (!scrapeResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: scrapeResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileData = scrapeResult.data?.data?.markdown || scrapeResult.data?.markdown || '';
    
    if (!profileData || profileData.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair dados suficientes do perfil. Verifique se a URL está correta e o perfil é público.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile scraped, data length:', profileData.length);

    // Step 2: Analyze with AI
    const report = await analyzeWithAI(profileData, businessProfile);

    console.log('Analysis complete, score:', report.score);

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lead qualifier error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
