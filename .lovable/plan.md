
# Plano: Central de Automacoes + Agendamento Cron

## Resumo

Criar uma nova pagina **Automacoes** no painel do mentor onde ele pode visualizar, ligar/desligar e configurar todas as automacoes do sistema. Alem disso, configurar o `pg_cron` para executar as automacoes agendadas automaticamente.

---

## O que sera criado

### 1. Tabela `tenant_automations` no banco de dados

Uma tabela para armazenar as configuracoes de automacao por tenant:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK para tenants |
| automation_key | text | Identificador unico (ex: `weekly_digest`, `re_engage_inactive`, `auto_qualify_lead`, `check_badges`, `check_alerts`, `send_prospection_tips`) |
| is_enabled | boolean | Ligado/Desligado |
| schedule | text | Expressao cron (ex: `0 9 * * 1` para segunda 9h) |
| config | jsonb | Configuracoes extras (ex: dias de inatividade, horario preferido) |
| last_run_at | timestamptz | Ultima execucao |
| last_run_status | text | Sucesso/erro da ultima execucao |
| created_at / updated_at | timestamptz | Timestamps |

Politicas RLS: apenas admins do tenant podem ler/editar.

### 2. Nova pagina: `/mentor/automacoes`

Interface visual com cards para cada automacao:

- **Digest Semanal** - Envia resumo semanal por email aos mentorados
  - Toggle liga/desliga
  - Seletor de dia da semana e horario
  
- **Re-engajamento Inteligente** - Notifica mentorados inativos
  - Toggle liga/desliga
  - Campo: dias de inatividade (padrao: 5)
  - Horario de envio
  
- **Auto-qualificacao de Leads** - Qualifica leads automaticamente ao criar
  - Toggle liga/desliga
  
- **Verificacao de Badges** - Verifica e concede medalhas automaticamente
  - Toggle liga/desliga
  - Frequencia (diario/semanal)
  
- **Alertas Inteligentes** - Monitora metricas e gera alertas
  - Toggle liga/desliga
  - Frequencia
  
- **Dicas de Prospecao** - Envia dicas de prospecao por email
  - Toggle liga/desliga
  - Frequencia

Cada card mostra: status (ativo/inativo), ultima execucao, proximo agendamento, e um botao "Executar Agora" para teste manual.

### 3. Agendamento via pg_cron

Habilitar as extensoes `pg_cron` e `pg_net` e criar os jobs:

- `weekly-digest`: Segundas as 9h (configuravel)
- `re-engage-inactive`: Diario as 10h (configuravel)
- `check-badges`: Diario as 8h
- `check-alerts`: A cada 6 horas

Cada Edge Function consultara a tabela `tenant_automations` antes de executar, respeitando o toggle do mentor.

### 4. Integracao no menu do mentor

Adicionar "Automacoes" ao menu de navegacao do mentor (dentro do grupo "Comunicacao" ou como item proprio com icone de engrenagem/zap).

### 5. Hook `useAutomations`

Hook React para gerenciar o CRUD das automacoes:
- `fetchAutomations(tenantId)` - lista automacoes do tenant
- `toggleAutomation(id, enabled)` - liga/desliga
- `updateConfig(id, config)` - atualiza configuracao
- `runNow(automationKey)` - executa manualmente via fetch para a Edge Function

---

## Detalhes Tecnicos

### Arquivos novos
- `src/pages/admin/Automacoes.tsx` - Pagina principal
- `src/hooks/useAutomations.tsx` - Hook de dados
- `src/components/admin/AutomationCard.tsx` - Card individual de automacao

### Arquivos modificados
- `src/App.tsx` - Nova rota `/mentor/automacoes`
- `src/components/layouts/MentorLayout.tsx` - Novo item no menu
- `supabase/functions/weekly-digest/index.ts` - Verificar toggle antes de executar
- `supabase/functions/re-engage-inactive/index.ts` - Verificar toggle antes de executar
- `supabase/functions/check-badges/index.ts` - Verificar toggle antes de executar
- `supabase/functions/check-alerts/index.ts` - Verificar toggle antes de executar

### Migracao SQL
- Criar tabela `tenant_automations` com RLS
- Habilitar `pg_cron` e `pg_net`
- Inserir registros padrao para cada tenant existente
- Criar jobs cron para cada automacao

### Fluxo de execucao cron

```text
pg_cron (horario agendado)
  --> pg_net.http_post() chama Edge Function
    --> Edge Function consulta tenant_automations
      --> Se is_enabled = true: executa logica
      --> Atualiza last_run_at e last_run_status
```

---

## Ordem de implementacao

1. Criar tabela `tenant_automations` + RLS + seed de dados padrao
2. Criar hook `useAutomations`
3. Criar componente `AutomationCard`
4. Criar pagina `Automacoes.tsx`
5. Adicionar rota e menu
6. Atualizar Edge Functions para respeitar o toggle
7. Configurar pg_cron + pg_net
