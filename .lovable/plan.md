
# Plano: Refatoração Multi-Tenant com RBAC e Impersonation

## Visão Geral

Transformar a arquitetura atual (baseada em `user_roles` + `mentors` + `mentorados`) para um modelo multi-tenant verdadeiro com:
- **Tenant** como empresa guarda-chuva (ex: LBV)
- **Membership** como vínculo usuário-tenant com role
- **Impersonation** por troca de contexto de membership (sem criar usuários)

---

## Arquitetura Atual vs Nova

### Estrutura Atual
```
profiles (user_id) ─┬─ user_roles (role: mentor|mentorado|admin_master)
                    ├─ mentors (business_name, bio...)
                    └─ mentorados (mentor_id, status...)
```

**Problemas identificados:**
1. Sem isolamento por tenant - dados globais
2. Role é global (não contextual ao tenant)
3. DevMode usa localStorage para override - inconsistente
4. Não escala para múltiplos "LBVs" no futuro

### Nova Estrutura

```
User (auth.users) ─┐
                   │
Tenant (LBV) ──────┼── Membership (user_id, tenant_id, role)
                   │        │
                   │        ├── MentorProfile (dados extras do mentor)
                   │        └── MenteeProfile (dados extras do mentorado)
                   │
                   └── MentorMenteeAssignment (mentor_membership_id, mentee_membership_id)
```

---

## Entidades do Banco de Dados

### 1. `tenants` (Nova)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome da empresa (ex: "LBV Tech") |
| slug | text | Identificador único (ex: "lbv") |
| logo_url | text | Logo do tenant |
| primary_color | text | Cor primária |
| settings | jsonb | Configurações personalizadas |
| created_at | timestamp | Data de criação |

### 2. `memberships` (Nova - substitui user_roles)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK para tenants |
| user_id | uuid | FK para auth.users |
| role | enum | admin, ops, mentor, mentee |
| status | text | active, suspended, inactive |
| created_at | timestamp | Data de criação |
| **unique** | | (tenant_id, user_id, role) |

### 3. `mentor_profiles` (Substitui mentors)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| membership_id | uuid | FK para membership (role=mentor) |
| bio | text | Biografia |
| specialties | text[] | Especialidades |
| settings | jsonb | Configurações do mentor |

### 4. `mentee_profiles` (Evolução de mentorados)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| membership_id | uuid | FK para membership (role=mentee) |
| business_name | text | Nome do negócio |
| onboarding_completed | boolean | Status do onboarding |
| business_profile | jsonb | Dados do perfil de negócio |

### 5. `mentor_mentee_assignments` (Nova - substitui mentor_id em mentorados)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK para tenants |
| mentor_membership_id | uuid | FK para membership (mentor) |
| mentee_membership_id | uuid | FK para membership (mentee) |
| status | text | active, paused, completed |
| assigned_at | timestamp | Data de atribuição |

### 6. `impersonation_logs` (Nova - auditoria)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| admin_membership_id | uuid | Quem fez impersonation |
| target_membership_id | uuid | Quem está sendo impersonado |
| started_at | timestamp | Início |
| ended_at | timestamp | Fim |
| ip_address | text | IP de origem |

---

## Sistema de Roles (RBAC)

### Hierarquia de Permissões

| Role | Descrição | Permissões |
|------|-----------|------------|
| **admin** | Super admin do tenant | Tudo: CRUD memberships, assignments, ver tudo |
| **ops** | Operações | Ver todos mentorados, editar dados, não pode criar mentors |
| **mentor** | Mentor | CRUD seus mentorados atribuídos, criar trilhas |
| **mentee** | Mentorado | CRUD próprios dados, consumir conteúdo |

### Funções RPC de Verificação

