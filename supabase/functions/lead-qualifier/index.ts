import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const PILOTERR_API_KEYS = [
  Deno.env.get('PILOTERR_API_KEY'),
  Deno.env.get('PILOTERR_API_KEY_2'),
  Deno.env.get('PILOTERR_API_KEY_3'),
  Deno.env.get('PILOTERR_API_KEY_4'),
].filter(Boolean) as string[];

function detectPlatform(url: string): string | null {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) return 'instagram';
  if (urlLower.includes('linkedin.com')) return 'linkedin';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  return null;
}

function extractUsername(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathParts = urlObj.pathname.split('/').filter(p => p && p !== 'in');
    
    if (platform === 'instagram') return pathParts[0]?.replace('@', '') || null;
    if (platform === 'linkedin') return pathParts.find(p => p !== 'in') || null;
    if (platform === 'twitter') return pathParts[0]?.replace('@', '') || null;
    if (platform === 'tiktok') return pathParts[0]?.replace('@', '') || null;
    return pathParts[0] || null;
  } catch {
    return null;
  }
}

// ============= PILOTERR - Instagram Scraping =============

async function scrapeInstagramWithPiloterr(username: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (PILOTERR_API_KEYS.length === 0) {
    return { success: false, error: 'Nenhuma Piloterr API key configurada' };
  }

  const cleanUsername = username.replace('@', '').trim();
  console.log(`Piloterr scraping Instagram: ${cleanUsername} (${PILOTERR_API_KEYS.length} keys disponíveis)`);

  for (let i = 0; i < PILOTERR_API_KEYS.length; i++) {
    const apiKey = PILOTERR_API_KEYS[i];
    console.log(`Tentando Piloterr key ${i + 1}/${PILOTERR_API_KEYS.length}...`);

    try {
      const apiUrl = `https://piloterr.com/api/v2/instagram/user/info?query=${encodeURIComponent(cleanUsername)}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Se crédito acabou (402/403/429), tenta próxima key
      if (response.status === 402 || response.status === 403 || response.status === 429) {
        const errorText = await response.text();
        console.warn(`Piloterr key ${i + 1} sem crédito (${response.status}): ${errorText}`);
        if (i < PILOTERR_API_KEYS.length - 1) {
          console.log('Tentando próxima key...');
          continue;
        }
        return { success: false, error: `Todas as API keys do Piloterr sem crédito` };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Piloterr Instagram HTTP error:', response.status, errorText);
        return { success: false, error: `Piloterr error: ${response.status}` };
      }

      const data = await response.json();
      console.log(`Piloterr Instagram success (key ${i + 1}), response keys:`, Object.keys(data || {}));

      if (!data || data.error) {
        return { success: false, error: data?.error || 'Dados não encontrados no Piloterr' };
      }

      const markdown = formatInstagramProfile(data);
      
      if (!markdown || markdown.length < 50) {
        return { success: false, error: 'Dados insuficientes do Piloterr' };
      }

      return { success: true, data: markdown };
    } catch (error) {
      console.error(`Piloterr Instagram error (key ${i + 1}):`, error);
      if (i < PILOTERR_API_KEYS.length - 1) {
        console.log('Tentando próxima key após erro...');
        continue;
      }
      return { success: false, error: error instanceof Error ? error.message : 'Erro no Piloterr' };
    }
  }

  return { success: false, error: 'Falha em todas as tentativas do Piloterr' };
}

function formatInstagramProfile(data: any): string {
  const p = data.data || data;
  
  const username = p.username || p.pk || 'N/A';
  const fullName = p.full_name || p.fullName || 'N/A';
  const bio = p.biography || p.bio || 'N/A';
  const followers = p.follower_count || p.followers_count || p.edge_followed_by?.count || 'N/A';
  const following = p.following_count || p.followings_count || p.edge_follow?.count || 'N/A';
  const posts = p.media_count || p.posts_count || p.edge_owner_to_timeline_media?.count || 'N/A';
  const website = p.external_url || p.bio_link?.url || 'N/A';
  const isVerified = p.is_verified ?? false;
  const isBusiness = p.is_business_account ?? p.is_business ?? false;
  const category = p.business_category_name || p.category_name || p.category || 'N/A';
  const email = p.business_email || p.public_email || 'N/A';
  const phone = p.business_phone_number || p.contact_phone_number || 'N/A';

  return `
# Perfil Instagram: @${username}

**Nome:** ${fullName}
**Bio:** ${bio}
**Seguidores:** ${followers}
**Seguindo:** ${following}
**Posts:** ${posts}
**Website:** ${website}
**Verificado:** ${isVerified ? 'Sim' : 'Não'}
**Business:** ${isBusiness ? 'Sim' : 'Não'}
**Categoria:** ${category}
**Email Comercial:** ${email}
**Telefone Comercial:** ${phone}
`.trim();
}

// ============= PILOTERR - LinkedIn Scraping =============

function extractLinkedInSlug(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // For /in/username format
    const inIndex = pathParts.indexOf('in');
    if (inIndex !== -1 && pathParts[inIndex + 1]) {
      return pathParts[inIndex + 1].replace(/\/$/, '');
    }
    // Fallback: last meaningful segment
    return pathParts[pathParts.length - 1]?.replace(/\/$/, '') || null;
  } catch {
    return null;
  }
}

async function tryLinkedInPiloterr(query: string, apiKey: string): Promise<{ status: number; data?: any; error?: string }> {
  const apiUrl = `https://piloterr.com/api/v2/linkedin/profile/info?query=${encodeURIComponent(query)}`;
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: { 
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { status: response.status, error: errorText };
  }

  const data = await response.json();
  return { status: response.status, data };
}

async function scrapeLinkedInWithPiloterr(profileUrl: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (PILOTERR_API_KEYS.length === 0) {
    return { success: false, error: 'Nenhuma Piloterr API key configurada' };
  }

  // Build query variants: full URL, cleaned URL, and username slug
  const slug = extractLinkedInSlug(profileUrl);
  const cleanUrl = profileUrl.replace(/\/+$/, ''); // remove trailing slash
  const queryVariants = [cleanUrl];
  if (slug) queryVariants.push(slug);
  // Also try standard format
  if (slug && !cleanUrl.includes(`/in/${slug}`)) {
    queryVariants.push(`https://www.linkedin.com/in/${slug}`);
  }

  console.log(`Piloterr scraping LinkedIn: ${profileUrl} (${PILOTERR_API_KEYS.length} keys, ${queryVariants.length} variants: ${queryVariants.join(' | ')})`);

  let lastError = '';

  for (let i = 0; i < PILOTERR_API_KEYS.length; i++) {
    const apiKey = PILOTERR_API_KEYS[i];
    console.log(`Tentando Piloterr key ${i + 1}/${PILOTERR_API_KEYS.length}...`);

    for (const query of queryVariants) {
      try {
        console.log(`  Tentando query: ${query}`);
        const result = await tryLinkedInPiloterr(query, apiKey);

        // Se crédito acabou (402/403/429), tenta próxima key
        if (result.status === 402 || result.status === 403 || result.status === 429) {
          console.warn(`Piloterr key ${i + 1} sem crédito (${result.status}): ${result.error}`);
          lastError = `API key sem crédito (${result.status})`;
          break; // Break inner loop, try next key
        }

        // 404 = perfil não encontrado com este formato, tenta próximo
        if (result.status === 404) {
          console.log(`  404 para query "${query}", tentando próximo formato...`);
          lastError = 'Perfil não encontrado no LinkedIn';
          continue; // Try next query variant
        }

        // Other HTTP errors
        if (!result.data) {
          console.error(`  Piloterr LinkedIn HTTP error: ${result.status} ${result.error}`);
          lastError = `Piloterr LinkedIn error: ${result.status}`;
          continue;
        }

        // Success path
        const data = result.data;
        console.log(`Piloterr LinkedIn success (key ${i + 1}, query "${query}"), response keys:`, Object.keys(data || {}));

        if (!data || data.error) {
          lastError = data?.error || 'Dados não encontrados no LinkedIn';
          continue;
        }

        const markdown = formatLinkedInProfile(data);
        
        if (!markdown || markdown.length < 50) {
          lastError = 'Dados insuficientes do LinkedIn';
          continue;
        }

        return { success: true, data: markdown };
      } catch (error) {
        console.error(`Piloterr LinkedIn error (key ${i + 1}, query "${query}"):`, error);
        lastError = error instanceof Error ? error.message : 'Erro no Piloterr LinkedIn';
        continue;
      }
    }
  }

  return { success: false, error: lastError || 'Falha em todas as tentativas do Piloterr LinkedIn' };
}

function formatLinkedInProfile(data: any): string {
  const p = data.data || data;
  
  const fullName = p.full_name || p.fullName || p.name || 'N/A';
  const headline = p.headline || p.title || 'N/A';
  const summary = p.summary || p.about || p.description || 'N/A';
  const location = p.location || p.geo_location_name || 'N/A';
  const connections = p.connections_count || p.follower_count || 'N/A';
  const company = p.company || p.current_company?.name || p.experiences?.[0]?.company || 'N/A';
  const position = p.position || p.current_company?.title || p.experiences?.[0]?.title || 'N/A';
  const industry = p.industry || p.industry_name || 'N/A';
  const profileUrl = p.profile_url || p.linkedin_url || p.public_identifier || 'N/A';
  const website = p.website || p.websites?.[0] || 'N/A';
  
  // Experience
  const experiences = p.experiences || p.experience || [];
  const experienceText = experiences.slice(0, 3).map((exp: any) => 
    `- ${exp.title || exp.position} na ${exp.company || exp.company_name} (${exp.duration || exp.date_range || 'N/A'})`
  ).join('\n') || 'N/A';
  
  // Education
  const education = p.education || [];
  const educationText = education.slice(0, 2).map((edu: any) => 
    `- ${edu.school || edu.school_name}: ${edu.degree || edu.field_of_study || 'N/A'}`
  ).join('\n') || 'N/A';
  
  // Skills
  const skills = p.skills || [];
  const skillsText = skills.slice(0, 10).join(', ') || 'N/A';

  return `
# Perfil LinkedIn: ${fullName}

**Headline:** ${headline}
**Localização:** ${location}
**Conexões:** ${connections}
**Empresa Atual:** ${company}
**Cargo Atual:** ${position}
**Indústria:** ${industry}
**Website:** ${website}
**Perfil:** ${profileUrl}

## Sobre
${summary}

## Experiência Recente
${experienceText}

## Educação
${educationText}

## Habilidades
${skillsText}
`.trim();
}

// ============= AI Analysis - Super Complete with GPT 5.2 =============

async function analyzeWithAI(profileData: string, businessProfile: any): Promise<any> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY não configurada');
  }

  const systemPrompt = `Você é um SUPER ESPECIALISTA em análise de leads, psicologia de vendas, comportamento humano e estratégias de negociação.

Sua missão é criar a ANÁLISE MAIS COMPLETA E PROFUNDA possível de um lead, fornecendo:
- Análise comportamental detalhada
- TODAS as objeções possíveis com respostas prontas
- Estratégias de negociação específicas
- Scripts de fechamento personalizados
- Técnicas de ancoragem de valor
- Gatilhos mentais específicos para este perfil

REGRAS CRÍTICAS:
1. Seja EXTREMAMENTE específico - use dados REAIS do perfil
2. NÃO mencione teorias pelo nome (DISC, Eneagrama) - aplique conceitos silenciosamente
3. Forneça exemplos de scripts PRONTOS PARA USAR
4. Liste TODAS as objeções possíveis (mínimo 8)
5. O relatório deve ser em português brasileiro
6. Retorne APENAS JSON válido`;

  const userPrompt = `## CONTEXTO DO NEGÓCIO DO VENDEDOR:
${businessProfile ? `
- Nome da Empresa: ${businessProfile.business_name || 'Não informado'}
- Tipo de Negócio: ${businessProfile.business_type || 'Não informado'}
- Oferta Principal: ${businessProfile.main_offer || 'Não informado'}
- Público-Alvo: ${businessProfile.target_audience || 'Não informado'}
- Proposta de Valor: ${businessProfile.unique_value_proposition || 'Não informado'}
- Dores que Resolve: ${businessProfile.pain_points_solved?.join(', ') || 'Não informado'}
- Faixa de Preço: ${businessProfile.price_range || 'Não informado'}
- Ticket Médio: ${businessProfile.average_ticket || 'Não informado'}
- Canais de Venda: ${businessProfile.current_sales_channels?.join(', ') || 'Não informado'}
${businessProfile.pitch_context ? `\n## PITCH / CONTEXTO DETALHADO DO PRODUTO:\n${businessProfile.pitch_context}` : ''}
` : 'Não configurado - fazer análise genérica'}

## DADOS DO LEAD A SER ANALISADO:
${profileData}

## TAREFA - GERAR SUPER ANÁLISE COMPLETA:
Retorne um JSON com TODAS as seguintes seções preenchidas de forma MUITO DETALHADA:

{
  "score": <0-100 precisão alta>,
  "score_breakdown": {
    "fit_with_offer": <0-25>,
    "buying_signals": <0-25>,
    "engagement_level": <0-25>,
    "financial_capacity": <0-25>
  },
  "summary": "<resumo executivo 3-4 frases sobre o lead>",
  "recommendation": "<pursue_hot|nurture|low_priority|not_fit>",
  "recommendation_reasoning": "<explicação detalhada de 2-3 frases do porquê dessa recomendação>",
  
  "extracted_data": {
    "name": "<nome completo>",
    "headline": "<headline/bio>",
    "company": "<empresa atual>",
    "industry": "<setor/nicho>",
    "location": "<localização>",
    "followers": <número ou null>,
    "platform": "<instagram|linkedin>",
    "content_topics": ["<tópicos que posta>"],
    "recent_posts_summary": "<resumo do tipo de conteúdo>"
  },
  
  "behavioral_profile": {
    "primary_style": "<dominante|influente|estavel|analitico>",
    "secondary_style": "<string ou null>",
    "personality_summary": "<descrição da personalidade em 3-4 frases>",
    "communication_preference": "<como prefere se comunicar - detalhado>",
    "decision_making_style": "<como toma decisões - detalhado>",
    "what_motivates": ["<lista de 5-7 motivadores principais>"],
    "what_frustrates": ["<lista de 5-7 frustrações/irritadores>"],
    "how_to_build_rapport": "<estratégia detalhada para criar conexão>",
    "buying_triggers": ["<gatilhos que fazem comprar>"],
    "red_flags_for_them": ["<sinais que fazem desistir>"]
  },
  
  "lead_perspective": {
    "likely_goals": ["<lista de 5-7 objetivos prováveis>"],
    "current_challenges": ["<lista de 5-7 desafios atuais>"],
    "fears_and_concerns": ["<lista de 5-7 medos e preocupações>"],
    "desires_and_aspirations": ["<lista de 5-7 desejos profundos>"],
    "hidden_pains": ["<dores ocultas que nem sabe que tem>"],
    "status_symbols": ["<o que representa status para esse perfil>"]
  },
  
  "approach_strategy": {
    "opening_hook": "<frase de abertura personalizada e impactante>",
    "second_message": "<o que mandar se responder>",
    "follow_up_if_silent": "<mensagem de follow up se não responder>",
    "key_points_to_touch": ["<pontos importantes para tocar na conversa>"],
    "topics_to_avoid": ["<assuntos para evitar>"],
    "best_channel": "<dm_instagram|linkedin|whatsapp|email>",
    "best_time_to_contact": "<melhor horário/dia>",
    "conversation_flow": ["<passo 1>", "<passo 2>", "<passo 3>", "<passo 4>"]
  },
  
  "value_anchoring": {
    "pain_to_highlight": "<principal dor para explorar>",
    "result_to_promise": "<resultado tangível para prometer>",
    "social_proof_angle": "<como usar prova social>",
    "price_justification": "<como justificar o preço>",
    "roi_argument": "<argumento de ROI específico>",
    "urgency_angle": "<como criar urgência sem ser forçado>",
    "scarcity_angle": "<como usar escassez de forma autêntica>",
    "authority_angle": "<como demonstrar autoridade>"
  },
  
  "expected_objections": [
    {
      "objection": "<objeção específica>",
      "objection_type": "<preço|tempo|confianca|necessidade|autoridade|urgencia>",
      "likelihood": "<alta|media|baixa>",
      "real_meaning": "<o que realmente significa essa objeção>",
      "response_strategy": "<estratégia para contornar>",
      "script_example": "<script pronto para usar>",
      "follow_up_question": "<pergunta para fazer depois>"
    }
  ],
  
  "negotiation_tactics": {
    "recommended_approach": "<negociação suave|assertiva|consultiva>",
    "price_presentation": "<como apresentar o preço>",
    "discount_strategy": "<quando e como oferecer desconto>",
    "payment_flexibility": "<como usar parcelamento>",
    "bonus_to_offer": "<bônus que funcionaria bem>",
    "deadline_creation": "<como criar prazo sem pressão>",
    "competitor_comparison": "<como lidar se mencionar concorrente>"
  },
  
  "closing_scripts": {
    "soft_close": "<script de fechamento suave>",
    "assumptive_close": "<script de fechamento assumido>",
    "alternative_close": "<script de fechamento alternativo>",
    "urgency_close": "<script de fechamento com urgência>",
    "summary_close": "<script de resumo antes de fechar>"
  },
  
  "mental_triggers": {
    "primary_triggers": ["<3 gatilhos mais eficazes para esse perfil>"],
    "how_to_apply_each": {
      "<trigger1>": "<como aplicar>",
      "<trigger2>": "<como aplicar>",
      "<trigger3>": "<como aplicar>"
    }
  },
  
  "what_pushes_away": {
    "behaviors_to_avoid": ["<lista de comportamentos a evitar>"],
    "words_to_avoid": ["<palavras/frases a evitar>"],
    "approaches_that_fail": ["<abordagens que não funcionam>"],
    "tone_to_avoid": "<tom de voz a evitar>"
  },
  
  "personalized_scripts": {
    "dm_opener": "<mensagem de abertura para DM>",
    "linkedin_connection": "<mensagem para conexão LinkedIn>",
    "whatsapp_intro": "<mensagem inicial WhatsApp>",
    "email_subject": "<assunto de email>",
    "email_body": "<corpo do email resumido>"
  },
  
  "risk_assessment": {
    "deal_probability": "<0-100% chance de fechar>",
    "main_risk": "<principal risco dessa negociação>",
    "mitigation_strategy": "<como mitigar o risco>",
    "timeline_estimate": "<tempo estimado até decisão>"
  }
}

IMPORTANTE: Forneça pelo menos 8 objeções diferentes e completas. Seja MUITO detalhado em cada seção.`;

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
      temperature: 0.7,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI error:', response.status, errorText);
    if (response.status === 429) throw new Error('Limite de requisições excedido. Aguarde um momento.');
    if (response.status === 402) throw new Error('Créditos de IA insuficientes. Verifique seu plano.');
    throw new Error(`Erro na análise IA: ${response.status}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) throw new Error('Resposta vazia da IA');

  let jsonString = content.trim();
  if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7);
  if (jsonString.startsWith('```')) jsonString = jsonString.slice(3);
  if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);
  
  return JSON.parse(jsonString.trim());
}

