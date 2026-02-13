

# Jornada CS - Sincronizacao e Etapas Editaveis

## Problemas Encontrados

Existem **dois conjuntos diferentes** de etapas da jornada hardcoded no codigo, completamente desconectados:

| Etapa | JornadaCS.tsx | Mentorados.tsx |
|-------|--------------|----------------|
| Onboarding | 0-7 dias | 0-7 dias |
| Aprendizado | 8-30 dias | 8-30 dias |
| Aplicacao | 31-**60** dias | 31-**90** dias |
| Escala | 61-**90** dias | 91-**180** dias |
| Maestria | 91-365 dias | 181-365 dias |

Ou seja, um mentorado pode aparecer em "Escala" na Jornada CS mas em "Aplicacao" na pagina de Mentorados. Alem disso, as etapas nao sao editaveis e o card do mentorado na Jornada CS nao abre o perfil dele.

---

## Plano de Implementacao

### 1. Criar tabela `cs_journey_stages` no banco de dados

Nova tabela para persistir as etapas editaveis por tenant:

- `id` (UUID, PK)
- `tenant_id` (UUID, FK tenants)
- `name` (text) - ex: "Onboarding"
- `stage_key` (text) - identificador unico
- `day_start` (integer)
- `day_end` (integer)
- `color` (text) - classe Tailwind
- `position` (integer) - ordem
- `created_at`, `updated_at`

RLS: leitura para membros do tenant, escrita para staff (admin/mentor/ops).

### 2. Criar hook `useJourneyStages`

Similar ao padrao ja existente em `usePipelineStages.tsx`:

- Busca etapas do banco por `tenant_id`
- Se nao houver customizacao, retorna os defaults padrao
- Exporta `stages`, `isLoading`, `reload`, `getStageForDay()`
- Funcao helper `getStageForDay(joinedAt)` centralizada

### 3. Criar componente `JourneyStageEditor`

Editor visual no estilo do `PipelineStageEditor` que ja existe no projeto:

- Arrastar para reordenar (drag & drop)
- Editar nome, cor, dia inicio e dia fim
- Adicionar / remover etapas
- Botao "Restaurar padrao"
- Salvar no banco

Acessivel dentro da pagina Jornada CS como um botao de engrenagem/configuracao no header.

### 4. Sincronizar TUDO com o hook compartilhado

Substituir os hardcoded `JOURNEY_STAGES` e `defaultJourneyStages` em:

- **JornadaCS.tsx** - view kanban por jornada
- **Mentorados.tsx** - filtros por etapa + badge no card + etapa no perfil detail

Ambos passam a usar `useJourneyStages(tenantId)`, garantindo consistencia total.

### 5. Melhorias de UX/UI

**Card do mentorado na Jornada CS:**
- Clicar no card abre o perfil do mentorado (navegar para `/mentor/mentorados` com o sheet aberto, ou abrir um sheet direto)
- Adicionar mini-indicadores no card: icone se tem leads, se completou onboarding
- Progress bar sutil mostrando % de progresso dentro da etapa atual

**Header da Jornada CS:**
- Botao "Configurar Etapas" com icone de engrenagem ao lado do seletor de filtro
- Ao abrir, exibe o editor de etapas em um Sheet lateral

**Perfil do mentorado (aba Perfil):**
- A etapa exibida passa a ser a do banco (sincronizada)
- Adicionar uma barra de progresso visual mostrando em que ponto da etapa o mentorado esta (ex: "Dia 45 de 90 na etapa Aplicacao")

**Visual dos cards:**
- Bordas com glow sutil na cor da etapa ao hover
- Indicador de "alerta" para mentorados sem atividade recente (mais de 7 dias)

---

## Detalhes Tecnicos

**Migracao SQL:**
```text
CREATE TABLE cs_journey_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  day_start INTEGER NOT NULL DEFAULT 0,
  day_end INTEGER NOT NULL DEFAULT 7,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE cs_journey_stages ENABLE ROW LEVEL SECURITY;
-- Leitura: membros do tenant
-- Escrita: staff do tenant (is_tenant_staff)
```

**Arquivos a criar:**
- `src/hooks/useJourneyStages.tsx`
- `src/components/admin/JourneyStageEditor.tsx`

**Arquivos a modificar:**
- `src/pages/admin/JornadaCS.tsx` - usar hook + adicionar botao editor + link card ao perfil
- `src/pages/admin/Mentorados.tsx` - usar hook + sincronizar filtros e badges

**Padrao seguido:** Mesmo padrao de `usePipelineStages` + `PipelineStageEditor` que ja existe no projeto para o CRM pipeline.

