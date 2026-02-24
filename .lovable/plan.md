

# Plano: Metricas Simplificadas + Email Semanal de Cobranca + Investimento pelo Mentor

## Problema atual

A pagina de metricas do mentorado esta funcional mas complexa demais para preenchimento diario. O mentorado precisa de algo rapido, tipo "checkin diario" com poucos cliques. Alem disso, falta:
1. Email automatico toda segunda cobrando preenchimento
2. O investimento do programa deveria vir pre-preenchido pelo mentor (cadastro do mentorado)
3. Campos extras de custo (trafego, equipe, mensal) para calculo de ROI real

---

## 1. Redesign da pagina do mentorado -- "Check-in Diario"

### Conceito

Trocar a abordagem "painel completo" por um fluxo de **check-in rapido** com 3 passos simples que o mentorado faz todo dia (ou no minimo toda semana):

```text
+-----------------------------------------------+
| Bom dia, [Nome]! Como foi seu dia?             |
| Semana 12 de 2026 · Fev 24                     |
+-----------------------------------------------+
|                                                 |
| PASSO 1: Atividades do dia                     |
| [Mensagens: +/-] [Ligacoes: +/-] [Reunioes: +/-]|
| [Follow-ups: +/-] [Propostas: +/-]              |
| Botao: Registrar atividades                     |
|                                                 |
| PASSO 2: Algum deal novo ou atualizado?         |
| [+ Novo deal] ou lista de deals recentes pra    |
| atualizar stage com 1 clique                    |
|                                                 |
| PASSO 3: Recebeu algum pagamento?               |
| [+ Registrar recebimento] rapido                |
|                                                 |
+-----------------------------------------------+
| RESUMO DA SEMANA (auto-calculado)               |
| [Atividades: 23] [Deals ativos: 4] [Caixa: R$X] |
+-----------------------------------------------+
| CUSTOS E INVESTIMENTO (expandivel)              |
| Investimento programa: R$60.000 (vem do mentor) |
| + Custo mensal trafego: R$___                   |
| + Custo mensal equipe: R$___                    |
| + Outros custos mensais: R$___                  |
| = Custo total mensal: R$___                     |
+-----------------------------------------------+
```

### Mudancas tecnicas no frontend

- **Reescrever `src/pages/member/Metricas.tsx`** com layout de check-in:
  - Contadores incrementais (stepper +/-) para atividades, nao formularios
  - Botao unico "Salvar dia" que registra todas as atividades de uma vez
  - Lista de deals recentes com botoes de stage (1 clique pra mover no funil)
  - Botao rapido de "Recebi pagamento" com valor e de quem
  - Secao colapsavel "Custos e Investimento" para editar custos mensais
  - Cada secao com texto explicativo claro para o mentorado

### Explicacoes contextuais

Cada secao tera um bloco de texto curto explicando o por que:
- **Atividades**: "Registre quantas acoes de vendas voce fez hoje. Seu mentor acompanha sua consistencia."
- **Deals**: "Cada pessoa que pode virar cliente e um deal. Mova para o estagio certo."
- **Pagamentos**: "Quando receber de um cliente, registre aqui. Assim calculamos seu ROI real."
- **Custos**: "Preencha seus custos mensais para calcular se o programa esta se pagando."

---

## 2. Investimento vindo do cadastro do mentor

### Mudanca no `CreateMenteeModal.tsx` e `EditMenteeModal.tsx`

Adicionar campo "Valor do Programa (R$)" no formulario de criacao/edicao do mentorado. Quando o mentor salva, faz `INSERT/UPDATE` na tabela `program_investments` automaticamente.

### Sincronizacao

- Na pagina do mentorado, o investimento aparece como **somente leitura** (preenchido pelo mentor)
- O mentorado pode adicionar custos extras (trafego, equipe) que sao editaveis por ele
- Se o mentor nao preencheu, o mentorado pode preencher manualmente tambem

### Mudanca na tabela `program_investments`

Adicionar colunas para custos operacionais:

```text
ALTER TABLE program_investments ADD COLUMN
  monthly_ads_cost_cents int DEFAULT 0,        -- custo mensal de trafego
  monthly_team_cost_cents int DEFAULT 0,        -- custo mensal de equipe
  monthly_other_cost_cents int DEFAULT 0,       -- outros custos mensais
  annual_program_value_cents int DEFAULT 0;     -- valor anual do programa (opcional)
```

