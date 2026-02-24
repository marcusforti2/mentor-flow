

# Plano: Aba "Metricas" no Perfil do Mentorado

## Resumo

Criar um sistema completo de metricas de governanca do negocio do mentorado. O mentorado preenche dados em formato tabela no seu painel. O mentor visualiza tudo em dashboard no perfil do mentorado (nova aba "Metricas"). Inclui KPIs, ROI, Payback, graficos e alertas inteligentes.

---

## Arquitetura de Dados

### Adaptacao ao modelo existente

O sistema ja usa `membership_id` como chave de identidade (nao um `mentee_id` separado). Todas as tabelas novas usarao `membership_id` como FK para `memberships.id`, com `tenant_id` para isolamento multi-tenant via RLS.

Nao sera criada a tabela `mentee_access` proposta no briefing -- o sistema ja possui `is_tenant_staff()` e `mentor_mentee_assignments` para controle de visibilidade. As RLS policies usarao essas funcoes existentes.

### Tabelas novas (5 tabelas)

```text
program_investments
  id (uuid, pk, default gen_random_uuid())
  membership_id (uuid, fk -> memberships.id, NOT NULL)
  tenant_id (uuid, fk -> tenants.id, NOT NULL)
  investment_amount_cents (int, NOT NULL)  -- ex: 6000000 = R$60.000
  start_date (date)
  onboarding_date (date)
  notes (text)
  created_at (timestamptz, default now())

mentee_deals
  id (uuid, pk)
  membership_id (uuid, fk -> memberships.id, NOT NULL)
  tenant_id (uuid, fk -> tenants.id, NOT NULL)
  stage (text, default 'lead')  -- lead, conversa, reuniao_marcada, reuniao_feita, proposta, fechado, perdido
  value_cents (int, default 0)
  source (text)  -- linkedin, indicacao, inbound, etc
  deal_name (text)
  created_at (timestamptz, default now())
  closed_at (timestamptz)
  lost_reason (text)

mentee_activities
  id (uuid, pk)
  membership_id (uuid, fk -> memberships.id, NOT NULL)
  tenant_id (uuid, fk -> tenants.id, NOT NULL)
  type (text, NOT NULL)  -- msg_enviada, ligacao, followup, reuniao, proposta
  count (int, default 1)
  activity_date (date, NOT NULL)
  created_at (timestamptz, default now())

mentee_payments
  id (uuid, pk)
  membership_id (uuid, fk -> memberships.id, NOT NULL)
  tenant_id (uuid, fk -> tenants.id, NOT NULL)
  amount_cents (int, NOT NULL)
  status (text, default 'pendente')  -- recebido, pendente, atrasado, estornado
  description (text)
  due_date (date)
  paid_at (date)
  created_at (timestamptz, default now())

metrics_snapshots  (historico para performance)
  id (uuid, pk)
  membership_id (uuid, fk -> memberships.id, NOT NULL)
  tenant_id (uuid, fk -> tenants.id, NOT NULL)
  period_start (date)
  period_end (date)
  revenue_closed_cents (int)
  revenue_received_cents (int)
  deals_won_count (int)
  meetings_held_count (int)
  roi_ratio (numeric)
  payback_months (numeric)
  created_at (timestamptz, default now())
```

### RLS Policies (todas as 5 tabelas)

Mesmo padrao para todas:
- **SELECT**: Proprio mentorado OU staff do mesmo tenant (`is_tenant_staff(auth.uid(), tenant_id)`)
- **INSERT**: Proprio mentorado (via `membership_id` vinculado ao `auth.uid()`)
- **UPDATE**: Proprio mentorado OU staff do mesmo tenant
- **DELETE**: Proprio mentorado OU staff do mesmo tenant

---

## Frontend -- Visao do Mentorado (preenche dados)

### Nova pagina: `src/pages/member/Metricas.tsx`

Acessivel via `/mentorado/metricas`. Layout em Tabs com 4 sub-abas de preenchimento estilo tabela:

1. **Investimento** -- Form simples para registrar o valor investido no programa, data de inicio e onboarding
2. **Deals (Pipeline)** -- Tabela editavel com colunas: Nome, Stage (select), Valor (R$), Fonte, Data Criacao, Data Fechamento, Motivo Perda. Botao "+ Novo Deal"
3. **Atividades** -- Tabela: Tipo (select), Quantidade, Data. Botao "+ Registrar Atividade"
4. **Caixa (Pagamentos)** -- Tabela: Descricao, Valor, Status (select), Vencimento, Data Pagamento. Botao "+ Novo Pagamento"

