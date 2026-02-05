
# Plano: Corrigir Bug "Cannot read properties of undefined (reading 'length')"

## Diagnostico

O erro ocorre no `Auth.tsx` linha 81:
```typescript
console.log('[Auth] Memberships result:', { count: memberships.length, ... });
```

A funcao `refreshMembershipsAndWait` (que chama `fetchMemberships`) retorna `undefined` quando:
- Linha 91: `!user?.id` - retorna sem valor explicito
- Linha 107: `!membershipData` - retorna sem valor explicito

Quando o usuario faz login, existe um timing issue onde a sessao ainda nao propagou para o TenantContext, entao `user` e `undefined` momentaneamente.

---

## Solucao

### 1. Corrigir `TenantContext.tsx` - Garantir retorno de array

**Arquivo**: `src/contexts/TenantContext.tsx`

Modificar a funcao `fetchMemberships` para SEMPRE retornar um array:

```typescript
// Linha 91 - quando nao ha user
if (!user?.id) {
  setMemberships([]);
  setActiveMembership(null);
  setRealMembership(null);
  setTenant(null);
  setIsLoading(false);
  return []; // ADICIONAR ESTA LINHA
}

// Linha 107 - quando nao ha membershipData
if (!membershipData || membershipData.length === 0) {
  setMemberships([]);
  setActiveMembership(null);
  setRealMembership(null);
  setTenant(null);
  setIsLoading(false);
  return []; // ADICIONAR ESTA LINHA
}
```

### 2. Adicionar verificacao defensiva no `Auth.tsx`

**Arquivo**: `src/pages/Auth.tsx`

Modificar `bootstrapAfterAuth` para verificar se memberships e um array:

```typescript
const memberships = await refreshMembershipsAndWait();
console.log('[Auth] Memberships result:', { 
  count: memberships?.length ?? 0, 
  roles: memberships?.map(m => m.role) ?? [] 
});

if (!memberships || memberships.length === 0) {
  // ... tratamento de erro
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/contexts/TenantContext.tsx` | Adicionar `return []` nas linhas 91 e 107 |
| `src/pages/Auth.tsx` | Adicionar optional chaining `memberships?.length` na linha 81 |

---

## Validacao

Apos a correcao:
1. Login com codigo OTP deve funcionar sem erros
2. Usuario deve ser redirecionado corretamente
3. Se nao houver memberships, deve mostrar mensagem "Acesso nao configurado"