// ============= Main Handler =============

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

    console.log('Processing:', profileUrl);

    const platform = detectPlatform(profileUrl);
    let profileData = '';
    let scrapeMethod = '';

    if (platform === 'instagram') {
      // Use Piloterr for Instagram
      console.log('Instagram detected, using Piloterr...');
      const username = extractUsername(profileUrl, 'instagram');
      
      if (!username) {
        return new Response(
          JSON.stringify({ success: false, error: 'Não foi possível extrair username do Instagram' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const piloterrResult = await scrapeInstagramWithPiloterr(username);
      
      if (piloterrResult.success && piloterrResult.data) {
        profileData = piloterrResult.data;
        scrapeMethod = 'piloterr-instagram';
        console.log('Piloterr Instagram success, data length:', profileData.length);
      } else {
        console.log('Piloterr Instagram failed:', piloterrResult.error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Não foi possível extrair dados do Instagram: ${piloterrResult.error}`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (platform === 'linkedin') {
      // Use Piloterr for LinkedIn
      console.log('LinkedIn detected, using Piloterr...');

      const piloterrResult = await scrapeLinkedInWithPiloterr(profileUrl);
      
      if (piloterrResult.success && piloterrResult.data) {
        profileData = piloterrResult.data;
        scrapeMethod = 'piloterr-linkedin';
        console.log('Piloterr LinkedIn success, data length:', profileData.length);
      } else {
        console.log('Piloterr LinkedIn failed:', piloterrResult.error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Não foi possível extrair dados do LinkedIn: ${piloterrResult.error}`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Apenas perfis do Instagram e LinkedIn são suportados. Use URLs como: https://instagram.com/username ou https://linkedin.com/in/username'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profileData || profileData.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Dados insuficientes extraídos do perfil.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze with AI
    const report = await analyzeWithAI(profileData, businessProfile);
    console.log(`Analysis complete via ${scrapeMethod}, score:`, report.score);

    return new Response(
      JSON.stringify({ success: true, report, scrapeMethod }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lead qualifier error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
