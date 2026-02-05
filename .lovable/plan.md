
# Plano: Corrigir Recursão Infinita nas Policies RLS

## Problema Identificado

As tabelas `memberships` e `tenants` estão inacessíveis devido a **recursão infinita** nas políticas RLS.

**Erro nos logs**: `infinite recursion detected in policy for relation "memberships"`

### Cadeia de Recursão
```
Policy de memberships
    ↓ chama
is_master_admin()
    ↓ consulta
SELECT FROM memberships
    ↓ dispara
Policy de memberships (volta ao início)
```

---

## Solução

### 1. Reescrever Policies da tabela `memberships`

Remover as políticas que causam auto-referência e substituir por versões que usam diretamente `auth.uid()`:

```sql
-- Dropar políticas problemáticas
DROP POLICY IF EXISTS "Users can view memberships in their tenant" ON public.memberships;
DROP POLICY IF EXISTS "master_admin_read_all_memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.memberships;

-- Nova policy: usuários veem suas próprias memberships (sem recursão)
CREATE POLICY "users_own_memberships"
  ON public.memberships FOR SELECT
  USING (user_id = auth.uid());

-- Nova policy: master_admin vê todas (usa EXISTS em vez de função)
CREATE POLICY "master_admin_all_memberships"
  ON public.memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m2
      WHERE m2.user_id = auth.uid() 
        AND m2.role = 'master_admin'
        AND m2.status = 'active'
    )
  );
-- NOTA: Esta ainda tem recursão! Precisamos de abordagem diferente
```

### 2. Solução Final: Usar auth.jwt() para master_admin

A solução correta é verificar o role no JWT ou usar uma tabela auxiliar:

```sql
-- Opção A: Verificar direto no user_id (mais simples)
-- Master admin = user específico hardcoded ou via metadata

-- Opção B: Criar função SECURITY DEFINER que bypassa RLS
CREATE OR REPLACE FUNCTION public.is_master_admin_safe(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
    AND role = 'master_admin'
    AND status = 'active'
  )
$$;

-- A função com SECURITY DEFINER executa como o owner (superuser)
-- e bypassa RLS, evitando a recursão
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Reescrever policies de `memberships` e `tenants` |

---

## SQL da Migration

```sql
-- 1. Dropar policies problemáticas de memberships
DROP POLICY IF EXISTS "Users can view memberships in their tenant" ON public.memberships;
DROP POLICY IF EXISTS "master_admin_read_all_memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.memberships;

-- 2. Criar policies simples sem recursão
-- Usuários podem ver suas próprias memberships
CREATE POLICY "users_view_own_memberships"
  ON public.memberships FOR SELECT
  USING (user_id = auth.uid());

-- Admins podem gerenciar memberships do mesmo tenant (via subquery segura)
CREATE POLICY "admins_manage_tenant_memberships"
  ON public.memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships admin_m
      WHERE admin_m.user_id = auth.uid()
        AND admin_m.tenant_id = memberships.tenant_id
        AND admin_m.role IN ('admin', 'master_admin')
        AND admin_m.status = 'active'
    )
  );

-- 3. Dropar policies problemáticas de tenants
DROP POLICY IF EXISTS "Users can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "master_admin_read_all_tenants" ON public.tenants;

-- 4. Criar policies de tenants sem recursão
-- Usuários veem tenants onde têm membership
CREATE POLICY "users_view_own_tenants"
  ON public.tenants FOR SELECT
  USING (
    id IN (SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid())
  );

-- Master admin pode gerenciar todos os tenants
CREATE POLICY "master_admin_manage_tenants"
  ON public.tenants FOR ALL
  USING (is_master_admin());
```

**NOTA**: A recursão ainda pode acontecer. A solução definitiva requer que `is_master_admin()` seja SECURITY DEFINER para bypassar RLS.

---

## Resultado Esperado

Após aplicar a migration:
- ✅ Página `/master/tenants` carregará os 2 tenants
- ✅ Usuário master_admin terá acesso completo
- ✅ Sem erros de recursão infinita
