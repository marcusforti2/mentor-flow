
# Analise Comportamental Profunda do Mentorado + Perfil do Mentor

## Resumo

Criar um sistema de analise comportamental/psicologica profunda do mentorado, alimentada pelo scraping de redes sociais (Piloterr) e cruzada com o contexto da mentoria do mentor. O resultado e um relatorio estrategico que ajuda o mentor a entender profundamente cada aluno e saber exatamente como potencializa-lo.

---

## Parte 1: Perfil da Mentoria (visao do Mentor)

Adicionar uma nova aba/secao no perfil do mentor onde ele descreve **o que faz na mentoria**. Esses dados serao cruzados com o perfil do mentorado pela IA.

**Campos a capturar (salvos em `mentor_profiles.settings` JSONB):**
- Descricao da mentoria (o que voce faz, qual transformacao entrega)
- Metodologia principal (como funciona o processo)
- Perfil ideal do mentorado (quem se encaixa melhor)
- Principais resultados que entrega
- O que espera do mentorado (comprometimento, dedicacao)

**Onde aparece:** Nova rota `/mentor/perfil` com formulario dedicado, adicionada ao menu lateral do mentor.

---

## Parte 2: Analise Comportamental IA (visao do Mentor sobre o Mentorado)

Dentro do perfil de cada mentorado (Sheet lateral em `/mentor/mentorados`), adicionar uma nova aba **"Analise IA"** com botao "Gerar Analise".

### Fluxo:
1. Mentor clica "Gerar Analise" no perfil do mentorado
2. Sistema puxa redes sociais do mentorado (Instagram/LinkedIn via Piloterr - dados ja salvos no cadastro)
3. Sistema puxa o contexto da mentoria do mentor (`mentor_profiles.settings`)
4. Edge Function cruza TUDO e gera o relatorio via Gemini

### Conteudo do Relatorio:

| Secao | Descricao |
|-------|-----------|
| Perfil Comportamental | Estilo de comunicacao, como prefere ser abordado, linguagem que ressoa |
| Medos Ocultos | O que ele teme mas nao fala - bloqueios inconscientes |
| Vicios Emocionais | Padroes repetitivos que sabotam resultados (procrastinacao, perfeccionismo, etc) |
| Bloqueios de Execucao | O que pode impedir o mentorado de fazer o que precisa fazer |
| Estrategia de Potencializacao | Como trazê-lo para o recurso emocional e tira-lo da dor |
| Linguagem Ideal | Qual tom, palavras e abordagem usar com esse perfil |
| Erros que o Mentor Pode Cometer | O que NAO fazer com esse tipo de pessoa |
| Como Acertar | Estrategias especificas para maximizar resultados |
| Gatilhos de Motivacao | O que faz essa pessoa agir |
| Sinais de Alerta | Comportamentos que indicam que o mentorado esta desengajando |

### Armazenamento:
Nova tabela `mentee_behavioral_analyses` para persistir os relatorios gerados, permitindo historico e comparacao ao longo do tempo.

---

## Detalhes Tecnicos

### Banco de Dados

**Nova tabela: `mentee_behavioral_analyses`**
- `id` (uuid, PK)
- `membership_id` (FK -> memberships) - mentorado analisado
- `tenant_id` (FK -> tenants)
- `generated_by` (FK -> memberships) - mentor que gerou
- `social_data_source` (text) - "instagram", "linkedin", "both"
- `behavioral_profile` (jsonb) - perfil comportamental
- `hidden_fears` (jsonb) - medos ocultos (array)
- `emotional_patterns` (jsonb) - vicios emocionais (array)
- `execution_blockers` (jsonb) - bloqueios de execucao (array)
- `potentiation_strategy` (jsonb) - como potencializar
- `ideal_language` (jsonb) - linguagem e tom ideal
- `mentor_mistakes` (jsonb) - erros a evitar
- `how_to_succeed` (jsonb) - como acertar
- `motivation_triggers` (jsonb) - gatilhos de motivacao
- `alert_signals` (jsonb) - sinais de alerta
- `full_report` (text) - relatorio completo em markdown
- `created_at` (timestamptz)

RLS: Staff do tenant pode ler/criar; mentorado pode ler as proprias.

### Arquivos a criar/modificar

1. **`src/pages/admin/MentorPerfil.tsx`** (NOVO)
   - Formulario para o mentor descrever sua mentoria
   - Salva em `mentor_profiles.settings` (JSONB)
   - Campos: descricao, metodologia, perfil ideal, resultados, expectativas

2. **`src/components/layouts/MentorLayout.tsx`**
   - Adicionar item de menu "Meu Perfil" apontando para `/mentor/perfil`

3. **`src/App.tsx`**
   - Adicionar rota `/mentor/perfil` -> MentorPerfil

4. **`supabase/functions/analyze-mentee-behavioral/index.ts`** (NOVO)
   - Recebe: `mentee_membership_id`, `mentor_membership_id`
   - Busca redes sociais do mentorado (mentee_profiles.business_profile)
   - Faz scraping via Piloterr (Instagram + LinkedIn)
   - Busca contexto da mentoria do mentor (mentor_profiles.settings)
   - Chama Gemini com prompt especializado em psicologia comportamental
   - Salva resultado em `mentee_behavioral_analyses`
   - Retorna relatorio completo

5. **`src/components/admin/MentoradoBehavioralAnalysis.tsx`** (NOVO)
   - Componente que renderiza o relatorio completo
   - Botao "Gerar Analise" com loading
   - Cards visuais para cada secao (medos, vicios, bloqueios, etc)
   - Historico de analises anteriores

6. **`src/pages/admin/Mentorados.tsx`**
   - Adicionar aba "Analise IA" na Sheet do mentorado
   - Integrar o componente MentoradoBehavioralAnalysis

### Fluxo Tecnico

```
Mentor clica "Gerar Analise"
    |
    v
Frontend envia mentee_membership_id + mentor_membership_id
    |
    v
Edge Function "analyze-mentee-behavioral"
    |-- Busca mentee_profiles.business_profile (instagram, linkedin)
    |-- Busca mentor_profiles.settings (metodologia, contexto)
    |-- Scraping Piloterr (Instagram bio/posts + LinkedIn perfil)
    |-- Monta prompt cruzando: dados sociais + contexto mentoria
    |-- Chama Gemini (google/gemini-3-flash-preview)
    |-- Salva em mentee_behavioral_analyses
    |-- Retorna relatorio
    |
    v
Frontend renderiza cards visuais do relatorio
```

### Prompt da IA (resumo)

A IA recebera:
- Dados publicos das redes sociais do mentorado (bio, posts, experiencia)
- Descricao completa da mentoria do mentor (o que faz, metodologia, expectativas)
- Dados do negocio do mentorado (se preenchido no Governo do Negocio)

E gerara uma analise comportamental focada em:
- Como esse mentorado funciona emocionalmente
- O que o bloqueia silenciosamente
- Qual linguagem usar para ativa-lo
- Como o mentor pode errar e como acertar
- Estrategias personalizadas de potencializacao

