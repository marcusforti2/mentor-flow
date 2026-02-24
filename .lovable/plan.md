

## Plan: Mini Dashboard de ROI + Deals com Parcelas e Previsibilidade

### Contexto
A page `Metricas.tsx` do mentorado já tem KPIs básicos (atividades, deals ativos, receita fechada, caixa recebido) mas falta um dashboard de ROI completo que cruze investimento no programa com receita gerada. Além disso, os deals (`mentee_deals`) não suportam parcelas, valor total ou notas de negociação.

---

### 1. Migração de banco de dados

Adicionar colunas na tabela `mentee_deals`:
- `total_value_cents` (integer, default 0) -- valor total do contrato
- `installments` (integer, nullable) -- quantidade de parcelas
- `monthly_value_cents` (integer, default 0) -- valor mensal recorrente
- `negotiation_notes` (text, nullable) -- observações de negociação

Atualmente `value_cents` já existe e será mantido como o valor total (renomear semanticamente no frontend).

---

### 2. Hook `useMetrics.tsx`

- Atualizar a interface `MenteeDeal` com os novos campos
- Atualizar `createDeal` mutation para incluir `installments`, `monthly_value_cents`, `negotiation_notes`

---

### 3. Mini Dashboard de ROI (novo bloco na `Metricas.tsx`)

Inserido logo após o resumo da semana (antes do Passo 1), um card visual com:

```text
┌──────────────────────────────────────────────┐
│  📊 Painel de ROI                            │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ ROI %    │ │ Payback  │ │ Falta p/ │     │
│  │ +23%     │ │ 7.2 meses│ │ recuperar│     │
│  │          │ │          │ │ R$ 42k   │     │
│  └──────────┘ └──────────┘ └──────────┘     │
│                                              │
│  Investimento: R$ 110.000                    │
│  ├─ Caixa Recebido (total): R$ 68.000       │
│  ├─ Contratos Fechados: R$ 95.000            │
│  ├─ Pipeline Aberto: R$ 32.000               │
│  ├─ Custo Mensal: R$ 15.000                  │
│  ├─ Receita Mensal Recorrente: R$ 18.000     │
│  └─ Previsibilidade: 5.2 meses p/ ROI       │
│                                              │
│  [═══════════════════░░░░░] 62% recuperado   │
└──────────────────────────────────────────────┘
```

**Cálculos:**
- **Caixa Recebido Total**: soma de todos `mentee_payments` com `status = 'recebido'`
- **Contratos Fechados**: soma de `value_cents` de deals com `stage = 'fechado'`
- **Pipeline Aberto**: soma de `value_cents` de deals ativos (não fechados/perdidos)
- **% Recuperado**: `caixa_recebido / investimento * 100`
- **Falta Recuperar**: `investimento - caixa_recebido` (se positivo)
- **ROI**: `((caixa_recebido - investimento) / investimento) * 100`
- **Receita Mensal Recorrente (MRR)**: soma de `monthly_value_cents` de deals fechados
- **Previsibilidade (meses p/ ROI)**: `falta_recuperar / receita_mensal_media` usando MRR ou média dos últimos 3 meses de recebimentos
- **Custo Mensal vs Entrada**: comparação visual custo mensal total vs MRR

---

### 4. Deal Modal atualizado

Adicionar no modal de "Novo Deal":
- **Valor Total do Contrato (R$)** -- campo existente `value_cents`
- **Parcelas** -- novo campo inteiro
- **Valor Mensal (R$)** -- novo campo, auto-calculado se parcelas preenchido
- **Observações de negociação** -- textarea opcional

---

### 5. Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | 4 colunas em `mentee_deals` |
| `src/hooks/useMetrics.tsx` | Interface + mutation |
| `src/pages/member/Metricas.tsx` | ROI dashboard + deal modal expandido |

---

### Detalhes Técnicos

- O cálculo de previsibilidade usa o MRR dos deals fechados. Se MRR = 0, faz fallback para a média de recebimentos dos últimos 3 meses
- O progress bar mostra `Math.min(100, percentRecuperado)` para não ultrapassar visualmente
- ROI negativo mostra em vermelho, positivo em verde
- Todos os novos campos de deals são opcionais (nullable / default 0)
- RLS não precisa de alteração pois as policies existentes de `mentee_deals` já cobrem as novas colunas

