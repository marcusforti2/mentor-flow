
# Plano: Multi-Tenant com RBAC e Impersonation

## ✅ Status: Sprints 1-3 Concluídos

## Resumo do que foi implementado

### ✅ Concluído
1. **Tabelas Multi-Tenant**: `tenants`, `memberships`, `mentor_profiles`, `mentee_profiles`, `mentor_mentee_assignments`, `impersonation_logs`
2. **Colunas tenant_id**: Adicionadas em todas tabelas funcionais (ai_tool_usage, crm_prospections, sos_requests, trails, badges, etc.)
3. **RLS Policies**: Isolamento por tenant implementado
4. **TenantContext**: Gerencia membership ativo e impersonation
5. **SwitchContextPanel**: Painel de troca de contexto para admins
6. **Edge Functions**: `verify-otp` e `process-onboarding` atualizados para criar memberships
7. **Auth.tsx**: Redireciona baseado em membership.role

### 🔄 Em Transição (Backward Compatibility)
- Tabelas legadas (`user_roles`, `mentors`, `mentorados`) ainda existem para compatibilidade
- Edge functions escrevem em ambos sistemas (novo + legado)
- Queries podem usar tanto `membership_id` quanto `mentorado_id`

## Arquitetura

### Modelo de Dados
```
User (auth.users)
    │
Tenant (LBV) ──── Membership (user_id, tenant_id, role)
    │                  │
    │                  ├── MentorProfile (bio, specialties)
    │                  └── MenteeProfile (business_name, onboarding)
    │
    └── MentorMenteeAssignment (mentor_membership_id, mentee_membership_id)
```

### Roles e Permissões
| Role | Descrição | Acesso |
|------|-----------|--------|
| admin | Super admin do tenant | Tudo: CRUD memberships, ver todos dados |
| ops | Operações | Ver todos mentorados, editar dados |
| mentor | Mentor | CRUD seus mentorados atribuídos |
| mentee | Mentorado | CRUD próprios dados apenas |

### Visibilidade de Dados
- **Mentee**: Só vê dados onde `membership_id = seu membership`
- **Staff (admin/ops/mentor)**: Vê todos dados do `tenant_id`

## Impersonation

O `SwitchContextPanel` permite admins alternarem visualização:
1. Não cria usuários/memberships novos
2. Apenas troca `activeMembershipId` no contexto
3. Logs registrados em `impersonation_logs`
4. Disponível apenas para role=admin com `can_impersonate=true`

## Próximos Passos (Sprint 4-5)

### Sprint 4: Migrar Queries do Frontend
- [ ] Atualizar hooks para usar `membership_id` em vez de `mentorado_id`
- [ ] Componentes de listagem (trails, badges, CRM) filtrar por `tenant_id`
- [ ] Dashboard do mentor usar `mentor_mentee_assignments`

### Sprint 5: Cleanup
- [ ] Remover tabelas legadas após validação completa
- [ ] Remover colunas `mentorado_id`/`mentor_id` das tabelas funcionais
- [ ] Atualizar todos edge functions para usar apenas novo sistema

## Validação Final

Após implementação completa:
- [x] Novo usuário via Auth cria membership corretamente
- [x] Novo mentorado via onboarding cria membership + mentee_profile
- [ ] Switch context NÃO cria usuários (apenas troca contexto)
- [ ] Mentee só vê seus próprios dados
- [ ] Mentor vê todos os dados do tenant
- [ ] Admin pode impersonar qualquer membership
- [ ] Impersonation logs são registrados
