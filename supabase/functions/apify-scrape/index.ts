import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Apify Actor IDs for different platforms
const APIFY_ACTORS = {
  instagram: 'apify/instagram-profile-scraper',
  linkedin: 'bebity/linkedin-profile-scraper',
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
    
    if (platform === 'instagram') {
      // instagram.com/username or instagram.com/username/
      return pathParts[0]?.replace('@', '') || null;
    }
    if (platform === 'linkedin') {
      // linkedin.com/in/username
      return pathParts.find(p => p !== 'in') || null;
    }
    if (platform === 'twitter') {
      return pathParts[0]?.replace('@', '') || null;
    }
    if (platform === 'tiktok') {
      return pathParts[0]?.replace('@', '') || null;
    }
    return pathParts[0] || null;
  } catch {
    return null;
  }
}

async function runApifyActor(actorId: string, input: Record<string, unknown>, apiKey: string): Promise<any> {
  console.log(`Running Apify actor: ${actorId}`);
  
  // Start the actor run
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );

  if (!runResponse.ok) {
    const error = await runResponse.text();
    console.error('Apify run failed:', error);
    throw new Error(`Failed to start Apify actor: ${error}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data?.id;
  
  if (!runId) {
    throw new Error('No run ID returned from Apify');
  }

  console.log(`Actor run started with ID: ${runId}`);

  // Wait for the run to complete (poll every 2 seconds, max 60 seconds)
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
    );
    
    if (!statusResponse.ok) {
      throw new Error('Failed to check run status');
    }
    
    const statusData = await statusResponse.json();
    const status = statusData.data?.status;
    
    console.log(`Run status: ${status}`);
    
    if (status === 'SUCCEEDED') {
      // Get the dataset items
      const datasetId = statusData.data?.defaultDatasetId;
      const datasetResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}`
      );
      
      if (!datasetResponse.ok) {
        throw new Error('Failed to fetch dataset');
      }
      
      return await datasetResponse.json();
    }
    
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Actor run ${status}`);
    }
    
    attempts++;
  }
  
  throw new Error('Actor run timed out');
}

function formatInstagramProfile(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const profile = data[0];
  return `
# Perfil Instagram: @${profile.username || 'N/A'}

**Nome:** ${profile.fullName || profile.full_name || 'N/A'}
**Bio:** ${profile.biography || profile.bio || 'N/A'}
**Seguidores:** ${profile.followersCount || profile.followers || 'N/A'}
**Seguindo:** ${profile.followingCount || profile.following || 'N/A'}
**Posts:** ${profile.postsCount || profile.posts || 'N/A'}
**Website:** ${profile.externalUrl || profile.website || 'N/A'}
**Verificado:** ${profile.verified ? 'Sim' : 'Não'}
**Conta Business:** ${profile.isBusinessAccount ? 'Sim' : 'Não'}
**Categoria:** ${profile.businessCategoryName || profile.category || 'N/A'}

## Posts Recentes
${(profile.latestPosts || profile.posts || []).slice(0, 5).map((post: any, i: number) => `
### Post ${i + 1}
- Likes: ${post.likesCount || post.likes || 'N/A'}
- Comentários: ${post.commentsCount || post.comments || 'N/A'}
- Legenda: ${(post.caption || post.text || '').substring(0, 200)}...
`).join('\n')}
`.trim();
}

function formatLinkedInProfile(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const profile = data[0];
  return `
# Perfil LinkedIn: ${profile.firstName || ''} ${profile.lastName || ''}

**Nome Completo:** ${profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`}
**Headline:** ${profile.headline || profile.title || 'N/A'}
**Localização:** ${profile.location || profile.geoLocationName || 'N/A'}
**Conexões:** ${profile.connectionsCount || profile.connections || 'N/A'}
**Seguidores:** ${profile.followersCount || 'N/A'}
**Empresa Atual:** ${profile.currentCompany || profile.company || 'N/A'}
**Cargo Atual:** ${profile.currentPosition || profile.position || 'N/A'}
**Setor:** ${profile.industry || 'N/A'}

## Sobre
${profile.summary || profile.about || 'N/A'}

## Experiência
${(profile.experience || profile.positions || []).slice(0, 3).map((exp: any, i: number) => `
### ${exp.title || exp.position || 'Cargo'} @ ${exp.companyName || exp.company || 'Empresa'}
- Período: ${exp.timePeriod || exp.duration || 'N/A'}
- Descrição: ${(exp.description || '').substring(0, 150)}...
`).join('\n')}

## Educação
${(profile.education || []).slice(0, 2).map((edu: any) => `
- ${edu.schoolName || edu.school || 'Instituição'}: ${edu.degreeName || edu.degree || 'Formação'}
`).join('\n')}

## Habilidades
${(profile.skills || []).slice(0, 10).map((skill: any) => typeof skill === 'string' ? skill : skill.name).join(', ') || 'N/A'}
`.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('APIFY_API_KEY');
    if (!apiKey) {
      console.error('APIFY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Apify API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return new Response(
        JSON.stringify({ success: false, error: 'Plataforma não suportada. Use Instagram, LinkedIn, Twitter ou TikTok.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const username = extractUsername(url, platform);
    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível extrair o username da URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping ${platform} profile: ${username}`);

    const actorId = APIFY_ACTORS[platform as keyof typeof APIFY_ACTORS];
    let input: Record<string, unknown>;
    
    if (platform === 'instagram') {
      input = {
        usernames: [username],
        resultsLimit: 1,
        addParentData: false,
      };
    } else if (platform === 'linkedin') {
      input = {
        urls: [url.startsWith('http') ? url : `https://${url}`],
      };
    } else if (platform === 'twitter') {
      input = {
        handles: [username],
        tweetsDesired: 10,
        proxyConfig: { useApifyProxy: true },
      };
    } else {
      input = {
        profiles: [username],
        resultsPerPage: 1,
      };
    }

    const data = await runApifyActor(actorId, input, apiKey);
    
    let markdown = '';
    if (platform === 'instagram') {
      markdown = formatInstagramProfile(data);
    } else if (platform === 'linkedin') {
      markdown = formatLinkedInProfile(data);
    } else {
      markdown = JSON.stringify(data, null, 2);
    }

    console.log('Scrape successful');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          markdown,
          platform,
          username,
          rawData: data,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping with Apify:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
