

# Plano de Correcao Completa: Migrar Sistema de Tabelas Legadas para Memberships

## Resumo do Problema

O sistema tem DUAS arquiteturas de permissoes coexistindo em conflito. A arquitetura **legada** (tabelas `user_roles`, `mentors`, `mentorados`) esta vazia para usuarios reais, mas quase **20 paginas e 8 edge functions** ainda dependem dela. A arquitetura **nova** (`memberships`, `mentor_profiles`, `mentee_profiles`) esta funcional mas incompleta.

Resultado: a Erika (mentora real) nao consegue criar trilhas, ver mentorados, acessar CRM, nem usar as ferramentas de gestao.

---

## Etapa 1 - Correcao do Banco de Dados (RLS + Funcoes)

### 1.1 Atualizar funcao `has_role()` para consultar `memberships`

A funcao `has_role()` hoje consulta `user_roles` (que tem 0 registros). Sera atualizada para consultar `memberships`, com mapeamento do role name `mentorado` para `mentee`:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
    AND (
      (role::text = _role::text) OR
      (_role::text = 'mentorado' AND role = 'mentee') OR
      (_role::text = 'mentee' AND role = 'mentee') OR
      (_role::text = 'mentor' AND role = 'mentor')
    )
    AND status = 'active'
  )
