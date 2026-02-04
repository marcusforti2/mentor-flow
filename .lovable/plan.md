
# Plano: Integrar ScraperAPI e Piloterr para Scraping de Instagram

## Objetivo
Substituir o Apify por ScraperAPI (primário) e Piloterr (fallback) para scraping de perfis do Instagram, mantendo maior confiabilidade e evitando problemas de assinatura.

## Visão Geral da Arquitetura

```text
+---------------+     +-----------------------+
|   Frontend    | --> | lead-qualifier (Edge) |
+---------------+     +-----------------------+
                              |
                              v
                    +-------------------+
                    | detectPlatform()  |
                    +-------------------+
                              |
              +---------------+---------------+
              |                               |
        instagram                      linkedin/outros
              |                               |
              v                               v
    +-------------------+           +------------------+
    | ScraperAPI        |           | Apify/Firecrawl  |
    | (render=true)     |           |                  |
    +-------------------+           +------------------+
              |
         [falha?]
              |
              v
    +-------------------+
    | Piloterr          |
    | (API direta)      |
    +-------------------+
```

## Etapas de Implementação

### 1. Configuração de Secrets
Adicionar duas novas secrets no projeto:
- `SCRAPERAPI_KEY` - Chave da API do ScraperAPI
- `PILOTERR_API_KEY` - Chave da API do Piloterr (fallback)

### 2. Atualização do Edge Function lead-qualifier

**2.1. Adicionar variáveis de ambiente:**
```typescript
const SCRAPERAPI_KEY = Deno.env.get('SCRAPERAPI_KEY');
const PILOTERR_API_KEY = Deno.env.get('PILOTERR_API_KEY');
```

**2.2. Nova função scrapeInstagramWithScraperAPI:**
```typescript
async function scrapeInstagramWithScraperAPI(username: string): Promise<{success: boolean; data?: string; error?: string}> {
  if (!SCRAPERAPI_KEY) {
    return { success: false, error: 'ScraperAPI key não configurada' };
  }

  const instagramUrl = `https://www.instagram.com/${username}/`;
  const scraperApiUrl = `http://api.scraperapi.com?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(instagramUrl)}&render=true&country_code=us`;

  const response = await fetch(scraperApiUrl);
  const html = await response.text();
  
  // Parse HTML para extrair dados do perfil
  const profileData = parseInstagramHTML(html);
  
  if (profileData) {
    return { success: true, data: formatInstagramToMarkdown(profileData) };
  }
  return { success: false, error: 'Não foi possível extrair dados do HTML' };
}
```

**2.3. Nova função de parsing HTML:**
```typescript
function parseInstagramHTML(html: string): any {
  // Tentar window._sharedData (formato antigo)
  let match = html.match(/window\._sharedData\s*=\s*(\{.+?\});<\/script>/s);
  if (match) {
    const data = JSON.parse(match[1]);
    return data?.entry_data?.ProfilePage?.[0]?.graphql?.user;
  }
  
  // Tentar window.__additionalDataLoaded (formato novo)
  match = html.match(/window\.__additionalDataLoaded\s*\(\s*['"].*?['"]\s*,\s*(\{.+?\})\s*\)/s);
  if (match) {
    const data = JSON.parse(match[1]);
    return data?.graphql?.user || data?.user;
  }
  
  // Fallback: meta tags
  return parseInstagramMetaTags(html);
}
```

**2.4. Nova função scrapeInstagramWithPiloterr (fallback):**
```typescript
async function scrapeInstagramWithPiloterr(username: string): Promise<{success: boolean; data?: string; error?: string}> {
  if (!PILOTERR_API_KEY) {
    return { success: false, error: 'Piloterr API key não configurada' };
  }

  const apiUrl = `https://piloterr.com/api/v2/instagram/user/info?query=${encodeURIComponent(username)}`;
  
  const response = await fetch(apiUrl, {
    headers: { 'x-api-key': PILOTERR_API_KEY }
  });
  
  const data = await response.json();
  
  if (data && !data.error) {
    return { success: true, data: formatPiloterrToMarkdown(data) };
  }
  return { success: false, error: data?.error || 'Erro no Piloterr' };
}
```

**2.5. Atualizar lógica de roteamento para Instagram:**
```typescript
if (platform === 'instagram') {
  console.log('Instagram detected, trying ScraperAPI...');
  const scraperResult = await scrapeInstagramWithScraperAPI(username);
  
  if (scraperResult.success) {
    profileData = scraperResult.data;
    scrapeMethod = 'scraperapi';
  } else {
    console.log('ScraperAPI failed, trying Piloterr fallback...');
    const piloterrResult = await scrapeInstagramWithPiloterr(username);
    
    if (piloterrResult.success) {
      profileData = piloterrResult.data;
      scrapeMethod = 'piloterr';
    } else {
      // Manter Apify como último fallback
      const apifyResult = await scrapeWithApify(profileUrl, platform);
      if (apifyResult.success) {
        profileData = apifyResult.data;
        scrapeMethod = 'apify';
      }
    }
  }
}
```

### 3. Funções de Formatação

**formatInstagramToMarkdown:**
```typescript
function formatInstagramToMarkdown(profile: any): string {
  return `
# Perfil Instagram: @${profile.username}

**Nome:** ${profile.full_name || 'N/A'}
**Bio:** ${profile.biography || 'N/A'}
**Seguidores:** ${profile.edge_followed_by?.count || profile.follower_count || 'N/A'}
**Seguindo:** ${profile.edge_follow?.count || profile.following_count || 'N/A'}
**Posts:** ${profile.edge_owner_to_timeline_media?.count || profile.media_count || 'N/A'}
**Website:** ${profile.external_url || 'N/A'}
**Verificado:** ${profile.is_verified ? 'Sim' : 'Não'}
**Conta Business:** ${profile.is_business_account ? 'Sim' : 'Não'}
**Categoria:** ${profile.business_category_name || profile.category_name || 'N/A'}
  `.trim();
}
```

## Detalhes Técnicos

### Secrets Necessárias
| Secret | Serviço | Onde obter |
|--------|---------|------------|
| SCRAPERAPI_KEY | ScraperAPI | https://www.scraperapi.com/signup |
| PILOTERR_API_KEY | Piloterr | https://piloterr.com/ |

### Fluxo de Fallback para Instagram
1. **ScraperAPI** (primário) - Renderiza JavaScript, bypassa proteções
2. **Piloterr** (secundário) - API direta de dados do Instagram
3. **Apify** (terciário) - Actor gratuito como último recurso
4. **Entrada Manual** - Se todos falharem

### Arquivos a Modificar
- `supabase/functions/lead-qualifier/index.ts` - Adicionar novas funções de scraping

### Vantagens desta Abordagem
1. **Maior confiabilidade** - ScraperAPI tem melhor taxa de sucesso com sites protegidos
2. **Sem assinatura de actors** - APIs com planos pay-as-you-go
3. **Múltiplos fallbacks** - 4 níveis de redundância
4. **Melhor parsing** - Código específico para estrutura do Instagram

## Próximos Passos
1. Você precisa fornecer as API keys do ScraperAPI e Piloterr
2. Implementarei as funções de scraping
3. Testaremos com um perfil real do Instagram