```sql
-- Verifica se membership tem role específico
has_tenant_role(membership_id, role) → boolean

-- Retorna role efetiva (considerando impersonation)
get_effective_role(user_id, tenant_id) → role

-- Verifica se pode ver mentorado específico
can_view_mentee(viewer_membership_id, mentee_membership_id) → boolean
```

---

## Modo Dev / Impersonation

### Fluxo de Switch Context

```
┌─────────────────────────────────────────────────────────────────┐
│  Switch Context Panel (visível apenas para admin)               │
├─────────────────────────────────────────────────────────────────┤
│  Memberships disponíveis no tenant:                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 👤 Marcus Forti (admin)           [Você]                  │  │
│  │ 👨‍🏫 Maria Silva (mentor)          [Impersonar]           │  │
│  │ 👨‍💼 João Santos (mentee)          [Impersonar]           │  │
│  │ 👨‍💼 Ana Costa (mentee)            [Impersonar]           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ⚠️ Impersonando: Maria Silva (mentor)                          │
│  [Encerrar Impersonation]                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Armazenamento do Contexto

**Atual (problemático):**
```js
localStorage.setItem('dev_mode_role_override', 'mentor')
// Problema: Cria comportamento inconsistente, não logado
```

**Novo (via state + banco):**
```js
// Context global
{
  activeMembershipId: uuid, // Membership ativo (real ou impersonado)
  isImpersonating: boolean,
  realMembershipId: uuid,   // Membership real do usuário
}

// Validação server-side via RPC
get_active_membership(user_id) → membership com tenant context
```

### Regras de Impersonation

1. **Em DEV**: Qualquer admin pode impersonar qualquer membership do mesmo tenant
2. **Em PROD**: Requer permissão explícita (`can_impersonate = true` no membership)
3. **Logging obrigatório**: Toda impersonation é registrada
4. **Tempo limite**: Impersonation expira após 2h ou logout

---

## Migração de Dados

### Fase 1: Criar Estrutura

```sql
-- 1. Criar tenant LBV
INSERT INTO tenants (name, slug) VALUES ('LBV Tech', 'lbv');

-- 2. Migrar mentors → memberships + mentor_profiles
INSERT INTO memberships (tenant_id, user_id, role)
SELECT t.id, m.user_id, 'mentor'
FROM mentors m, tenants t WHERE t.slug = 'lbv';

-- 3. Migrar mentorados → memberships + mentee_profiles
INSERT INTO memberships (tenant_id, user_id, role)
SELECT t.id, m.user_id, 'mentee'
FROM mentorados m, tenants t WHERE t.slug = 'lbv';

-- 4. Criar assignments (de mentor_id em mentorados)
INSERT INTO mentor_mentee_assignments (...)
SELECT ...
```

### Fase 2: Migrar Dados Funcionais

Todas as tabelas que usam `mentor_id` ou `mentorado_id` precisam ganhar `tenant_id`:

| Tabela | Campo Atual | Novo Campo |
|--------|-------------|------------|
| trails | mentor_id | tenant_id + creator_membership_id |
| badges | mentor_id | tenant_id |
| calendar_events | mentor_id | tenant_id |
| crm_leads | mentor_id | tenant_id + owner_membership_id |
| ai_tool_usage | mentorado_id | membership_id |
| trail_progress | mentorado_id | membership_id |
| ... | ... | ... |

### Fase 3: Deprecar Tabelas Antigas

Após validação:
- Remover `user_roles` (substituído por `memberships`)
- Remover `mentors` (substituído por `mentor_profiles`)
- Refatorar `mentorados` (substituído por `mentee_profiles`)

---

## Modificações no Frontend

### 1. Novo Context: `TenantContext`

```tsx
interface TenantContextType {
  tenant: Tenant | null;
  activeMembership: Membership | null;
  isImpersonating: boolean;
  realMembership: Membership | null;
  switchMembership: (membershipId: string) => Promise<void>;
  endImpersonation: () => void;
}
```

### 2. Hook `usePermissions`

```tsx
const { canView, canEdit, canDelete, canManage } = usePermissions();

