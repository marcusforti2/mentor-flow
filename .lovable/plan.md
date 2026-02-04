
# Plano: Sistema de Hierarquia de Roles (Admin Master)

## Resumo
Criar uma nova role **Admin Master** para o email `marcusforti2@gmail.com` que terá acesso completo ao sistema com capacidade de alternar entre as visões de Mentor e Mentorado. As roles regulares (mentor e mentorado) permanecerão restritas às suas respectivas áreas.

---

## Arquitetura de Roles

```text
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN MASTER                           │
│            (marcusforti2@gmail.com)                         │
│                                                             │
│  ✓ Acesso ao Painel Mentor (/admin)                        │
│  ✓ Acesso à Área de Membros (/app)                         │
│  ✓ DevMode Selector visível                                │
│  ✓ Pode alternar entre visões                              │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐     ┌──────────────────────┐
│       MENTOR         │     │      MENTORADO       │
│                      │     │                      │
│  ✓ Acesso: /admin    │     │  ✓ Acesso: /app      │
│  ✗ Acesso: /app      │     │  ✗ Acesso: /admin    │
│  ✗ DevMode Selector  │     │  ✗ DevMode Selector  │
└──────────────────────┘     └──────────────────────┘
```

---

## Etapas de Implementação

### 1. Migração do Banco de Dados
Adicionar a nova role `admin_master` ao enum `app_role` e atribuir ao usuário master.

**SQL a executar:**
```sql
-- Adicionar novo valor ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_master';

-- Atualizar a role do usuário master
UPDATE public.user_roles 
SET role = 'admin_master' 
WHERE user_id = '178685ca-85bb-49ed-b5d2-72a7ada8bedb';
```

### 2. Atualizar Tipos TypeScript
Adicionar `admin_master` ao tipo `AppRole` em todos os arquivos relevantes:
- `src/hooks/useAuth.tsx`
- `src/hooks/useDevMode.tsx`
- `src/components/ProtectedRoute.tsx`

### 3. Atualizar ProtectedRoute
Modificar a lógica para permitir que `admin_master` acesse ambas as áreas:

```typescript
// Lógica atual
if (allowedRoles && !allowedRoles.includes(role)) {
  // Redireciona para área correta
}

// Nova lógica
if (role === 'admin_master') {
  // Admin master tem acesso total, não redireciona
  return <>{children}</>;
}
```

### 4. Atualizar DevModeSelector
Restringir o seletor para aparecer apenas para `admin_master`:

```typescript
// Verificar se é admin_master antes de renderizar
const { role: realRole } = useAuth();

// Se não for admin_master, não mostra o componente
if (realRole !== 'admin_master') {
  return null;
}
```

### 5. Atualizar useAuth Hook
Adicionar helpers para verificar se é admin master:

```typescript
interface AuthContextType {
  // ... existing
  isAdminMaster: boolean;
}

// No provider
isAdminMaster: role === 'admin_master',
```

### 6. Atualizar App.tsx
Garantir que as rotas protegidas incluam `admin_master` nas roles permitidas:

```typescript
// Rotas Admin - permitir mentor E admin_master
<ProtectedRoute allowedRoles={['mentor', 'admin_master']}>
  <AdminLayout />
</ProtectedRoute>

// Rotas Member - permitir mentorado E admin_master
<ProtectedRoute allowedRoles={['mentorado', 'admin_master']}>
  <MemberLayout />
</ProtectedRoute>
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/` | Nova migração para adicionar role ao enum |
| `src/hooks/useAuth.tsx` | Adicionar `admin_master` ao tipo e helper |
| `src/hooks/useDevMode.tsx` | Atualizar tipo `AppRole` |
| `src/components/ProtectedRoute.tsx` | Lógica especial para admin_master |
| `src/components/DevModeSelector.tsx` | Mostrar apenas para admin_master |
| `src/App.tsx` | Incluir admin_master nas rotas protegidas |

---

## Comportamento Esperado

### Para Admin Master (marcusforti2@gmail.com):
1. Login → Vai para `/admin` por padrão
2. DevMode Selector visível no canto inferior direito
3. Pode alternar para `/app` usando o seletor
4. Acesso completo a todas as funcionalidades

### Para Mentor Regular:
1. Login → Vai para `/admin`
2. DevMode Selector **não aparece**
3. Tentativa de acessar `/app` → Redireciona para `/admin`

### Para Mentorado Regular:
1. Login → Vai para `/app`
2. DevMode Selector **não aparece**
3. Tentativa de acessar `/admin` → Redireciona para `/app`

---

## Detalhes Técnicos

### Função RPC para Verificar Role
A função `get_user_role` existente continuará funcionando, retornando a role do usuário (incluindo `admin_master`).

### Segurança
- A role `admin_master` é verificada server-side via RPC
- Não é possível "fingir" ser admin_master via localStorage
- O DevMode só funciona para quem JÁ TEM a role `admin_master` no banco

### Fluxo de Autenticação
```text
Login → get_user_role() → 
  Se admin_master: mostra DevMode, acesso total
  Se mentor: só /admin
  Se mentorado: só /app
```
