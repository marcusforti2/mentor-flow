
# Plano: Multi-Tenant com RBAC e Impersonation

 ## ✅ Status: Sistema de 3 Áreas Implementado

## Resumo do que foi implementado

### ✅ Concluído
1. **Tabelas Multi-Tenant**: `tenants`, `memberships`, `mentor_profiles`, `mentee_profiles`, `mentor_mentee_assignments`, `impersonation_logs`
2. **Colunas tenant_id**: Adicionadas em todas tabelas funcionais (ai_tool_usage, crm_prospections, sos_requests, trails, badges, etc.)
3. **RLS Policies**: Isolamento por tenant implementado
4. **TenantContext**: Gerencia membership ativo e impersonation
5. **SwitchContextPanel**: Painel de troca de contexto para admins
6. **Edge Functions**: `verify-otp` e `process-onboarding` atualizados para criar memberships
7. **Auth.tsx**: Redireciona baseado em membership.role
 8. **3 Áreas Isoladas**: `/master`, `/mentor`, `/mentorado`
 9. **Role master_admin**: Adicionado ao enum com RLS cross-tenant
 10. **Preview System**: Hook `useSandboxData` com 20 mentorados fake

### 🔄 Em Transição (Backward Compatibility)
- Tabelas legadas (`user_roles`, `mentors`, `mentorados`) ainda existem para compatibilidade
- Edge functions escrevem em ambos sistemas (novo + legado)
- Queries podem usar tanto `membership_id` quanto `mentorado_id`

 ## Arquitetura de Rotas
 
 | Rota | Layout | Roles Permitidos |
 |------|--------|------------------|
 | `/master` | MasterLayout | master_admin |
 | `/mentor` | MentorLayout | admin, ops, mentor |
 | `/mentorado` | MentoradoLayout | mentee (+ outros para preview) |
 
 ## Arquitetura de Dados

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
 | master_admin | Admin da plataforma | Cross-tenant: ver tudo, preview, impersonation |
| admin | Super admin do tenant | Tudo: CRUD memberships, ver todos dados |
| ops | Operações | Ver todos mentorados, editar dados |
| mentor | Mentor | CRUD seus mentorados atribuídos |
| mentee | Mentorado | CRUD próprios dados apenas |

### Visibilidade de Dados
- **Mentee**: Só vê dados onde `membership_id = seu membership`
- **Staff (admin/ops/mentor)**: Vê todos dados do `tenant_id`

## Impersonation

 O `SwitchContextPanel` e `/master/preview` permitem alternância:
1. Não cria usuários/memberships novos
2. Apenas troca `activeMembershipId` no contexto
3. Logs registrados em `impersonation_logs`
 4. Disponível para master_admin ou admins com `can_impersonate=true`
 
 ## Preview System
 
 - Sandbox tenant: `b0000000-0000-0000-0000-000000000002`
 - 20 mentorados fake via `useSandboxData` hook
 - Dados interligados: progresso, pontos, ranking, streaks
 - Não cria users reais - apenas mock data para UI

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
 - [x] Switch context NÃO cria usuários (apenas troca contexto)
- [ ] Mentee só vê seus próprios dados
- [ ] Mentor vê todos os dados do tenant
 - [x] Admin pode impersonar qualquer membership
 - [x] Impersonation logs são registrados
