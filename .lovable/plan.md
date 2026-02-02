

# Plano: 7 Ferramentas de IA para Mentorados

## Visao Geral

Implementar um hub completo de ferramentas de IA para otimizar os resultados dos mentorados, utilizando o contexto do perfil de negocio ja cadastrado. Todas as ferramentas usarao o Lovable AI Gateway (Gemini 3 Flash Preview) e serao acessiveis atraves de uma nova pagina dedicada.

---

## As 7 Ferramentas

| # | Ferramenta | Descricao |
|---|------------|-----------|
| 1 | **Gerador de Scripts de Vendas** | Scripts personalizados para DM, ligacao e proposta |
| 2 | **Simulador de Objecoes (Role-Play)** | IA simula prospect dificil para treino |
| 3 | **Coach de Follow-up Inteligente** | Sugere mensagens baseadas no CRM |
| 4 | **Gerador de Conteudo para Autoridade** | Posts, carrosseis e copies |
| 5 | **Criador de Propostas Comerciais** | Propostas personalizadas |
| 6 | **Analisador de Padroes de Conversao** | Insights de leads ganhos vs perdidos |
| 7 | **Mentor Virtual 24/7** | Chatbot de vendas de alto ticket |

---

## Arquitetura

### Nova Pagina: Ferramentas IA

```text
/app/ferramentas
  |-- TabNavigation (7 tabs)
  |-- Cada ferramenta em seu proprio componente
  |-- Todas usam o contexto do negocio (mentorado_business_profiles)
```

### Edge Function Unificada

Expandir `ai-analysis` ou criar nova `ai-tools` para:
- Receber o tipo da ferramenta
- Buscar perfil do negocio automaticamente
- Aplicar prompt especializado
- Retornar resultado estruturado

---

## Estrutura de Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/member/FerramentasIA.tsx` | Pagina principal com tabs |
| `src/components/ai-tools/ScriptGenerator.tsx` | Ferramenta 1 - Scripts |
| `src/components/ai-tools/ObjectionSimulator.tsx` | Ferramenta 2 - Role-play |
| `src/components/ai-tools/FollowUpCoach.tsx` | Ferramenta 3 - Follow-up |
| `src/components/ai-tools/ContentGenerator.tsx` | Ferramenta 4 - Conteudo |
| `src/components/ai-tools/ProposalCreator.tsx` | Ferramenta 5 - Propostas |
| `src/components/ai-tools/ConversionAnalyzer.tsx` | Ferramenta 6 - Padroes |
| `src/components/ai-tools/VirtualMentor.tsx` | Ferramenta 7 - Chat |
| `supabase/functions/ai-tools/index.ts` | Edge function dedicada |

---

## Detalhes das Ferramentas

### 1. Gerador de Scripts de Vendas

**Interface:**
- Select: Tipo (DM inicial, DM follow-up, Ligacao, Proposta)
- Input: Contexto adicional do lead (opcional)
- Output: Script formatado com variacoes

**Prompt IA:**
- Usa perfil do negocio (oferta, publico, diferencial)
- Gera 3 variacoes de script
- Inclui gatilhos mentais e CTAs

### 2. Simulador de Objecoes (Role-Play)

**Interface:**
- Chat interativo estilo conversa
- IA atua como prospect dificil
- Botao "Nova Simulacao"
- Ao final: Feedback detalhado

**Logica:**
- Sistema de turns (usuario -> IA -> usuario)
- IA levanta objecoes reais do mercado
- Analise final com nota e sugestoes

### 3. Coach de Follow-up Inteligente

**Interface:**
- Select: Escolher lead do CRM
- Mostra historico de interacoes
- Botao "Gerar Sugestao"
- Output: Mensagem pronta + timing ideal

**Integracao:**
- Busca leads de `crm_prospections`
- Busca interacoes de `crm_interactions`
- IA analisa contexto e sugere abordagem

### 4. Gerador de Conteudo para Autoridade

**Interface:**
- Select: Tipo (Post LinkedIn, Carrossel IG, Story, Copy de anuncio)
- Input: Tema/assunto
- Output: Conteudo formatado com dicas de publicacao

**Prompt IA:**
- Baseado no posicionamento do negocio
- Inclui hooks, estrutura e CTAs
- Gera versoes para diferentes plataformas