$$;
```

Isso desbloqueia imediatamente **12 tabelas** com policies que usam `has_role()`:
- trails, trail_modules, trail_lessons
- crm_prospections, sos_requests, community_posts
- mentorado_business_profiles, mentorado_files
- ranking_entries, user_badges, user_streaks
- badges, meetings

### 1.2 Criar `mentor_profiles` e `mentee_profiles` para usuarios reais do LBV

Inserir os registros que faltam para Erika (mentora) e Ricardo (mentorado) no tenant LBV.

---

## Etapa 2 - Migrar Frontend (20 arquivos)

### 2.1 Pagina `/admin/mentorados` (Mentorados.tsx) - PRIORIDADE ALTA

**Problema**: Busca `mentors` para encontrar `mentor_id` da Erika, depois busca `mentorados` para listar mentorados.

**Correcao**: Substituir todo o fluxo para usar `memberships` + `mentor_mentee_assignments` + `mentee_profiles`:
- Buscar `activeMembership.id` ao inves de consultar `mentors`
- Listar mentorados via `mentor_mentee_assignments` WHERE `mentor_membership_id = membership.id`
- Buscar perfis via `profiles` JOIN nos `user_id` dos memberships
- Buscar business profiles via `mentee_profiles.business_profile` (JSONB)
- Remover chamada a `get_pending_users` (funcao legada)
- Substituir `handleApprove` que usa `approve_mentorado` por fluxo via `create-membership`
- Substituir `handleManualAdd` que insere direto em `mentors`/`profiles` por chamada a `create-membership`

### 2.2 Pagina `/admin/crm-mentorados` (CRMMentorados.tsx) - PRIORIDADE ALTA

**Problema**: Busca `mentorados` (tabela legada) e filtra `crm_prospections.mentorado_id`.

**Correcao**: Substituir para:
- Buscar mentee memberships via `memberships` WHERE `tenant_id` e `role = mentee`
- Buscar leads via `crm_prospections.membership_id` (campo que ja existe e ja tem dados)
- Unir com `profiles` para nomes

### 2.3 Hook `useDashboardStats.tsx` - PRIORIDADE ALTA

**Problema**: `useMentorDashboardStats` busca ranking via `mentors` + `mentorados`. `useMenteeDashboardStats` busca `mentorados` para ranking.

**Correcao**: 
- Mentor: Buscar ranking via `ranking_entries` usando `membership_id` ou tenant-wide
- Mentee: Buscar ranking via `membership_id` ao inves de `mentorado_id`
- Adicionar `recentActivity` buscando de `activity_logs` WHERE `tenant_id`
- Calcular `trailProgress` real ao inves de sempre retornar 0%

### 2.4 Hook `useGamification.tsx` - PRIORIDADE MEDIA

**Problema**: Busca `mentorados` para obter `mentorado_id`, usa como fallback `user.id`.

**Correcao**: Usar `activeMembership.id` como identificador primario para todas as queries de gamificacao (`user_badges`, `user_streaks`, `ranking_entries`).

### 2.5 Pagina `/member/MemberDashboard.tsx` - PRIORIDADE MEDIA

**Problema**: Busca `mentorados` para obter `mentorado_id`, chama `ensure-mentorado` como fallback.

**Correcao**: Usar `activeMembership.id` para buscar dados. Remover chamada a `ensure-mentorado`. Buscar `training_analyses` via `membership_id`.

### 2.6 Pagina `/member/FerramentasIA.tsx` - PRIORIDADE MEDIA

**Problema**: Busca `mentorados` e `mentorado_business_profiles`.

**Correcao**: Usar `activeMembership.id` para buscar `mentee_profiles.business_profile`.

### 2.7 Pagina `/member/MeusArquivos.tsx` - PRIORIDADE MEDIA

**Problema**: Busca `mentorados` para filtrar `mentorado_files`.

**Correcao**: Filtrar `mentorado_files` via `owner_membership_id` (campo que ja existe).

### 2.8 Pagina `/member/Perfil.tsx` - PRIORIDADE BAIXA

**Problema**: Busca `mentorados` para `mentorado_id`.

**Correcao**: Usar `activeMembership.id`.

### 2.9 Pagina `/member/Calendario.tsx` - PRIORIDADE BAIXA

**Problema**: Busca `mentorados.mentor_id` para filtrar meetings.

**Correcao**: Filtrar meetings via `tenant_id` (ja funciona com policy `meetings_tenant`).

### 2.10 Pagina `/admin/CentroSOS.tsx` - PRIORIDADE MEDIA

**Problema**: Busca `mentors` para `mentor_id`.

**Correcao**: Usar `activeMembership.tenant_id` para filtrar SOS requests.

### 2.11 Pagina `/admin/Calendario.tsx` - PRIORIDADE MEDIA

**Problema**: Busca `mentors` para `mentor_id`.

**Correcao**: Usar `activeMembership` para criar/gerenciar meetings.

### 2.12 Pagina `/admin/EmailMarketing.tsx` - PRIORIDADE BAIXA

**Problema**: Busca `mentors` para `mentor_id`.

**Correcao**: Usar `activeMembership`.

---

## Etapa 3 - Migrar Edge Functions (6 funcoes)

### 3.1 `ensure-mentorado` - REMOVER USO no front

Esta funcao cria registros na tabela legada `mentorados`. O front nao deve mais chama-la. Manter a funcao temporariamente para backward compatibility mas remover todas as chamadas no frontend.

### 3.2 `check-badges` - Migrar para `membership_id`

Substituir busca de `mentorados` por `memberships`. Ajustar filtros de badges.

### 3.3 `process-onboarding` - Migrar para `membership_id`

Substituir upsert em `mentorados` por upsert em `mentee_profiles`.

### 3.4 `verify-otp` - Remover criacao legada

A secao de "BACKWARD COMPATIBILITY" que cria registros em `mentors`/`mentorados` ja nao e necessaria pois `create-membership` cuida disso.

### 3.5 `create-test-mentorados` - Migrar ou deprecar

Substituir por chamadas a `create-membership` ou manter apenas para sandbox.

### 3.6 `analyze-lead-screenshots` - JA CORRIGIDO

Ja migrado na ultima edicao com fallback para legacy.

---

## Etapa 4 - Paginas Setup/Onboarding

### 4.1 `Setup.tsx` - Migrar

**Problema**: Atualiza `mentors.business_name`.

**Correcao**: Atualizar `mentor_profiles.business_name`.

### 4.2 `Onboarding.tsx` - Migrar

**Problema**: Busca `mentors.business_name` para exibir nome da mentoria.

**Correcao**: Buscar via `mentor_profiles` ou `tenants.name`.

---

## Etapa 5 - DevToolsPanel (baixa prioridade)

O `DevToolsPanel.tsx` tem varias referencias a tabelas legadas, mas e ferramenta interna de dev. Migrar por ultimo.

---

## Ordem de Implementacao

1. **Migracao SQL** (has_role + profiles) - desbloqueia RLS imediatamente
2. **Mentorados.tsx** - pagina mais critica para mentor funcionar
3. **CRMMentorados.tsx** - visibilidade de leads
4. **useDashboardStats.tsx** - dashboard funcional
5. **CentroSOS.tsx + Calendario.tsx** - gestao do mentor
6. **useGamification.tsx + MemberDashboard.tsx** - experiencia do mentorado
7. **FerramentasIA.tsx + MeusArquivos.tsx + Perfil.tsx** - funcionalidades secundarias
8. **Edge Functions** (check-badges, process-onboarding, verify-otp)
9. **Setup.tsx + Onboarding.tsx** - fluxos de entrada
10. **DevToolsPanel.tsx** - ferramenta interna

---

## Detalhes Tecnicos

### Tabelas que continuam necessarias (legadas, mas com dados no sandbox)

As tabelas `mentors`, `mentorados`, `mentorado_business_profiles`, `ranking_entries` (com `mentorado_id`), e `mentorado_files` (com `mentorado_id`) continuam existindo fisicamente. O seed de sandbox popula ambas as arquiteturas. A migracao do frontend apenas muda QUAIS colunas sao consultadas:

- `mentorado_id` --> `membership_id` (onde disponivel)
- `mentor_id` (de mentors) --> `activeMembership.id` ou `tenant_id`
- `mentorado_business_profiles` --> `mentee_profiles.business_profile`

### Campos de compatibilidade que ja existem

Varias tabelas ja possuem tanto `mentorado_id` quanto `membership_id` e `tenant_id`:
- `crm_prospections` - tem `membership_id` E `mentorado_id`
- `activity_logs` - tem `membership_id` E `mentorado_id`
- `ai_tool_usage` - tem `membership_id` E `mentorado_id`
- `sos_requests` - tem `membership_id` E `mentorado_id`
- `mentorado_files` - tem `owner_membership_id` E `mentorado_id`
- `trail_progress` - tem `membership_id` E `mentorado_id`
- `community_posts` - tem `author_membership_id` E `mentorado_id`

Isso significa que a migracao do frontend nao requer mudanca de schema, apenas mudanca de quais colunas sao usadas nas queries.

### Estimativa

- Etapa 1 (SQL): 1 migration
- Etapa 2 (Frontend): ~12 arquivos a editar
- Etapa 3 (Edge Functions): ~4 funcoes a editar
- Total: ~18 arquivos modificados

