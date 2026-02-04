
# Plano: Qualificador de Leads + Gerador de Cold Messages

## Visao Geral

Duas novas ferramentas de IA para o hub de ferramentas:

1. **Qualificador de Leads**: Scraping de perfis + analise completa com GPT-5.2
2. **Gerador de Cold Messages**: Mensagens personalizadas para Instagram DM e LinkedIn

---

## 1. Qualificador de Leads

### Fluxo de Funcionamento

```text
┌─────────────────────────────────────────────────────────────────────┐
│  USUARIO                                                             │
│  Insere URL do perfil (LinkedIn ou Instagram)                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  EDGE FUNCTION: lead-qualifier                                       │
│  1. Detecta plataforma (LinkedIn/Instagram)                         │
│  2. Chama Firecrawl para scraping do perfil publico                │
│  3. Envia dados para GPT-5.2 com prompt estruturado                │
│  4. Retorna relatorio completo em JSON estruturado                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND: Exibe em ABAS                                            │
│  - Visao Geral (Score + Resumo)                                    │
│  - Perfil Comportamental (DISC)                                     │
│  - Como Abordar                                                     │
│  - O Que NAO Fazer                                                  │
│  - Objecoes Esperadas                                               │
│  - Ancoragem de Valor                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Estrutura do Relatorio (JSON)

```typescript
interface LeadQualificationReport {
  // Visao Geral
  score: number; // 0-100
  score_breakdown: {
    fit_with_offer: number;      // 0-25: Encaixe com a oferta
    buying_signals: number;      // 0-25: Sinais de compra
    engagement_level: number;    // 0-25: Nivel de engajamento
    financial_capacity: number;  // 0-25: Capacidade financeira estimada
  };
  summary: string;
  recommendation: "pursue_hot" | "nurture" | "low_priority" | "not_fit";
  
  // Perfil Comportamental (baseado em DISC sem mencionar)
  behavioral_profile: {
    primary_style: "dominante" | "influente" | "estavel" | "analitico";
    secondary_style: string;
    communication_preference: string;
    decision_making_style: string;
    what_motivates: string[];
    what_frustrates: string[];
    how_to_build_rapport: string;
  };
  
  // Perspectiva do Lead
  lead_perspective: {
    likely_goals: string[];
    current_challenges: string[];
    fears_and_concerns: string[];
    desires_and_aspirations: string[];
  };
  
  // Estrategia de Abordagem
  approach_strategy: {
    opening_hook: string;
    key_points_to_touch: string[];
    topics_to_avoid: string[];
    best_channel: "dm_instagram" | "linkedin" | "whatsapp" | "email";
    best_time_to_contact: string;
  };
  
  // Ancoragem de Valor
  value_anchoring: {
    pain_to_highlight: string;
    result_to_promise: string;
    social_proof_angle: string;
    price_justification: string;
    roi_argument: string;
  };
  
  // Objecoes Esperadas
  expected_objections: Array<{
    objection: string;
    likelihood: "alta" | "media" | "baixa";
    response_strategy: string;
    script_example: string;
  }>;
  
  // O que Afasta Este Lead
  what_pushes_away: {
    behaviors_to_avoid: string[];
    words_to_avoid: string[];
    approaches_that_fail: string[];
  };
  
  // Dados Extraidos do Perfil
  extracted_data: {
    name: string;
    headline: string;
    company: string;
    industry: string;
    location: string;
    followers: number;
    content_topics: string[];
    recent_posts_summary: string;
  };
}
```

### Componente Frontend: LeadQualifier.tsx

Estrutura visual em abas:

| Aba | Conteudo |
|-----|----------|
| **Visao Geral** | Score gauge (0-100), breakdown visual, recomendacao |
| **Perfil Comportamental** | Estilo DISC, como se comunica, o que motiva/frustra |
| **Como Abordar** | Hook inicial, pontos a tocar, melhor canal/horario |
| **O Que Evitar** | Comportamentos, palavras, abordagens a NAO usar |
| **Objecoes** | Lista de objecoes com probabilidade e scripts de resposta |
| **Ancoragem de Valor** | Como justificar preco, ROI, prova social |

---

## 2. Gerador de Cold Messages

### Estrategia de Mensagens

**Instagram DM:**
- Mensagem 1: Conexao simples, humanizada
- Mensagem 2: Introduz valor + convite para conversa

**LinkedIn:**
- Convite de Conexao: Mensagem curta e personalizada
- Mensagem pos-conexao: Valor + sinergia

### Interface do Componente

```text
┌─────────────────────────────────────────────────────────────────────┐
│  GERADOR DE COLD MESSAGES                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Plataforma: [Instagram DM ▼] [LinkedIn ▼]                         │
│                                                                     │
│  Nome do Lead: [__________________]                                 │
│                                                                     │
│  Contexto do Lead (opcional):                                       │
│  [_________________________________________________________]       │
│  (ex: coach de emagrecimento, posta muito sobre mindset)           │
│                                                                     │
│  Tom da Mensagem:                                                   │
│  ( ) Casual e Leve    ( ) Profissional    ( ) Direto               │
│                                                                     │
│                              [Gerar Mensagens]                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Output Esperado