### 5. Criador de Propostas Comerciais

**Interface:**
- Form: Nome do cliente, empresa, dor principal
- Select: Tipo de proposta (completa, resumida)
- Output: Proposta formatada em Markdown
- Botao: Copiar / Exportar

**Prompt IA:**
- Usa oferta principal e diferenciais
- Estrutura profissional de proposta
- Inclui investimento e garantias

### 6. Analisador de Padroes de Conversao

**Interface:**
- Dashboard com insights automaticos
- Graficos de conversao por status
- Lista de padroes identificados
- Botao "Analisar Meu Pipeline"

**Logica:**
- Analisa todos os leads do mentorado
- Compara fechados vs perdidos
- Identifica padroes de sucesso

### 7. Mentor Virtual 24/7

**Interface:**
- Chat completo com historico
- Streaming de respostas
- Sugestoes de perguntas rapidas
- Contexto do negocio sempre disponivel

**Diferenciais:**
- Treinado na metodologia de vendas de alto ticket
- Conhece o negocio do mentorado
- Respostas praticas e diretas

---

## Detalhes Tecnicos

### Edge Function: ai-tools

```typescript
// Tipos suportados
type ToolType = 
  | "script_generator"
  | "objection_simulator" 
  | "followup_coach"
  | "content_generator"
  | "proposal_creator"
  | "conversion_analyzer"
  | "virtual_mentor";

// Payload
interface AIToolRequest {
  tool: ToolType;
  mentorado_id: string;
  data: {
    // Especifico de cada ferramenta
    script_type?: string;
    lead_id?: string;
    content_type?: string;
    message?: string;
    // ...
  };
}
```

### Busca de Contexto

Todas as ferramentas buscam automaticamente:

```typescript
const { data: businessProfile } = await supabase
  .from("mentorado_business_profiles")
  .select("*")
  .eq("mentorado_id", mentorado_id)
  .single();

// Injeta no prompt como contexto
const context = `
NEGOCIO: ${businessProfile.business_name}
OFERTA: ${businessProfile.main_offer}
PUBLICO: ${businessProfile.target_audience}
DIFERENCIAL: ${businessProfile.unique_value_proposition}
DORES: ${businessProfile.pain_points_solved.join(", ")}
`;
```

### Streaming (Virtual Mentor)

```typescript
// Frontend usa SSE para streaming
const response = await fetch(CHAT_URL, {
  method: "POST",
  body: JSON.stringify({ messages }),
});

const reader = response.body.getReader();
// Processa chunks em tempo real
```

---

## Navegacao

### Atualizar MemberLayout

Adicionar item no menu:

```typescript
{ icon: Sparkles, label: 'Ferramentas IA', path: '/app/ferramentas' },
```

### Atualizar App.tsx

```typescript
<Route path="ferramentas" element={<FerramentasIA />} />
```

---

## Banco de Dados

### Nova Tabela: ai_tool_history (opcional)

Para salvar historico de uso das ferramentas:

```sql
CREATE TABLE ai_tool_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID REFERENCES mentorados(id),
  tool_type TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Fluxo do Usuario

```text
1. Mentorado acessa /app/ferramentas
2. Ve as 7 ferramentas em tabs/cards
3. Seleciona uma ferramenta
4. Preenche inputs necessarios
5. Clica em "Gerar"
6. Recebe resultado personalizado ao seu negocio
7. Pode copiar, editar ou gerar novamente
```

---

## Prioridade de Implementacao

1. **Gerador de Scripts** - Uso imediato, alta demanda
2. **Mentor Virtual** - Engajamento diario
3. **Simulador de Objecoes** - Treinamento pratico
4. **Coach de Follow-up** - Integrado ao CRM
5. **Gerador de Conteudo** - Marketing
6. **Criador de Propostas** - Fechamento
7. **Analisador de Padroes** - Insights

---

## Resultado Esperado

- Pagina `/app/ferramentas` com 7 ferramentas de IA
- Todas personalizadas ao negocio do mentorado
- Interface moderna com tabs ou grid de cards
- Edge function unificada para todas as ferramentas
- Streaming no chat do Mentor Virtual
- Integracao com CRM para follow-up e analise

