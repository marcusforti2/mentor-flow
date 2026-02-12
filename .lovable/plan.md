

## Promover Mariana para Admin

### Situacao Atual
- **Mariana** (`mariana@atlasalesinvest.com`) possui membership com role `mentor` no tenant `683e41ac-...`
- O painel `/mentor` ja aceita roles `admin`, `ops`, `mentor` e `master_admin` -- ou seja, ela continuara usando o mesmo layout (MentorLayout)

### O que sera feito

1. **Alterar o role da Mariana de `mentor` para `admin`** via migration SQL
   - Membership ID: `1f3c5b81-d0e8-424b-9331-e915643deeaa`
   - De: `mentor` -> Para: `admin`

2. **Habilitar permissao de impersonation** (`can_impersonate = true`) para que ela possa visualizar o sistema como mentorado quando necessario

### Impacto
- Mariana passara a ter acesso completo de gestao dentro do tenant dela (criar/editar/deletar mentorados, trilhas, emails, configuracoes)
- O layout visual permanece o mesmo (`/mentor` com MentorLayout)
- As permissoes no `usePermissions` serao automaticamente atualizadas pois o role `admin` tem acesso total no permission matrix

### Detalhes Tecnicos
Uma unica migration SQL:
```sql
UPDATE public.memberships
SET role = 'admin', can_impersonate = true, updated_at = now()
WHERE id = '1f3c5b81-d0e8-424b-9331-e915643deeaa';
```

