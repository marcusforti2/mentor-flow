import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
const PILOTERR_API_KEY = Deno.env.get('PILOTERR_API_KEY');

// Apify Actor IDs for non-Instagram platforms
const APIFY_ACTORS: Record<string, string> = {
  linkedin: 'bebity/linkedin-premium-actor',
  twitter: 'apify/twitter-scraper',
  tiktok: 'clockworks/tiktok-scraper',
};

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

async function runApifyActor(actorId: string, input: Record<string, unknown>, apiKey: string): Promise<any> {
  // URL-encode the entire actor ID for the API call
  const encodedActorId = encodeURIComponent(actorId);
  console.log(`Running Apify actor: ${actorId} (encoded: ${encodedActorId})`);
  
  const apiUrl = `https://api.apify.com/v2/acts/${encodedActorId}/runs?token=${apiKey}`;
  console.log(`API URL: ${apiUrl}`);
  
  const runResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!runResponse.ok) {
    const error = await runResponse.text();
    console.error('Apify run failed:', error);
    throw new Error(`Apify error: ${error}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data?.id;
  
  if (!runId) throw new Error('No run ID from Apify');

  console.log(`Actor run started: ${runId}`);

  // Poll for completion (max 60 seconds)
  let attempts = 0;
  while (attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
    );
    
    if (!statusResponse.ok) throw new Error('Failed to check status');
    
    const statusData = await statusResponse.json();
    const status = statusData.data?.status;
    
    console.log(`Run status: ${status}`);
    
    if (status === 'SUCCEEDED') {
      const datasetId = statusData.data?.defaultDatasetId;
      const datasetResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}`
      );
      if (!datasetResponse.ok) throw new Error('Failed to fetch dataset');
      return await datasetResponse.json();
    }
    
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Actor ${status}`);
    }
    
    attempts++;
  }
  
  throw new Error('Actor timed out');
}

function formatInstagramProfile(data: any[]): string {
  if (!data?.length) return '';
  const p = data[0];
  return `
# Perfil Instagram: @${p.username || 'N/A'}
**Nome:** ${p.fullName || p.full_name || 'N/A'}
**Bio:** ${p.biography || p.bio || 'N/A'}
**Seguidores:** ${p.followersCount || p.followers || 'N/A'}
**Seguindo:** ${p.followingCount || p.following || 'N/A'}
**Posts:** ${p.postsCount || p.posts || 'N/A'}
**Website:** ${p.externalUrl || p.website || 'N/A'}
**Verificado:** ${p.verified ? 'Sim' : 'Não'}
**Business:** ${p.isBusinessAccount ? 'Sim' : 'Não'}
**Categoria:** ${p.businessCategoryName || p.category || 'N/A'}

## Posts Recentes
${(p.latestPosts || p.posts || []).slice(0, 5).map((post: any, i: number) => `
### Post ${i + 1}
- Likes: ${post.likesCount || post.likes || 'N/A'}
- Comentários: ${post.commentsCount || post.comments || 'N/A'}
- Legenda: ${(post.caption || post.text || '').substring(0, 200)}...
`).join('\n')}`.trim();
}

function formatLinkedInProfile(data: any[]): string {
  if (!data?.length) return '';
  const p = data[0];
  return `
# Perfil LinkedIn: ${p.firstName || ''} ${p.lastName || ''}
**Nome:** ${p.fullName || `${p.firstName || ''} ${p.lastName || ''}`}
**Headline:** ${p.headline || p.title || 'N/A'}
**Localização:** ${p.location || p.geoLocationName || 'N/A'}
**Conexões:** ${p.connectionsCount || p.connections || 'N/A'}
**Empresa:** ${p.currentCompany || p.company || 'N/A'}
**Cargo:** ${p.currentPosition || p.position || 'N/A'}
**Setor:** ${p.industry || 'N/A'}

## Sobre
${p.summary || p.about || 'N/A'}

## Experiência
${(p.experience || p.positions || []).slice(0, 3).map((e: any) => `
- ${e.title || e.position || 'Cargo'} @ ${e.companyName || e.company || 'Empresa'}: ${(e.description || '').substring(0, 100)}...
`).join('\n')}