### Calculo de ROI atualizado

```text
custo_total_mensal = (investment / meses_programa) + trafego + equipe + outros
roi = (receita_mensal - custo_total_mensal) / custo_total_mensal * 100
```

---

## 3. Automacao: Email semanal de cobranca de metricas

### Nova Edge Function: `metrics-reminder`

Dispara toda segunda-feira as 8h. Para cada mentorado ativo:

1. Verifica se preencheu atividades na semana anterior (ultimos 7 dias em `mentee_activities`)
2. Se **nao preencheu**: envia email de cobranca com tom motivacional
3. Se **preencheu**: envia email de parabens com resumo rapido
4. Se preencheu parcialmente: envia lembrete gentil

### Template do email

```text
Assunto (nao preencheu): "[Nome], suas metricas da semana passada estao pendentes!"
Assunto (preencheu): "[Nome], otimo trabalho! Confira seu resumo semanal."

Corpo (nao preencheu):
- Destaque que o mentor esta esperando os numeros
- Link direto para /mentorado/metricas
- "Sem dados preenchidos, nao conseguimos calcular seu ROI"
- "Leva menos de 2 minutos"

Corpo (preencheu):
- Mini resumo: X atividades, Y deals ativos, R$Z recebido
- Motivacao para manter a consistencia
```

### Registro na tabela `tenant_automations`

Adicionar `metrics_reminder` como nova automacao seedada automaticamente:
- `automation_key: 'metrics_reminder'`
- `schedule: '0 8 * * 1'` (segunda 8h)
- `is_enabled: false` (mentor ativa manualmente)

### Atualizar o trigger `seed_tenant_automations`

Adicionar a 11a automacao no trigger e fazer retroactive insert para tenants existentes.

### Card na Central de Automacoes

Adicionar o card "Lembrete de Metricas" na lista de automacoes com:
- Categoria: Engajamento
- Audiencia: Mentorado
- Descricao: "Envia email toda segunda cobrando o preenchimento das metricas semanais"

---

## 4. Integracao CRM (puxar deals automaticamente)

### Logica

Criar funcao que sincroniza deals do CRM interno (`crm_prospections`) para `mentee_deals`:
- Mapear stages do CRM para stages de metricas
- Sincronizar valor, nome, fonte
- Marcar deals sincronizados com `source = 'crm_sync'`

Isso sera feito como botao "Sincronizar do meu CRM" na pagina de metricas, nao automatico (para o mentorado ter controle).

### Mapeamento de stages

```text
CRM prospections.column_id -> mentee_deals.stage:
  'lead' / 'new'         -> 'lead'
  'contacted'             -> 'conversa'
  'meeting_scheduled'     -> 'reuniao_marcada'
  'meeting_done'          -> 'reuniao_feita'
  'proposal'              -> 'proposta'
  'won'                   -> 'fechado'
  'lost'                  -> 'perdido'
```

---

## 5. Dashboard do mentor -- ajustes

Atualizar o `MentoradoMetricsDashboard.tsx` para considerar os novos campos de custo no calculo de ROI. Adicionar:
- Bloco "Custos operacionais" mostrando trafego + equipe + outros
- ROI calculado com custo total (programa + operacional)
- Indicador visual se mentorado preencheu ou nao na ultima semana

---

## Ordem de implementacao

1. **Migration SQL** -- Novas colunas em `program_investments` + nova automacao `metrics_reminder`
2. **Redesign `Metricas.tsx`** -- Check-in diario simplificado
3. **`CreateMenteeModal` e `EditMenteeModal`** -- Campo de investimento do programa
4. **Edge Function `metrics-reminder`** -- Email semanal
5. **Sincronizacao CRM** -- Botao de sync na pagina de metricas
6. **Dashboard mentor** -- Atualizar calculo de ROI com custos

---

## Arquivos criados/editados

- `supabase/migrations/...` -- Colunas + automacao
- `src/pages/member/Metricas.tsx` -- Redesign completo
- `src/components/admin/CreateMenteeModal.tsx` -- Campo investimento
- `src/components/admin/EditMenteeModal.tsx` -- Campo investimento
- `supabase/functions/metrics-reminder/index.ts` -- Nova Edge Function
- `src/components/admin/MentoradoMetricsDashboard.tsx` -- ROI com custos
- `src/hooks/useMetrics.tsx` -- Novas queries para custos

