# Plano: Corrigir Sincronização de Dados na Criação de Usuários

## ✅ Status: CONCLUÍDO

## Problema Resolvido
Ao criar um mentor, os dados (nome, telefone) não apareciam na lista de usuários porque:
1. ✅ O trigger de criação de profile ignorava o `full_name` do `user_metadata`
2. ✅ O UPDATE subsequente no Edge Function não tinha tratamento de erro
3. ✅ Potencial condição de corrida entre trigger e UPDATE

## Alterações Implementadas

### 1. ✅ Trigger `handle_new_user` Atualizado
Trigger agora extrai `full_name` e `phone` do `raw_user_meta_data`:

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

### 2. ✅ Edge Function `create-membership` Melhorada
- Substituído UPDATE por UPSERT (`onConflict: 'user_id'`)
- Adicionado log de erro explícito
- Operação não bloqueia em caso de falha parcial

```typescript
const { error: profileError } = await supabaseAdmin
  .from("profiles")
  .upsert({
    user_id: targetUserId,
    email: normalizedEmail,
    full_name: full_name || null,
    phone: phone || null,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id'
  });

if (profileError) {
  console.error("create-membership: Profile upsert error:", profileError);
}
```

### 3. ✅ Frontend já estava correto
`useCreateMembership` invalida queries após sucesso.

## Resultado
- Nome e telefone aparecem imediatamente após criação de mentor/mentee
- Logs de erro visíveis se houver falha
- Sem condição de corrida (UPSERT garante dados salvos)
