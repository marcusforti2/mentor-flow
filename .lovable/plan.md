
# Plano: CRM Inteligente com Analise de Imagens por IA

## Visao Geral

Criar um CRM completo para o mentorado que utiliza IA (Gemini com visao) para analisar screenshots de conversas e redes sociais, extraindo automaticamente informacoes do lead e sugerindo o cadastro. A IA usara o contexto do negocio do mentorado para personalizar a analise.

---

## Estrutura do Projeto

### 1. Cadastro do Negocio (Contexto para IA)

Nova tabela `mentorado_business_profiles`:

```text
mentorado_business_profiles
  |-- mentorado_id (FK)
  |-- business_name (nome do negocio)
  |-- business_type (mentoria/consultoria/conselho)
  |-- target_audience (publico alvo)
  |-- main_offer (oferta principal)
  |-- price_range (faixa de preco)
  |-- unique_value_proposition (diferencial)
  |-- pain_points_solved (dores que resolve)
  |-- ideal_client_profile (perfil do cliente ideal)
```

### 2. Tabelas Existentes a Utilizar

```text
crm_prospections (Leads do Mentorado)
  |-- contact_name, contact_email, contact_phone
  |-- company, notes, status, points
  |
  +-- crm_interactions (Historico)
        |-- type, description, outcome
```

### 3. Storage Bucket para Screenshots

Bucket `lead-screenshots` para armazenar os prints enviados (ate 10 por analise).

---

## Edge Function: analyze-lead-screenshots

Nova funcao que:

1. Recebe ate 10 imagens (base64 ou URLs)
2. Busca o perfil do negocio do mentorado
3. Envia para Gemini com prompt contextualizado
4. Retorna dados estruturados do lead:
   - Nome detectado
   - Telefone/email (se visivel)
   - Empresa/ocupacao
   - Interesses identificados
   - Nivel de interesse (frio/morno/quente)
   - Objecoes detectadas
   - Sugestao de abordagem personalizada
   - Insights para venda

### Prompt da IA

A IA recebera:
- Contexto do negocio (oferta, publico, diferencial)
- Screenshots para analise
- Instrucoes para extrair informacoes de vendas

---

## Componentes de UI

### 1. Pagina Principal - MeuCRM.tsx

Layout com:
- **Header**: Estatisticas rapidas (leads, conversoes, pontos)
- **Pipeline Kanban**: Colunas por status (Novo, Contato, Proposta, Fechado, Perdido)
- **Botao FAB**: "Novo Lead com IA"
- **Filtros**: Por status, data, temperatura

### 2. LeadUploadModal Component

Modal para adicionar lead via IA:
- Dropzone para ate 10 imagens
- Preview das imagens selecionadas
- Botao "Analisar com IA"
- Loading state durante analise
- Resultado com dados extraidos editaveis
- Botao "Salvar Lead"

### 3. LeadCard Component

Card no Kanban com:
- Nome e avatar (iniciais)
- Temperatura (badge colorido)
- Empresa/ocupacao
- Ultima interacao
- Menu de acoes (editar, mover, excluir)
- Indicador de screenshots anexados

### 4. LeadDetailSheet Component

Sheet lateral ao clicar no lead:
- Todas as informacoes do lead
- Screenshots originais (galeria)
- Insights da IA
- Historico de interacoes
- Formulario para adicionar interacao
- Sugestoes de proximos passos

### 5. BusinessProfileForm Component

Formulario no perfil do mentorado para cadastrar o negocio:
- Campos estruturados sobre a oferta
- Dicas de preenchimento
- Indicador de "perfil completo"

---

## Fluxo do Usuario

```text
1. Mentorado acessa /app/meu-crm
2. Clica em "Novo Lead com IA"
3. Faz upload de ate 10 screenshots
4. IA analisa e extrai informacoes
5. Mentorado revisa e edita dados
6. Confirma e lead e adicionado ao pipeline
7. Arrasta entre colunas conforme evolui
8. Adiciona interacoes e anotacoes
9. Recebe sugestoes da IA para fechar
```

---

## Estrutura de Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/member/MeuCRM.tsx` | Pagina principal com Kanban |
| `src/components/crm/LeadUploadModal.tsx` | Modal de upload e analise IA |
| `src/components/crm/LeadCard.tsx` | Card do lead no Kanban |
| `src/components/crm/LeadDetailSheet.tsx` | Detalhes do lead |
| `src/components/crm/KanbanColumn.tsx` | Coluna do pipeline |
| `src/components/crm/BusinessProfileForm.tsx` | Cadastro do negocio |
| `supabase/functions/analyze-lead-screenshots/index.ts` | Edge function IA |

---

## Detalhes Tecnicos

### Analise de Imagens com Gemini

O Gemini 2.5 Flash suporta analise de imagens. A edge function:

1. Recebe imagens em base64
2. Monta array de conteudo multimodal
3. Envia para Lovable AI Gateway
4. Parseia resposta estruturada via tool calling

### Exemplo de Payload Multimodal

```typescript
messages: [
  {
    role: "user",
    content: [
      { type: "text", text: systemPrompt + userPrompt },
      { type: "image_url", image_url: { url: "data:image/png;base64,..." } },
      // ... mais imagens
    ]
  }
]
```

### Extração Estruturada

Usar tool calling para garantir formato JSON:

```typescript
tools: [{
  type: "function",
  function: {
    name: "extract_lead_data",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        company: { type: "string" },
        temperature: { enum: ["cold", "warm", "hot"] },
        insights: { type: "array", items: { type: "string" } },
        suggested_approach: { type: "string" }
      }
    }
  }
}]
```

---

## Alteracoes no Banco de Dados

### Nova Tabela

```sql
CREATE TABLE mentorado_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
  business_name TEXT,
  business_type TEXT,
  target_audience TEXT,
  main_offer TEXT,
  price_range TEXT,
  unique_value_proposition TEXT,
  pain_points_solved TEXT[],
  ideal_client_profile TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mentorado_id)
);
```

### Adicionar coluna na crm_prospections

```sql
ALTER TABLE crm_prospections ADD COLUMN IF NOT EXISTS
  ai_insights JSONB,
  temperature TEXT DEFAULT 'cold',
  screenshot_urls TEXT[];
```

### Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-screenshots', 'lead-screenshots', false);
```

---

## Resultado Esperado

CRM inteligente com:
- Upload de screenshots para analise automatica
- IA que entende WhatsApp, Instagram, LinkedIn, etc
- Extracao de dados do lead contextualizada ao negocio
- Pipeline visual estilo Kanban
- Historico de interacoes
- Sugestoes personalizadas de abordagem
- Pontuacao automatica de leads
