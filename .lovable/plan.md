
# Plano: Correção da Função RPC Duplicada

## Diagnóstico Confirmado

O login via OTP funciona corretamente, mas o redirecionamento falha porque:

1. **Função `get_user_memberships` está duplicada** no banco de dados
2. Existem duas versões:
   - `get_user_memberships(_user_id uuid)` (PL/pgSQL)
   - `get_user_memberships(_user_id uuid, _tenant_id uuid DEFAULT NULL)` (SQL)
3. Quando o frontend chama a função, PostgREST retorna erro `PGRST203` (função não única)
4. O `TenantContext.fetchMemberships()` falha silenciosamente
5. `activeMembership` fica `null`, mostrando "Acesso não configurado"

---

## Solução

### 1. Migration SQL - Remover função duplicada

Dropar ambas as versões e recriar uma única função unificada que:
- Aceita `_user_id` obrigatório
- Aceita `_tenant_id` opcional (para filtrar por tenant específico)
- Retorna as memberships ordenadas por privilégio

```sql
-- Drop both existing versions
DROP FUNCTION IF EXISTS public.get_user_memberships(uuid);
DROP FUNCTION IF EXISTS public.get_user_memberships(uuid, uuid);

-- Create single unified function
CREATE OR REPLACE FUNCTION public.get_user_memberships(
  _user_id uuid,
  _tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  tenant_id uuid, 
  tenant_name text, 
  tenant_slug text, 
  role membership_role, 
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    m.role,
    m.status
  FROM public.memberships m
  JOIN public.tenants t ON t.id = m.tenant_id
  WHERE m.user_id = _user_id
    AND m.status = 'active'
    AND (_tenant_id IS NULL OR m.tenant_id = _tenant_id)
  ORDER BY 
    CASE m.role 
      WHEN 'master_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'ops' THEN 3
      WHEN 'mentor' THEN 4
      WHEN 'mentee' THEN 5
    END;
$$;
```

### 2. Verificação pós-correção

Após a migration, o fluxo será:

1. Usuário digita código OTP
2. `verify-otp` valida e retorna `tokenHash`
3. Frontend verifica token com Supabase Auth
4. `bootstrapAfterAuth()` chama `refreshMembershipsAndWait()`
5. ✅ `get_user_memberships()` retorna memberships corretamente
6. ✅ Redirect para `/master`, `/mentor` ou `/mentorado` baseado no role

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL (nova) | Drop funções duplicadas, criar versão unificada |

---

## Resultado Esperado

Após a correção:
- Login via OTP funciona normalmente
- Sessão é criada e persistida
- Memberships são carregadas corretamente
- Usuário é redirecionado automaticamente para a área correta
- Não aparece mais "Acesso não configurado"
