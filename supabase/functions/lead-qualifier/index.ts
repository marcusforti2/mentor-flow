import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const PILOTERR_API_KEY = Deno.env.get('PILOTERR_API_KEY');

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
      console.error('Piloterr Instagram HTTP error:', response.status, errorText);
      return { success: false, error: `Piloterr error: ${response.status}` };
    }

    const data = await response.json();
    console.log('Piloterr Instagram response keys:', Object.keys(data || {}));

    if (!data || data.error) {
      return { success: false, error: data?.error || 'Dados não encontrados no Piloterr' };
    }

    const markdown = formatInstagramProfile(data);
    
    if (!markdown || markdown.length < 50) {
      return { success: false, error: 'Dados insuficientes do Piloterr' };
    }

    return { success: true, data: markdown };
  } catch (error) {
    console.error('Piloterr Instagram error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro no Piloterr' };
  }
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

async function scrapeLinkedInWithPiloterr(profileUrl: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!PILOTERR_API_KEY) {
    return { success: false, error: 'Piloterr API key não configurada' };
  }

  console.log(`Piloterr scraping LinkedIn: ${profileUrl}`);

  try {
    const apiUrl = `https://piloterr.com/api/v2/linkedin/profile/info?query=${encodeURIComponent(profileUrl)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'x-api-key': PILOTERR_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Piloterr LinkedIn HTTP error:', response.status, errorText);
      return { success: false, error: `Piloterr LinkedIn error: ${response.status}` };
    }

    const data = await response.json();
    console.log('Piloterr LinkedIn response keys:', Object.keys(data || {}));

    if (!data || data.error) {
      return { success: false, error: data?.error || 'Dados não encontrados no LinkedIn' };
    }

    const markdown = formatLinkedInProfile(data);
    
    if (!markdown || markdown.length < 50) {
      return { success: false, error: 'Dados insuficientes do LinkedIn' };
    }

    return { success: true, data: markdown };
  } catch (error) {
    console.error('Piloterr LinkedIn error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro no Piloterr LinkedIn' };
  }
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

// ============= AI Analysis =============

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