```text
┌─────────────────────────────────────────────────────────────────────┐
│  INSTAGRAM DM                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  📨 MENSAGEM 1 - Conexao                                           │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Oi Marina! Tudo bem? 👋                                        │ │
│  │ Vi seu perfil e achei muito legal seu trabalho com coaching    │ │
│  │ de emagrecimento. Parabens pelo conteudo!                      │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                               [Copiar] [Ajustar]   │
│                                                                     │
│  📨 MENSAGEM 2 - Follow-up (enviar apos resposta)                  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Que legal! Olha, eu trabalho ajudando profissionais como voce  │ │
│  │ a [beneficio especifico]. Seria interessante trocarmos uma     │ │
│  │ ideia pra ver se faz sentido uma parceria? 🤝                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                               [Copiar] [Ajustar]   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/ai-tools/LeadQualifier.tsx` | Componente frontend com abas |
| `src/components/ai-tools/ColdMessageGenerator.tsx` | Gerador de mensagens |
| `supabase/functions/lead-qualifier/index.ts` | Edge function com Firecrawl + GPT-5.2 |
| `supabase/functions/firecrawl-scrape/index.ts` | Edge function para scraping |
| `src/lib/api/firecrawl.ts` | API client para Firecrawl |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/member/FerramentasIA.tsx` | Adicionar 2 novas abas |
| `supabase/config.toml` | Registrar novas edge functions |

---

## Detalhes Tecnicos

### 1. Conexao com Firecrawl

O conector Firecrawl esta disponivel no workspace. Sera necessario:
1. Conectar o Firecrawl ao projeto via ferramenta `connect`
2. Criar edge function que usa `FIRECRAWL_API_KEY`
3. Scraping retorna markdown do perfil publico

### 2. Modelo de IA

- **Qualificador de Leads**: `openai/gpt-5.2` (analise mais elaborada)
- **Cold Messages**: `google/gemini-3-flash-preview` (rapido e eficiente)

### 3. Prompt do Qualificador (Resumido)

```text
Voce e um especialista em analise de leads e psicologia de vendas.

CONTEXTO DO NEGOCIO DO VENDEDOR:
[business_profile]

DADOS DO PERFIL DO LEAD (scraped):
[firecrawl_result]

TAREFA: Analise PROFUNDAMENTE este lead e retorne um JSON estruturado com:
1. Score de qualificacao (0-100) com breakdown
2. Perfil comportamental baseado em DISC (sem nomear teorias)
3. Perspectiva do lead (medos, desejos, desafios)
4. Estrategia de abordagem personalizada
5. O que NAO fazer com este lead
6. Objecoes esperadas com scripts de resposta
7. Como ancorar valor e justificar preco

Seja ESPECIFICO e use informacoes reais do perfil.
```

### 4. Prompt do Cold Messages (Resumido)

```text
Voce e um copywriter especialista em prospecao fria.

CONTEXTO DO NEGOCIO:
[business_profile]

INFORMACOES DO LEAD:
- Nome: [lead_name]
- Contexto: [lead_context]
- Plataforma: [platform]

TAREFA: Crie mensagens de prospecao seguindo esta estrategia:

MENSAGEM 1 (Conexao):
- Simples e humanizada
- Apenas "oi, tudo bem" + elogio genuino
- NAO venda nada ainda
- Max 3 linhas

MENSAGEM 2 (Valor):
- Introduz o que voce faz de forma suave
- Menciona possivel sinergia
- Convida para conversa sem pressao
- Max 5 linhas
```

---

## Fluxo de Implementacao

1. **Conectar Firecrawl** ao projeto
2. **Criar edge function** `firecrawl-scrape` para scraping
3. **Criar edge function** `lead-qualifier` com GPT-5.2
4. **Criar componente** `LeadQualifier.tsx` com abas
5. **Criar componente** `ColdMessageGenerator.tsx`
6. **Atualizar** `FerramentasIA.tsx` com novas abas
7. **Testar** fluxo completo

---

## Resultado Final

O mentorado tera:

1. **Qualificador de Leads**: Pega URL do perfil, faz scraping, gera relatorio COMPLETO com score, perfil comportamental, estrategia de abordagem, objecoes esperadas e muito mais - tudo em abas organizadas.

2. **Gerador de Cold Messages**: Cria sequencia de mensagens para Instagram DM e LinkedIn, seguindo estrategia de conexao primeiro + valor depois.

Ambas as ferramentas usam o contexto do perfil de negocio do mentorado para personalizar 100% das sugestoes.
