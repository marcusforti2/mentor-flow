

# Plano: Corrigir DevModeSelector para admin_master

## Problema Identificado

O usuário `marcusforti2@gmail.com` possui **duas entradas** na tabela `user_roles`:
- `admin_master`
- `mentor`

A função `get_user_role` provavelmente retorna apenas uma role (a primeira encontrada), e se retornar `mentor` ao invés de `admin_master`, o DevModeSelector não aparece.

## Solução

### 1. Verificar a função RPC `get_user_role`

Checar como ela lida com múltiplas roles e garantir que priorize `admin_master`.

### 2. Remover a role duplicada

Limpar a tabela para que o usuário tenha apenas `admin_master` (que já dá acesso a tudo).

```sql
DELETE FROM user_roles 
WHERE user_id = '178685ca-85bb-49ed-b5d2-72a7ada8bedb' 
AND role = 'mentor';
```

### 3. Alternativa: Ajustar o DevModeSelector

Modificar a query `useAdminMasterCheck` para verificar se o usuário **possui** a role `admin_master` ao invés de depender do retorno de `get_user_role`:

```typescript
const { data: roleData } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('role', 'admin_master')
  .single();

return { 
  isAdminMaster: !!roleData, 
  role: 'admin_master' as const
};
```

## Ação Recomendada

**Opção mais simples:** Remover a role `mentor` duplicada do banco, deixando apenas `admin_master`. Isso resolve o problema imediatamente sem alterar código.

## Resultado Esperado

Após a correção:
- A chavinha 🔧 aparecerá no canto inferior direito
- Clicar nela abre o painel Dev Mode
- O toggle permite alternar instantaneamente entre Mentor (/admin) e Mentorado (/app)

