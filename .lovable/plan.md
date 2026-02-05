

# Plano: Corrigir Sincronização de Dados na Criação de Usuários

## Problema
Ao criar um mentor, os dados (nome, telefone) não aparecem na lista de usuários porque:
1. O trigger de criação de profile ignora o `full_name` do `user_metadata`
2. O UPDATE subsequente no Edge Function não tem tratamento de erro
3. Potencial condição de corrida entre trigger e UPDATE

## Solução

### 1. Atualizar Trigger `handle_new_user` (Migration SQL)
Modificar o trigger para extrair `full_name` e `phone` do `raw_user_meta_data`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, phone)
    VALUES (
      NEW.id, 
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$;
```

### 2. Melhorar Edge Function `create-membership`
- Usar UPSERT em vez de UPDATE para garantir que os dados sejam salvos
- Adicionar log de erro
- Adicionar pequeno retry se necessário

```typescript
// Substituir UPDATE por UPSERT (usando ON CONFLICT)
const { error: profileError } = await supabaseAdmin
  .from("profiles")
  .upsert({
    user_id: targetUserId,
    full_name: full_name || null,
    phone: phone || null,
    email: normalizedEmail,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id'
  });

if (profileError) {
  console.error("create-membership: Profile update error:", profileError);
}
```

### 3. Garantir Invalidação de Cache no Frontend
Verificar que `useCreateMembership` invalida corretamente as queries após sucesso (já está correto).

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/[novo].sql` | Atualizar trigger `handle_new_user` |
| `supabase/functions/create-membership/index.ts` | UPSERT + log de erro |

## Resultado Esperado
- Nome e telefone aparecem imediatamente após criação
- Logs de erro visíveis se houver falha
- Sem condição de corrida

