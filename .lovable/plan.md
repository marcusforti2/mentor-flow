
# Plano: Correção do Multi-Tenant e RLS para Conteúdo de Mentorados

## Diagnóstico Atual

### O que já está funcionando
- Tabelas `tenants`, `memberships`, `mentor_profiles`, `mentee_profiles`, `mentor_mentee_assignments` criadas
- `TenantContext` implementado corretamente (só troca contexto, não cria usuários)
- `SwitchContextPanel` funcional para impersonation
- Funções RPC de impersonation (`start_impersonation`, `end_impersonation`)

### Problemas identificados

1. **Edge Functions desatualizadas**
   - `verify-otp`: Ainda escreve em `user_roles` e `mentorados` (antigos)
   - `process-onboarding`: Ainda escreve em `user_roles` e `mentorados` (antigos)
   - Não criam `memberships` nem perfis nas novas tabelas

2. **Tabelas de conteúdo sem tenant_id**
   - `ai_tool_usage`: usa `mentorado_id` (FK antiga)
   - `trail_progress`: usa `mentorado_id` (FK antiga)
   - `crm_leads`: usa `mentor_id` (FK antiga)
   - Outras tabelas funcionais ainda no modelo antigo

3. **useAuth usando sistema antigo**
   - Chama `get_user_role()` que lê de `user_roles`
   - Precisa ser atualizado ou substituído pelo `useTenant`

---

## Solução Proposta

### Etapa 1: Atualizar Edge Functions

**verify-otp/index.ts** - Criar membership ao invés de user_role:
```typescript
// Ao criar novo usuário:
// 1. Criar profile
// 2. Criar membership no tenant com role correto
// 3. Criar mentor_profile ou mentee_profile conforme o caso
// 4. NÃO escrever em user_roles/mentorados (deprecados)
```

**process-onboarding/index.ts** - Mesma atualização:
```typescript
// 1. Criar/atualizar profile
// 2. Criar membership (role=mentee) no tenant do mentor
// 3. Criar mentee_profile
// 4. Criar mentor_mentee_assignment
// 5. Marcar invite como aceito se aplicável
```

### Etapa 2: Migrar Tabelas de Conteúdo

Adicionar `tenant_id` e `owner_membership_id` nas tabelas funcionais:

| Tabela | Mudança |
|--------|---------|
| `ai_tool_usage` | + `tenant_id`, trocar `mentorado_id` → `membership_id` |
| `trail_progress` | + `tenant_id`, trocar `mentorado_id` → `membership_id` |
| `crm_leads` | + `tenant_id`, trocar `mentor_id` → `owner_membership_id` |
| `sos_requests` | + `tenant_id`, atualizar FKs |
| `behavioral_responses` | + `tenant_id`, atualizar FKs |
| `user_badges` | + `tenant_id`, atualizar FKs |
| `user_streaks` | + `tenant_id`, atualizar FKs |
| `mentorado_files` | + `tenant_id`, atualizar FKs |
| `community_posts` | + `tenant_id` |
| `community_messages` | + `tenant_id` |

### Etapa 3: RLS Policies para Isolamento

**Padrão para tabelas de conteúdo do mentorado:**

```sql
-- Mentee vê apenas seus próprios dados
CREATE POLICY "mentee_own_data" ON ai_tool_usage
FOR SELECT USING (
  membership_id IN (
    SELECT id FROM memberships WHERE user_id = auth.uid()
  )
);

-- Staff (admin/ops/mentor) vê tudo do tenant
CREATE POLICY "staff_view_all" ON ai_tool_usage
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'ops', 'mentor')
  )
);
```

### Etapa 4: Atualizar useAuth / useTenant

**Opção A**: Deprecar `useAuth.role` e usar apenas `useTenant.activeMembership.role`

**Opção B**: Atualizar `useAuth` para ler de memberships:
```typescript
// Em vez de:
const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: userId });

// Usar:
const { data: membershipData } = await supabase.rpc('get_user_memberships', { _user_id: userId });
```

### Etapa 5: Script de Migração de Dados

```sql
-- Migrar dados existentes para incluir tenant_id
UPDATE ai_tool_usage SET 
  tenant_id = (SELECT tenant_id FROM memberships WHERE user_id = (
    SELECT user_id FROM mentorados WHERE id = ai_tool_usage.mentorado_id
  ) LIMIT 1),
  membership_id = (SELECT id FROM memberships WHERE user_id = (
    SELECT user_id FROM mentorados WHERE id = ai_tool_usage.mentorado_id
  ) AND role = 'mentee' LIMIT 1);
```

---

## Arquivos a Modificar

### Edge Functions
- `supabase/functions/verify-otp/index.ts` - Criar memberships
- `supabase/functions/process-onboarding/index.ts` - Criar memberships

### Database Migration (nova)
- Adicionar colunas `tenant_id` e `membership_id` nas tabelas funcionais
- Criar script de migração de dados
- Criar RLS policies novas

### Frontend
- `src/hooks/useAuth.tsx` - Atualizar para usar memberships (ou deprecar role)
- `src/pages/Auth.tsx` - Verificar se redireciona corretamente com novo sistema

### Componentes que usam dados antigos
- Todos que fazem query com `mentorado_id` ou `mentor_id` precisam ser atualizados para usar `membership_id`

---

## Ordem de Execução

1. **Migration SQL**: Adicionar colunas novas (sem remover antigas ainda)
2. **Edge Functions**: Atualizar para escrever nos dois sistemas (transição)
3. **Frontend queries**: Atualizar para usar novas colunas
4. **RLS Policies**: Implementar isolamento por tenant
5. **Cleanup**: Remover colunas/tabelas antigas após validação

---

## Validação Final

Após implementação, verificar:
- [ ] Novo usuário via Auth cria membership corretamente
- [ ] Novo mentorado via onboarding cria membership + mentee_profile
- [ ] Switch context NÃO cria usuários (apenas troca contexto)
- [ ] Mentee só vê seus próprios dados
- [ ] Mentor vê todos os dados do tenant
- [ ] Admin pode impersonar qualquer membership
- [ ] Impersonation logs são registrados
