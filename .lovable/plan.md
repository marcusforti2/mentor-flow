

# Relatorio e Correcao de RLS - Visibilidade Tenant-Centrica

## Diagnostico Atual

O sistema tem duas camadas de controle de acesso que coexistem:

1. **Sistema LEGADO** (tabela `mentors` + `mentorados.mentor_id`): Mentor so ve dados vinculados diretamente a ele via `mentor_id`
2. **Sistema NOVO** (tabela `memberships` + `tenant_id`): Staff ve tudo do mesmo tenant

O problema: varias tabelas so tem politicas do sistema legado. Um mentor novo (como Marcus) que nao tem registro na tabela `mentors` ou nao tem mentorados vinculados via `mentor_id` nao consegue ver nada.

---

## Tabelas com Problema (so tem politica legada)

| Tabela | Politica Atual | Problema |
|--------|---------------|----------|
| `community_posts` | `mentors.user_id = auth.uid()` | Mentor novo nao ve posts |
| `community_comments` | `mentors.user_id = auth.uid()` | Mentor novo nao ve comentarios |
| `community_messages` | `mentors.user_id = auth.uid()` | Mentor novo nao ve/modera mensagens |
| `community_likes` | `mentors.user_id = auth.uid()` | Mentor novo nao ve likes |
| `email_flows` | `mentors.user_id = auth.uid()` | Mentor novo nao cria/ve fluxos |
| `calendar_events` | `mentors.user_id = auth.uid()` | Mentor novo nao gerencia eventos |
| `training_analyses` | `mentorados.mentor_id JOIN mentors` | Mentor novo nao ve analises |
| `sos_requests` | `mentorados.mentor_id JOIN mentors` | Mentor novo nao ve SOS |
| `sos_responses` | via `sos_requests.mentor_id` | Idem |
| `call_transcripts` | `has_role('mentor')` (OK pra SELECT) | Mas nao filtra por tenant |
| `call_analyses` | `has_role('mentor')` (OK pra SELECT) | Mas nao filtra por tenant |
| `behavioral_reports` | `has_role('mentor')` | Sem filtro tenant |
| `behavioral_responses` | `has_role('mentor')` | Sem filtro tenant |
| `certificates` | `has_role('mentor')` | Sem filtro tenant |
| `roleplay_simulations` | `has_role('mentor')` | Sem filtro tenant |
| `user_badges` | `has_role('mentor')` | Sem filtro tenant |
| `user_streaks` | `has_role('mentor')` | Sem filtro tenant |
| `reward_catalog` | `has_role('mentor')` | Sem filtro tenant |
| `reward_redemptions` | `has_role('mentor')` | Sem filtro tenant |
| `ranking_entries` | public SELECT | OK mas sem tenant scope |

## Tabelas JA Corretas (tem politica tenant)

| Tabela | Status |
|--------|--------|
| `campan_tasks` | `is_tenant_staff()` |
| `meeting_transcripts` | `is_tenant_staff()` |
| `memberships` | `is_tenant_staff()` |
| `trails` / `trail_modules` / `trail_lessons` | tenant staff policies |
| `crm_prospections` | tenant staff policy |
| `activity_logs` | tenant membership check |
| `mentee_profiles` | tenant membership check |
| `mentorado_files` | `is_tenant_staff()` |
| `trail_progress` | tenant staff view |
| `badges` | tenant staff manage |
| `crm_pipeline_stages` | `is_tenant_staff()` |
| `crm_leads` | tenant staff policy |
| `email_templates` | tenant staff policy |
| `ai_tool_usage` | tenant staff view |
| `invites` | tenant staff manage |

---

## Plano de Correcao

### Fase 1 - Adicionar `tenant_id` onde falta

Algumas tabelas nao tem coluna `tenant_id`, o que impede filtros por tenant. Precisa adicionar:

- `email_flows` - tem `mentor_id` mas nao `tenant_id`
- `calendar_events` - tem `mentor_id` e `tenant_id` (verificar se esta populado)

### Fase 2 - Criar politicas tenant-based para tabelas criticas

Para cada tabela com problema, adicionar uma politica SELECT para staff do tenant, seguindo o padrao ja estabelecido:

```sql
-- Padrao: staff do mesmo tenant pode ver
CREATE POLICY "staff_view_[tabela]" ON public.[tabela]
FOR SELECT TO public
USING (
  tenant_id IN (
    SELECT m.tenant_id FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin','ops','mentor','master_admin')
    AND m.status = 'active'
  )
);
```

Para tabelas sem `tenant_id`, usar join via `mentorado_id` -> `memberships`:

```sql
-- Para tabelas que referenciam mentorado_id (legado)
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = [tabela].mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);
```

### Fase 3 - Tabelas a corrigir (em ordem de prioridade)

**Prioridade Alta** (afetam funcionalidades do mentor diretamente):

1. **`community_posts`** - ja tem `community_posts_tenant` ALL policy, esta OK
2. **`community_comments`** - adicionar policy tenant-based para staff view
3. **`community_messages`** - ja tem `community_messages_tenant_read`, esta OK
4. **`community_likes`** - adicionar policy tenant-based para staff view
5. **`email_flows`** - ja tem `email_flows_staff` ALL policy, esta OK
6. **`calendar_events`** - ja tem `calendar_events_tenant` ALL policy, esta OK
7. **`sos_requests`** - ja tem `sos_requests_staff_view`, esta OK
8. **`training_analyses`** - adicionar policy tenant-based (precisa join via mentorado -> membership)
9. **`mentorado_business_profiles`** - adicionar policy tenant-based (precisa join)

**Prioridade Media** (gamificacao e extras):

10. **`call_transcripts`** - adicionar filtro por tenant
11. **`call_analyses`** - adicionar filtro por tenant
12. **`behavioral_reports`** - adicionar filtro por tenant
13. **`behavioral_responses`** - adicionar filtro por tenant
14. **`roleplay_simulations`** - adicionar filtro por tenant
15. **`certificates`** - adicionar filtro por tenant
16. **`user_badges`** - adicionar filtro por tenant
17. **`user_streaks`** - adicionar filtro por tenant
18. **`reward_catalog`** / **`reward_redemptions`** - adicionar filtro por tenant

---

## Detalhes Tecnicos

### Migracao SQL

Uma unica migracao que:
1. Adiciona `tenant_id` nas tabelas que nao tem (com backfill via mentorado -> membership -> tenant)
2. Cria as novas politicas RLS tenant-based
3. Mantem as politicas legadas para nao quebrar nada existente (abordagem aditiva)

### Tabelas que precisam de `tenant_id` adicionado

Verificar quais dessas tabelas ja tem `tenant_id`:
- `training_analyses`
- `call_transcripts` / `call_analyses`
- `behavioral_reports` / `behavioral_responses`
- `roleplay_simulations`
- `certificates`
- `user_badges` / `user_streaks`
- `reward_redemptions`
- `community_comments` / `community_likes`

Para as que nao tem, a abordagem sera usar JOIN via `mentorado_id` -> `mentorados.user_id` -> `memberships.tenant_id` nas politicas RLS, sem alterar schema.

### Nenhuma alteracao no frontend necessaria

O frontend ja usa `activeMembership.tenant_id` para filtrar dados. O problema e puramente nas politicas RLS que bloqueiam o acesso no banco.