// Uso
if (canView('mentees')) { ... }
if (canEdit('trails')) { ... }
```

### 3. Componente `SwitchContextPanel`

Substituir `DevModeSelector` por painel mais robusto:
- Lista memberships do tenant
- Botão impersonar/encerrar
- Badge visual de impersonation
- Log de ações

### 4. `ProtectedRoute` Atualizado

```tsx
<ProtectedRoute 
  requiredRole={['admin', 'mentor']}
  requiredPermission="view_mentees"
>
```

---

## RLS Policies

### Padrão Base

```sql
-- Todas as tabelas com tenant_id
CREATE POLICY "tenant_isolation" ON table_name
  USING (
    tenant_id IN (
      SELECT tenant_id FROM memberships 
      WHERE user_id = auth.uid()
    )
  );
```

### Exemplo: mentee_profiles

```sql
-- Mentee só vê próprio perfil
CREATE POLICY "mentee_own_profile" ON mentee_profiles
  FOR SELECT USING (
    membership_id IN (
      SELECT id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- Admin/Ops/Mentor vê todos do tenant
CREATE POLICY "staff_view_profiles" ON mentee_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.tenant_id = (
        SELECT tenant_id FROM memberships 
        WHERE id = mentee_profiles.membership_id
      )
      AND m.role IN ('admin', 'ops', 'mentor')
    )
  );
```

---

## Sequência de Implementação

### Sprint 1: Fundação (Banco)
1. Criar tabelas: `tenants`, `memberships`, `mentor_profiles`, `mentee_profiles`, `mentor_mentee_assignments`, `impersonation_logs`
2. Criar migration de dados
3. Criar funções RPC de verificação de role
4. Atualizar RLS policies

### Sprint 2: Auth & Context
1. Criar `TenantProvider` e `useTenant` hook
2. Atualizar `useAuth` para incluir membership
3. Criar `usePermissions` hook
4. Atualizar `ProtectedRoute`

### Sprint 3: UI de Impersonation
1. Criar `SwitchContextPanel`
2. Remover `DevModeSelector` antigo
3. Adicionar indicador visual de impersonation
4. Implementar logging

### Sprint 4: Migração de Tabelas Funcionais
1. Adicionar `tenant_id` às tabelas existentes
2. Atualizar queries e mutations
3. Atualizar edge functions

### Sprint 5: Cleanup & Testes
1. Remover tabelas depreciadas
2. Testes E2E de fluxos
3. Validação de RLS

---

## Arquivos Afetados

### Banco de Dados
- Nova migration: `create_multi_tenant_schema.sql`
- Nova migration: `migrate_existing_data.sql`
- Nova migration: `update_functional_tables.sql`

### Frontend - Novos
- `src/contexts/TenantContext.tsx`
- `src/hooks/useTenant.tsx`
- `src/hooks/usePermissions.tsx`
- `src/components/SwitchContextPanel.tsx`

### Frontend - Modificados
- `src/hooks/useAuth.tsx` - Incluir membership
- `src/hooks/useDevMode.tsx` - **Remover** (substituído por TenantContext)
- `src/components/DevModeSelector.tsx` - **Remover**
- `src/components/ProtectedRoute.tsx` - Usar memberships
- `src/App.tsx` - Adicionar TenantProvider
- Todas páginas admin/member que usam `mentor_id` ou `mentorado_id`

### Edge Functions - Modificados
- `verify-otp/index.ts` - Criar membership ao invés de user_role
- `process-onboarding/index.ts` - Usar tenant context
- Todas functions que usam `mentor_id` ou `mentorado_id`

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Dados órfãos na migração | Script de validação pré/pós migração |
| Quebra de RLS | Testes automatizados de permissão |
| Impersonation abusada | Logging obrigatório + alertas |
| Performance queries tenant | Índices em tenant_id + membership_id |