## Habilidades
${(p.skills || []).slice(0, 10).map((s: any) => typeof s === 'string' ? s : s.name).join(', ') || 'N/A'}`.trim();
}

// ============= PILOTERR - Instagram Scraping =============

async function scrapeInstagramWithPiloterr(username: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!PILOTERR_API_KEY) {
    return { success: false, error: 'Piloterr API key não configurada' };
  }

  const cleanUsername = username.replace('@', '').trim();
  console.log(`Piloterr scraping Instagram: ${cleanUsername}`);

  try {
    const apiUrl = `https://piloterr.com/api/v2/instagram/user/info?query=${encodeURIComponent(cleanUsername)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'x-api-key': PILOTERR_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Piloterr HTTP error:', response.status, errorText);
      return { success: false, error: `Piloterr error: ${response.status}` };
    }

    const data = await response.json();
    console.log('Piloterr response keys:', Object.keys(data || {}));

    if (!data || data.error) {
      return { success: false, error: data?.error || 'Dados não encontrados no Piloterr' };
    }

    const markdown = formatPiloterrProfile(data);
    
    if (!markdown || markdown.length < 50) {
      return { success: false, error: 'Dados insuficientes do Piloterr' };
    }

    return { success: true, data: markdown };
  } catch (error) {
    console.error('Piloterr error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro no Piloterr' };
  }
}

function formatPiloterrProfile(data: any): string {
  // Piloterr returns data in different structures, handle both
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

// ============= APIFY - Other Platforms =============

async function scrapeWithApify(url: string, platform: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!APIFY_API_KEY) {
    return { success: false, error: 'Apify API key não configurada' };
  }

  const username = extractUsername(url, platform);
  if (!username) {
    return { success: false, error: 'Não foi possível extrair username da URL' };
  }

  console.log(`Apify scraping ${platform}: ${username}`);

  const actorId = APIFY_ACTORS[platform];
  if (!actorId) {
    return { success: false, error: `Plataforma ${platform} não suportada pelo Apify` };
  }

  let input: Record<string, unknown>;
  if (platform === 'linkedin') {
    input = { 
      action: 'get-profiles',
      keywords: [url.startsWith('http') ? url : `https://${url}`],
      isUrl: true,
      isName: false,
      limit: 1
    };
  } else if (platform === 'twitter') {
    input = { handles: [username], tweetsDesired: 10, proxyConfig: { useApifyProxy: true } };
  } else {
    input = { profiles: [username], resultsPerPage: 1 };
  }

  try {
    const data = await runApifyActor(actorId, input, APIFY_API_KEY);
    
    let markdown = '';
    if (platform === 'linkedin') {
      markdown = formatLinkedInProfile(data);
    } else {
      markdown = JSON.stringify(data, null, 2);
    }

    if (!markdown || markdown.length < 50) {
      return { success: false, error: 'Dados insuficientes retornados pelo Apify' };
    }

    return { success: true, data: markdown };
  } catch (error) {
    console.error('Apify error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro no Apify' };
  }
}

