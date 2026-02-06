

# Limpeza Total do Sistema

## Objetivo
Remover **todos** os usuarios e dados do sistema, mantendo apenas 3 pessoas:

| Usuario | Email | Papel | Tenant |
|---------|-------|-------|--------|
| Sem nome (Master Admin) | marcusforti2@gmail.com | Master Admin | LBV |
| Erika Silveira | erikasilveirapf@gmail.com | Mentor | LBV |
| Teste (renomear para "Ricardo Mentor") | erika.ports@hotmail.com | Mentorado | LBV |

## Estado Atual do Banco

Existem atualmente:
- **35 profiles** no sistema (a maioria sao usuarios fake de testes antigos)
- **32 entradas em user_roles** (tabela legada)
- **10 mentorados na sandbox** + dados de CRM, atividades, trilhas, reunioes
- **1 mentor legado** (tabela mentors - sandbox)
- **9 ranking entries**, **12 meetings**, **2 trails** com modulos/aulas
- Muitos dados em tabelas secundarias (otp_codes, audit_logs, system_fingerprints)

## Plano de Execucao

### Passo 1 - Edge Function de Limpeza

Criar uma nova Edge Function `cleanup-system` que faz a limpeza completa em ordem segura (respeitando foreign keys):

**Ordem de delecao:**

1. Tabelas dependentes profundas:
   - `ranking_entries` (depende de mentorados)
   - `trail_lessons` (depende de trail_modules)
   - `trail_modules` (depende de trails)
   - `trail_progress` (depende de trails)
   - `mentee_profiles` (depende de memberships)
   - `mentor_profiles` (depende de memberships)
   - `mentor_mentee_assignments` - deletar as do **sandbox** (manter a do LBV entre Erika e Ricardo)
   - `meeting_attendees`, `meeting_recordings` (depende de meetings)

2. Tabelas de dados:
   - `crm_prospections` (do sandbox)
   - `activity_logs` (do sandbox)
   - `meetings` (do sandbox)
   - `trails` (do sandbox)
   - `mentorados` (tabela legada - deletar tudo)
   - `mentors` (tabela legada - deletar tudo)
   - `user_roles` (tabela legada - deletar tudo)
   - `otp_codes` (limpar tudo, sao codigos expirados)
   - `audit_logs` (limpar)
   - `system_fingerprints` (limpar)

3. Memberships do sandbox:
   - Deletar todas as memberships do tenant `b0000000-0000-0000-0000-000000000002`

4. Profiles e Auth Users:
   - Deletar todos os profiles exceto os 3 usuarios mantidos
   - Deletar usuarios do auth.users via Admin API (exceto os 3 mantidos)

5. Renomear:
   - Atualizar profile de `erika.ports@hotmail.com` de "Teste" para "Ricardo Mentor"

### Passo 2 - Executar a Limpeza

Chamar a Edge Function para executar toda a limpeza de uma vez.

### Passo 3 - Verificacao

Confirmar que restaram apenas:
- 3 profiles
- 3 memberships (todas no tenant LBV)
- 1 assignment (Erika -> Ricardo)
- 0 dados no sandbox
- 0 dados legados

## Detalhes Tecnicos

### Edge Function: `cleanup-system`

A funcao usara o `SUPABASE_SERVICE_ROLE_KEY` para:
- Bypassar RLS e deletar dados diretamente
- Acessar a Admin API do auth para deletar usuarios
- Executar tudo em sequencia para respeitar foreign keys

### IDs que serao preservados

```text
Users (user_id):
  Master Admin: 178685ca-85bb-49ed-b5d2-72a7ada8bedb
  Erika:        b4bdb6af-f5df-4562-a1f6-f5c61832c76b
  Ricardo:      2bec8564-fa2c-4a26-9d81-c0ec4b3eeeef

Memberships (id):
  Master Admin: 1c8fcb7b-7c05-43c4-9ff8-202adc6321fb
  Erika Mentor: 26cfdc99-a0c9-4472-a8d6-2ddc05779f52
  Ricardo Mentee: ed987bad-5049-4182-b65e-f386d27cec82

Assignment:
  e945a06e-1d9e-4786-a1b9-ee653db9d01d (Erika -> Ricardo, LBV)

Tenant LBV:
  d5ccca63-d7f7-4804-857d-380a3cb41fe9 (manter)

Tenant Sandbox:
  b0000000-0000-0000-0000-000000000002 (manter o tenant, limpar os dados)
```

### Resultado Final

Apos a limpeza, a tela de Users (`/master/users`) mostrara apenas:

| Nome | Email | Programa | Papel | Status |
|------|-------|----------|-------|--------|
| Sem nome | marcusforti2@gmail.com | LBV | Master Admin | Ativo |
| Erika Silveira | erikasilveirapf@gmail.com | LBV | Mentor | Ativo |
| Ricardo Mentor | erika.ports@hotmail.com | LBV | Mentorado | Ativo |

O sandbox (LBV Preview Sandbox) ficara vazio mas disponivel para ser repovoado via `seed-sandbox` quando necessario.

