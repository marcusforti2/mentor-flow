
# Plano: Master Admin 100% Funcional

## Situação Atual

| Página | Status | Descrição |
|--------|--------|-----------|
| `/master` | ✅ Funcionando | Dashboard com dados reais |
| `/master/preview` | ✅ Funcionando | Preview de Mentor/Mentorado |
| `/master/tenants` | ❌ Placeholder | Precisa implementar |
| `/master/users` | ❌ Placeholder | Precisa implementar |
| `/master/config` | ❌ Placeholder | Precisa implementar |

---

## Fase 1: Gestão de Tenants

### 1.1 Migration - Adicionar coluna status

A tabela `tenants` não tem coluna de status. Vamos adicionar:

```sql
ALTER TABLE public.tenants 
ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial'));

-- Atualizar registros existentes
UPDATE public.tenants SET status = 'active' WHERE status IS NULL;
```

### 1.2 Criar página `/master/tenants`

Funcionalidades:
- **Listagem**: Tabela com todos os tenants (nome, slug, status, membros, data criação)
- **Criar**: Modal para adicionar novo tenant
- **Editar**: Sheet lateral para editar nome, slug, cores, logo
- **Ativar/Suspender**: Toggle de status
- **Estatísticas**: Contador de memberships por tenant

Interface:
```text
┌─────────────────────────────────────────────────────────┐
│  Gestão de Tenants                      [+ Novo Tenant] │
├─────────────────────────────────────────────────────────┤
│  🔍 Buscar tenant...                                    │
├──────┬──────────┬────────┬─────────┬─────────┬─────────┤
│ Logo │ Nome     │ Slug   │ Status  │ Membros │ Ações   │
├──────┼──────────┼────────┼─────────┼─────────┼─────────┤
│ 🏢   │ LBV Tech │ lbv    │ ●Ativo  │ 32      │ ⚙️ 🗑️   │
│ 🏢   │ Sandbox  │ lbv-sb │ ●Ativo  │ 2       │ ⚙️ 🗑️   │
└──────┴──────────┴────────┴─────────┴─────────┴─────────┘
```

### 1.3 Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| `src/pages/master/TenantsPage.tsx` | **Novo** - Página principal |
| `src/components/master/TenantFormSheet.tsx` | **Novo** - Criar/Editar tenant |
| `src/hooks/useTenants.tsx` | **Novo** - Hook CRUD |
| `src/App.tsx` | Editar - Trocar PlaceholderPage |

---

## Fase 2: Gestão de Usuários

### 2.1 Criar página `/master/users`

Funcionalidades:
- **Listagem global**: Todos os usuários de todos os tenants
- **Filtros**: Por tenant, por role, por status
- **Detalhes**: Ver memberships do usuário
- **Ações**: Ativar/Suspender membership

Interface:
```text
┌───────────────────────────────────────────────────────────────┐
│  Gestão de Usuários                                           │
├───────────────────────────────────────────────────────────────┤
│  Tenant: [Todos ▾]  Role: [Todos ▾]  Status: [Ativos ▾]       │
├───────────────────────────────────────────────────────────────┤
│  🔍 Buscar por nome ou email...                               │
├────────┬─────────────────┬──────────────┬────────────┬────────┤
│ Avatar │ Nome/Email      │ Tenant       │ Role       │ Status │
├────────┼─────────────────┼──────────────┼────────────┼────────┤
│ 👤     │ João Silva      │ LBV Tech     │ mentor     │ ●Ativo │
│        │ joao@email.com  │              │            │        │
├────────┼─────────────────┼──────────────┼────────────┼────────┤
│ 👤     │ Maria Santos    │ LBV Tech     │ mentee     │ ●Ativo │
│        │ maria@email.com │              │            │        │
└────────┴─────────────────┴──────────────┴────────────┴────────┘
```

### 2.2 Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| `src/pages/master/UsersPage.tsx` | **Novo** - Página principal |
| `src/components/master/UserDetailSheet.tsx` | **Novo** - Detalhes do usuário |
| `src/hooks/useGlobalUsers.tsx` | **Novo** - Hook com filtros |
| `src/App.tsx` | Editar - Trocar PlaceholderPage |

---

## Fase 3: Configurações do Sistema

### 3.1 Criar página `/master/config`

Funcionalidades:
- **Configurações Globais**: Settings gerais da plataforma
- **Logs de Auditoria**: Visualizar audit_logs recentes
- **Impersonation Logs**: Ver histórico de acessos dev

### 3.2 Arquivos a criar

| Arquivo | Ação |
|---------|------|
| `src/pages/master/ConfigPage.tsx` | **Novo** - Configurações |

---

## Resumo de Arquivos

| Arquivo | Tipo |
|---------|------|
| Migration SQL (status em tenants) | Novo |
| `src/pages/master/TenantsPage.tsx` | Novo |
| `src/pages/master/UsersPage.tsx` | Novo |
| `src/pages/master/ConfigPage.tsx` | Novo |
| `src/components/master/TenantFormSheet.tsx` | Novo |
| `src/components/master/UserDetailSheet.tsx` | Novo |
| `src/hooks/useTenants.tsx` | Novo |
| `src/hooks/useGlobalUsers.tsx` | Novo |
| `src/App.tsx` | Editar rotas |

---

## Ordem de Implementação

1. **Tenants** (base para tudo)
2. **Usuários** (depende de tenants)
3. **Config** (complementar)

Começamos pela Fase 1 (Tenants)?