async function scrapeWithFirecrawl(url: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!FIRECRAWL_API_KEY) {
    return { success: false, error: 'Firecrawl API key não configurada' };
  }

  try {
    console.log('Firecrawl scraping:', url);
    
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
      return { success: false, error: data.error || 'Erro no Firecrawl' };
    }

    const markdown = data?.data?.markdown || data?.markdown || '';
    return { success: true, data: markdown };
  } catch (error) {
    console.error('Firecrawl error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

async function analyzeWithAI(profileData: string, businessProfile: any): Promise<any> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY não configurada');
  }

  const systemPrompt = `Você é um especialista em análise de leads, psicologia de vendas e comportamento humano.
Sua tarefa é analisar profundamente um perfil de lead e gerar um relatório completo e acionável.

IMPORTANTE:
- Seja EXTREMAMENTE específico e use informações reais do perfil
- NÃO mencione teorias como DISC ou Eneagrama pelo nome - apenas aplique os conceitos
- Foque em insights PRÁTICOS e ACIONÁVEIS
- O relatório deve ser em português brasileiro
- Retorne APENAS o JSON válido, sem markdown ou texto adicional`;

  const userPrompt = `## CONTEXTO DO NEGÓCIO:
${businessProfile ? `
- Nome: ${businessProfile.business_name || 'Não informado'}
- Tipo: ${businessProfile.business_type || 'Não informado'}
- Oferta: ${businessProfile.main_offer || 'Não informado'}
- Público: ${businessProfile.target_audience || 'Não informado'}
- Proposta: ${businessProfile.unique_value_proposition || 'Não informado'}
- Dores: ${businessProfile.pain_points_solved?.join(', ') || 'Não informado'}
- Preço: ${businessProfile.price_range || 'Não informado'}
` : 'Não configurado'}

## DADOS DO LEAD:
${profileData}

## TAREFA:
Analise e retorne JSON:
{
  "score": <0-100>,
  "score_breakdown": { "fit_with_offer": <0-25>, "buying_signals": <0-25>, "engagement_level": <0-25>, "financial_capacity": <0-25> },
  "summary": "<resumo 2-3 frases>",
  "recommendation": "<pursue_hot|nurture|low_priority|not_fit>",
  "behavioral_profile": {
    "primary_style": "<dominante|influente|estavel|analitico>",
    "secondary_style": "<string>",
    "communication_preference": "<como prefere comunicar>",
    "decision_making_style": "<como decide>",
    "what_motivates": ["<motivadores>"],
    "what_frustrates": ["<frustrações>"],
    "how_to_build_rapport": "<como criar conexão>"
  },
  "lead_perspective": {
    "likely_goals": ["<objetivos>"],
    "current_challenges": ["<desafios>"],
    "fears_and_concerns": ["<medos>"],
    "desires_and_aspirations": ["<desejos>"]
  },
  "approach_strategy": {
    "opening_hook": "<frase abertura>",
    "key_points_to_touch": ["<pontos>"],
    "topics_to_avoid": ["<evitar>"],
    "best_channel": "<dm_instagram|linkedin|whatsapp|email>",
    "best_time_to_contact": "<momento>"
  },
  "value_anchoring": {
    "pain_to_highlight": "<dor>",
    "result_to_promise": "<resultado>",
    "social_proof_angle": "<prova social>",
    "price_justification": "<justificar preço>",
    "roi_argument": "<ROI>"
  },
  "expected_objections": [{ "objection": "<objeção>", "likelihood": "<alta|media|baixa>", "response_strategy": "<estratégia>", "script_example": "<script>" }],
  "what_pushes_away": { "behaviors_to_avoid": ["<evitar>"], "words_to_avoid": ["<palavras>"], "approaches_that_fail": ["<abordagens>"] },
  "extracted_data": { "name": "<nome>", "headline": "<headline>", "company": "<empresa>", "industry": "<setor>", "location": "<local>", "followers": <número|null>, "content_topics": ["<tópicos>"], "recent_posts_summary": "<resumo posts>" }
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
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI error:', response.status, errorText);
    if (response.status === 429) throw new Error('Limite de requisições excedido');
    if (response.status === 402) throw new Error('Créditos de IA insuficientes');
    throw new Error(`Erro IA: ${response.status}`);
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, businessProfile, manualProfileData } = await req.json();

    // Mode 1: Manual data
    if (manualProfileData && manualProfileData.trim().length > 50) {
      console.log('Processing manual data, length:', manualProfileData.length);
      const report = await analyzeWithAI(manualProfileData, businessProfile);
      return new Response(
        JSON.stringify({ success: true, report }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode 2: URL scraping
    if (!profileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL ou dados manuais são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing:', profileUrl);

    // Check platform - route appropriately
    const platform = detectPlatform(profileUrl);
    let profileData = '';
    let scrapeMethod = '';

    if (platform === 'instagram') {
      // Use Piloterr for Instagram (primary method)
      console.log('Instagram detected, trying Piloterr...');
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
        scrapeMethod = 'piloterr';
        console.log('Piloterr success, data length:', profileData.length);
      } else {
        console.log('Piloterr failed:', piloterrResult.error);
        
        // Fallback to Apify for Instagram if Piloterr fails
        console.log('Trying Apify fallback for Instagram...');
        const apifyResult = await scrapeWithApify(profileUrl, 'instagram');
        
        if (apifyResult.success && apifyResult.data) {
          profileData = apifyResult.data;
          scrapeMethod = 'apify';
          console.log('Apify fallback success');
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Não foi possível extrair dados do Instagram: ${piloterrResult.error}. Use a opção "Colar Perfil Manualmente".`,
              requiresManualInput: true,
              blockedPlatform: 'instagram'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else if (platform) {
      // Use Apify for other social platforms (LinkedIn, Twitter, TikTok)
      console.log(`Social platform detected: ${platform}, trying Apify...`);
      const apifyResult = await scrapeWithApify(profileUrl, platform);
      
      if (apifyResult.success && apifyResult.data) {
        profileData = apifyResult.data;
        scrapeMethod = 'apify';
        console.log('Apify success, data length:', profileData.length);
      } else {
        console.log('Apify failed:', apifyResult.error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Não foi possível extrair dados do ${platform}: ${apifyResult.error}. Use a opção "Colar Perfil Manualmente".`,
            requiresManualInput: true,
            blockedPlatform: platform
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Try Firecrawl for other websites
      console.log('Non-social website, trying Firecrawl...');
      const firecrawlResult = await scrapeWithFirecrawl(profileUrl);
      
      if (firecrawlResult.success && firecrawlResult.data) {
        profileData = firecrawlResult.data;
        scrapeMethod = 'firecrawl';
        console.log('Firecrawl success, data length:', profileData.length);
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: firecrawlResult.error || 'Erro ao extrair dados do site',
            requiresManualInput: true
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!profileData || profileData.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Dados insuficientes extraídos. Verifique a URL ou use entrada manual.',
          requiresManualInput: true
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
