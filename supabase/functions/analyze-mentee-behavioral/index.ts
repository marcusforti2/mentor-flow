import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const PILOTERR_API_KEY = Deno.env.get('PILOTERR_API_KEY') || '';
const PILOTERR_API_KEYS = PILOTERR_API_KEY ? [PILOTERR_API_KEY] : [];

// ===== Piloterr Scraping (reused patterns from lead-qualifier) =====

function extractLinkedInSlug(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const inIndex = pathParts.indexOf('in');
    if (inIndex !== -1 && pathParts[inIndex + 1]) return pathParts[inIndex + 1].replace(/\/$/, '');
    return pathParts[pathParts.length - 1]?.replace(/\/$/, '') || null;
  } catch { return null; }
}

async function scrapeInstagram(username: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (PILOTERR_API_KEYS.length === 0) return { success: false, error: 'No Piloterr keys' };
  const clean = username.replace('@', '').trim();
  
  for (const apiKey of PILOTERR_API_KEYS) {
    try {
      const res = await fetch(`https://piloterr.com/api/v2/instagram/user/info?query=${encodeURIComponent(clean)}`, {
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
      });
      if (res.status === 402 || res.status === 429) continue;
      if (!res.ok) return { success: false, error: `Instagram error: ${res.status}` };
      const d = await res.json();
      const p = d.data || d;
      const md = `# Instagram: @${p.username || clean}\n**Nome:** ${p.full_name || 'N/A'}\n**Bio:** ${p.biography || 'N/A'}\n**Seguidores:** ${p.follower_count || 'N/A'}\n**Posts:** ${p.media_count || 'N/A'}\n**Website:** ${p.external_url || 'N/A'}\n**Business:** ${p.is_business_account ? 'Sim' : 'Não'}\n**Categoria:** ${p.business_category_name || p.category_name || 'N/A'}`;
      if (md.length < 50) continue;
      return { success: true, data: md };
    } catch { continue; }
  }
  return { success: false, error: 'All Piloterr keys failed for Instagram' };
}

async function scrapeLinkedIn(profileUrl: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (PILOTERR_API_KEYS.length === 0) return { success: false, error: 'No Piloterr keys' };
  const slug = extractLinkedInSlug(profileUrl);
  const variants = [profileUrl.replace(/\/+$/, '')];
  if (slug) { variants.push(slug); variants.push(`https://www.linkedin.com/in/${slug}`); }

  for (const apiKey of PILOTERR_API_KEYS) {
    for (const query of variants) {
      try {
        const res = await fetch(`https://piloterr.com/api/v2/linkedin/profile/info?query=${encodeURIComponent(query)}`, {
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
        });
        if (res.status === 402 || res.status === 429) break;
        if (res.status === 404) continue;
        if (!res.ok) continue;
        const d = await res.json();
        const p = d.data || d;
        const exps = (p.experiences || []).slice(0, 3).map((e: any) => `- ${e.title} @ ${e.company} (${e.duration || 'N/A'})`).join('\n');
        const md = `# LinkedIn: ${p.full_name || 'N/A'}\n**Headline:** ${p.headline || 'N/A'}\n**Localização:** ${p.location || 'N/A'}\n**Empresa:** ${p.company || p.experiences?.[0]?.company || 'N/A'}\n**Cargo:** ${p.position || p.experiences?.[0]?.title || 'N/A'}\n**Sobre:** ${p.summary || 'N/A'}\n**Experiência:**\n${exps || 'N/A'}\n**Skills:** ${(p.skills || []).slice(0, 10).join(', ') || 'N/A'}`;
        if (md.length < 50) continue;
        return { success: true, data: md };
      } catch { continue; }
    }
  }
  return { success: false, error: 'All Piloterr keys failed for LinkedIn' };
}

// ===== AI Analysis =====

