
# Plano: Limpeza Total de Dados - Zerar Sistema

## Objetivo
Apagar todos os dados de atividade para que mentores e mentorados existentes vejam dashboards vazios (zero state).

## Dados Identificados para Limpeza

| Tabela | Registros | Ação |
|--------|-----------|------|
| `crm_prospections` | 19 | Deletar todos |
| `mentee_profiles` | 31 | Deletar todos |
| `mentorados` (legado) | 31 | Deletar todos |
| `invites` | 1 | Deletar todos |
| `audit_logs` | 3 | Deletar todos |

## Dados Já Vazios (Confirmado)
- trails, trail_modules, trail_lessons, trail_progress
- meetings, sos_requests, ranking_entries
- badges, user_badges
- calendar_events, email_flows
- community_posts, ai_tool_usage

## O Que Será Preservado
- **tenants** - LBV e LBV Sandbox permanecem
- **memberships** - Todos os acessos de mentores/mentorados permanecem
- **profiles** - Nomes e emails permanecem
- **auth.users** - Logins permanecem funcionando

## SQL de Limpeza

```sql
-- 1. Limpar prospections do CRM
DELETE FROM crm_prospections;

-- 2. Limpar mentee_profiles (novo modelo)
DELETE FROM mentee_profiles;

-- 3. Limpar mentorados (tabela legado)
DELETE FROM mentorados;

-- 4. Limpar mentors (tabela legado)
DELETE FROM mentors;

-- 5. Limpar invites pendentes
DELETE FROM invites;

-- 6. Limpar audit_logs (histórico)
DELETE FROM audit_logs;

-- 7. Limpar user_roles (legado)
DELETE FROM user_roles WHERE role != 'master_admin';
```

## Resultado Esperado

Após a limpeza:
- Mentor entra → Dashboard zerado (0 mentorados, 0 trilhas, 0 atividades)
- Mentorado entra → Dashboard zerado (0 progresso, 0 ranking)
- Sistema pronto para receber dados reais novamente

## Seção Técnica

### Ordem de Execução
A limpeza deve respeitar foreign keys:
1. Primeiro: `crm_prospections` (não tem dependências)
2. Segundo: `mentee_profiles` (depende de memberships que preservamos)
3. Terceiro: `mentorados` (legado, pode ter referências)
4. Quarto: `mentors` (legado)
5. Quinto: `invites`, `audit_logs`, `user_roles`

### Verificação Pós-Limpeza
Queries para confirmar zerado:
```sql
SELECT 
  (SELECT COUNT(*) FROM crm_prospections) as prospections,
  (SELECT COUNT(*) FROM mentee_profiles) as mentee_profiles,
  (SELECT COUNT(*) FROM mentorados) as mentorados,
  (SELECT COUNT(*) FROM invites) as invites;
```