Cada tabela usa modais simples para adicionar/editar registros.

### Rota e menu

- Adicionar rota `/mentorado/metricas` no `App.tsx`
- Adicionar item "Metricas" no menu do `MentoradoLayout.tsx` (icone `BarChart3`)

---

## Frontend -- Visao do Mentor (dashboard)

### Nova aba no `MentoradoDetail.tsx`

Adicionar sexta aba "Metricas" (icone `BarChart3`) ao lado das abas existentes (Perfil, Analise, Reunioes, Tarefas, Arquivos).

### Componente: `src/components/admin/MentoradoMetricsDashboard.tsx`

Recebe `membershipId` e `tenantId`. Layout:

```text
+---------------------------------------------------+
| [Filtro Periodo: 7d | 30d | 90d | MTD | YTD | Custom] |
+---------------------------------------------------+
| [Receita Fechada] [Caixa Recebido] [Reunioes] [Conv%] |  <- 4 KPI cards
+---------------------------------------------------+
| Retorno do Programa                                |
| Investimento: R$60.000  Resultado: R$48.000        |
| ROI: -20%              Payback: 15 meses           |
+---------------------------------------------------+
| [Grafico Linha: Receita/semana] [Funil: Deals/stage] |
+---------------------------------------------------+
| [Tabela: Deals do periodo]                         |
| [Tabela: Pagamentos do periodo]                    |
+---------------------------------------------------+
| [Alertas Inteligentes]                             |
+---------------------------------------------------+
```

### Sub-componentes

- `MetricsKPICards.tsx` -- 4 cards com valores calculados
- `MetricsROIBlock.tsx` -- Bloco de retorno do programa com toggle Receita/Caixa
- `MetricsCharts.tsx` -- Grafico de linha (Recharts) + Funil visual
- `MetricsDealsTable.tsx` -- Tabela de deals com filtro por periodo
- `MetricsPaymentsTable.tsx` -- Tabela de pagamentos
- `MetricsAlerts.tsx` -- Alertas condicionais baseados nos dados

### Regras de calculo (frontend)

**KPIs:**
1. Receita Fechada = SUM(deals.value_cents) WHERE stage='fechado' AND closed_at dentro do periodo
2. Caixa Recebido = SUM(payments.amount_cents) WHERE status='recebido' AND paid_at dentro do periodo
3. Reunioes = COUNT(activities) WHERE type='reuniao' AND activity_date dentro do periodo
4. Conversao = deals_fechados / reunioes (protecao divisao por zero)

**ROI e Payback:**
- investment = program_investments mais recente
- resultado = Receita Fechada (com toggle para Caixa Recebido)
- ROI = (resultado - investimento) / investimento * 100
- media_mensal = resultado * (30 / dias_do_periodo)
- Payback = investimento / media_mensal (em meses)

**Alertas:**
- Reunioes > 0 e deals fechados = 0 -> "Muita conversa, pouca decisao. Rever oferta e follow-up."
- Receita fechada alta e caixa baixo -> "Caixa nao acompanha venda. Revisar cobranca."
- ROI negativo -> "Ainda nao pagou o investimento. Prioridade: vendas e caixa."

### Hook: `src/hooks/useMetrics.tsx`

Centraliza todas as queries Supabase:
- `fetchDeals(membershipId, dateRange)`
- `fetchPayments(membershipId, dateRange)`
- `fetchActivities(membershipId, dateRange)`
- `fetchInvestment(membershipId)`
- Funcoes de CRUD para o mentorado preencher dados

---

## Ordem de implementacao

1. **Migration SQL** -- Criar as 5 tabelas + RLS policies
2. **Hook `useMetrics.tsx`** -- Queries e mutations
3. **Pagina do mentorado** -- `Metricas.tsx` (tabelas de preenchimento) + rota + menu
4. **Componentes do mentor** -- `MentoradoMetricsDashboard.tsx` + sub-componentes
5. **Aba no `MentoradoDetail.tsx`** -- Integrar a nova aba "Metricas"

Nenhuma Edge Function necessaria -- tudo e calculado no frontend com queries diretas ao banco.

---

## Detalhes tecnicos

- Valores monetarios sempre em centavos (int) no banco, formatados com `Intl.NumberFormat('pt-BR')` no frontend
- Graficos com Recharts (ja instalado)
- Filtros de periodo com presets (7d, 30d, 90d, MTD, YTD) + datepicker custom
- Grid responsivo: 4 colunas em desktop, 2 em tablet, 1 em mobile
- TabsList do MentoradoDetail muda de `grid-cols-5` para `grid-cols-6`