async function generateBehavioralAnalysis(socialData: string, mentorContext: string, businessData: string): Promise<any> {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `Você é um PSICÓLOGO COMPORTAMENTAL ESPECIALISTA em mentoria de alto performance. Seu trabalho é criar análises comportamentais profundas que ajudem mentores a entender seus mentorados em um nível que ninguém mais consegue.

Você analisa dados de redes sociais e cruza com o contexto da mentoria para gerar insights acionáveis.

REGRAS:
1. Seja ESPECÍFICO - use dados reais do perfil, não genéricos
2. Aplique conceitos de psicologia silenciosamente (DISC, Eneagrama, PNL) sem nomeá-los
3. Foque em AÇÃO - cada insight deve ter uma recomendação prática
4. Responda APENAS em JSON válido
5. Todas as respostas em português brasileiro`;

  const userPrompt = `## CONTEXTO DA MENTORIA (O QUE O MENTOR FAZ):
${mentorContext || 'Não configurado'}

## DADOS DO NEGÓCIO DO MENTORADO:
${businessData || 'Não informado'}

## DADOS DAS REDES SOCIAIS DO MENTORADO:
${socialData || 'Nenhum dado social disponível'}

## TAREFA - GERAR ANÁLISE COMPORTAMENTAL PROFUNDA:

Retorne um JSON com as seguintes seções. Cada seção deve ter: "summary" (texto) e "items" (array de strings com pontos específicos):

{
  "behavioral_profile": {
    "summary": "<estilo de comunicação, como prefere ser abordado, linguagem que ressoa - 3-4 frases>",
    "items": ["<ponto 1>", "<ponto 2>", "<ponto 3>"]
  },
  "hidden_fears": {
    "summary": "<o que ele teme mas não fala - bloqueios inconscientes>",
    "items": ["<medo 1>", "<medo 2>", "<medo 3>", "<medo 4>"]
  },
  "emotional_patterns": {
    "summary": "<padrões repetitivos que sabotam resultados>",
    "items": ["<padrão 1 com explicação>", "<padrão 2>", "<padrão 3>"]
  },
  "execution_blockers": {
    "summary": "<o que impede de executar>",
    "items": ["<bloqueio 1>", "<bloqueio 2>", "<bloqueio 3>"]
  },
  "potentiation_strategy": {
    "summary": "<como trazer para o recurso emocional e tirá-lo da dor>",
    "items": ["<estratégia 1>", "<estratégia 2>", "<estratégia 3>"]
  },
  "ideal_language": {
    "summary": "<qual tom, palavras e abordagem usar>",
    "items": ["<dica de linguagem 1>", "<dica 2>", "<dica 3>"]
  },
  "mentor_mistakes": {
    "summary": "<o que NÃO fazer com esse tipo de pessoa>",
    "items": ["<erro 1>", "<erro 2>", "<erro 3>"]
  },
  "how_to_succeed": {
    "summary": "<estratégias específicas para maximizar resultados>",
    "items": ["<ação 1>", "<ação 2>", "<ação 3>"]
  },
  "motivation_triggers": {
    "summary": "<o que faz essa pessoa agir>",
    "items": ["<gatilho 1>", "<gatilho 2>", "<gatilho 3>"]
  },
  "alert_signals": {
    "summary": "<comportamentos que indicam desengajamento>",
    "items": ["<sinal 1>", "<sinal 2>", "<sinal 3>"]
  }
}`;

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
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    if (response.status === 429) throw new Error("Rate limit exceeded. Tente novamente em alguns minutos.");
    if (response.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`AI error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';
  
  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI returned invalid format");
  
  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { mentee_membership_id, mentor_membership_id, tenant_id } = await req.json();
    
    if (!mentee_membership_id || !mentor_membership_id || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch mentee profile (social links from business_profile)
    const { data: menteeProfile } = await supabase
      .from('mentee_profiles')
      .select('business_profile, business_name')
      .eq('membership_id', mentee_membership_id)
      .maybeSingle();

    const bp = (menteeProfile?.business_profile || {}) as Record<string, any>;
    const instagram = bp.instagram || '';
    const linkedin = bp.linkedin || '';

    // 2. Fetch mentor profile settings
    const { data: mentorProfile } = await supabase
      .from('mentor_profiles')
      .select('settings')
      .eq('membership_id', mentor_membership_id)
      .maybeSingle();

    const mentorSettings = (mentorProfile?.settings || {}) as Record<string, any>;
    const mentorContext = [
      mentorSettings.mentorship_description && `**Descrição:** ${mentorSettings.mentorship_description}`,
      mentorSettings.methodology && `**Metodologia:** ${mentorSettings.methodology}`,
      mentorSettings.ideal_mentee_profile && `**Perfil Ideal:** ${mentorSettings.ideal_mentee_profile}`,
      mentorSettings.main_results && `**Resultados:** ${mentorSettings.main_results}`,
      mentorSettings.expectations && `**Expectativas:** ${mentorSettings.expectations}`,
    ].filter(Boolean).join('\n') || 'Perfil do mentor não configurado';

    // 3. Scrape social data
    let socialData = '';
    let socialSource = 'none';
    const sources: string[] = [];

    if (instagram) {
      console.log(`Scraping Instagram: ${instagram}`);
      const igResult = await scrapeInstagram(instagram);
      if (igResult.success && igResult.data) {
        socialData += igResult.data + '\n\n';
        sources.push('instagram');
      } else {
        console.warn('Instagram scraping failed:', igResult.error);
      }
    }

    if (linkedin) {
      console.log(`Scraping LinkedIn: ${linkedin}`);
      const liResult = await scrapeLinkedIn(linkedin);
      if (liResult.success && liResult.data) {
        socialData += liResult.data + '\n\n';
        sources.push('linkedin');
      } else {
        console.warn('LinkedIn scraping failed:', liResult.error);
      }
    }

    socialSource = sources.length > 0 ? sources.join('+') : 'none';

    // Business data from profile
    const businessData = [
      bp.business_name && `Empresa: ${bp.business_name}`,
      bp.business_type && `Tipo: ${bp.business_type}`,
      bp.maturity_level && `Maturidade: ${bp.maturity_level}`,
      bp.main_offer && `Oferta: ${bp.main_offer}`,
      bp.target_audience && `Público: ${bp.target_audience}`,
    ].filter(Boolean).join('\n');

    // 4. Generate AI analysis
    console.log(`Generating behavioral analysis (social sources: ${socialSource})`);
    const analysis = await generateBehavioralAnalysis(socialData, mentorContext, businessData);

    // 5. Save to database
    const { data: saved, error: saveError } = await supabase
      .from('mentee_behavioral_analyses')
      .insert({
        membership_id: mentee_membership_id,
        tenant_id,
        generated_by: mentor_membership_id,
        social_data_source: socialSource,
        behavioral_profile: analysis.behavioral_profile,
        hidden_fears: analysis.hidden_fears,
        emotional_patterns: analysis.emotional_patterns,
        execution_blockers: analysis.execution_blockers,
        potentiation_strategy: analysis.potentiation_strategy,
        ideal_language: analysis.ideal_language,
        mentor_mistakes: analysis.mentor_mistakes,
        how_to_succeed: analysis.how_to_succeed,
        motivation_triggers: analysis.motivation_triggers,
        alert_signals: analysis.alert_signals,
        full_report: JSON.stringify(analysis),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      throw new Error('Failed to save analysis');
    }

    return new Response(JSON.stringify({ success: true, analysis: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("analyze-mentee-behavioral error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
