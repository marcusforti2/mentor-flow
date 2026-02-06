

## Plano: Garantir Persistencia das Analises de Lead do Master Admin

### Problema Identificado

Quando o Master Admin (Marcus Forti) impersona o Diego e roda uma analise de lead, o sistema tenta resolver o `mentorado_id` legado consultando a tabela `mentorados`. Porem, as politicas de seguranca (RLS) dessa tabela **bloqueiam a leitura pelo Master Admin**:

- Politica 1: "Mentorados can view their own record" -- exige que `auth.uid() = user_id` (o master admin nao e dono do registro)
- Politica 2: "Mentors can manage mentorados" -- exige `has_role('mentor')` (master_admin nao e mentor)

**Resultado**: A resolucao de IDs falha silenciosamente, e dependendo do momento, o `mentorado_id` e/ou `tenant_id` podem nao ser definidos corretamente, causando falha na insercao (RLS exige `tenant_id` para staff).

### Dados Atuais

Diego possui 10 leads com analise salva no banco:
1. Fatima Capucci (Score: 62)
2. Conrado Santos (Score: 82)
3. Patricia Almeida (Score: 87)
4. Lucas Ferreira (Score: 62)
5. Roberto Santos (Score: 38)
6. Carolina Duarte
7. Fernando Matsuda
8. Juliana Bastos
9. Thiago Rezende
10. Rafaela Mendonca

Nenhuma analise nova foi salva apos as 20:52 (Fatima Capucci), confirmando que analises posteriores falharam.

### Solucao

#### Passo 1: Adicionar politica de RLS na tabela `mentorados` para master_admin

Criar uma politica SELECT que permita ao master_admin ler registros da tabela `mentorados`:

```text
CREATE POLICY "master_admin_view_mentorados"
ON public.mentorados FOR SELECT
USING (is_master_admin(auth.uid()));
```

Isso resolve a causa raiz: o master_admin podera consultar o `mentorado_id` legado do Diego durante a impersonation.

#### Passo 2: Adicionar politica equivalente para `mentorado_business_profiles`

A mesma logica se aplica a tabela de perfis de negocio, que tambem e consultada durante a analise:

```text
CREATE POLICY "master_admin_view_business_profiles"
ON public.mentorado_business_profiles FOR SELECT
USING (is_master_admin(auth.uid()));
```

#### Passo 3: Melhorar o tratamento de erros no `saveLeadToCRM`

No arquivo `src/components/ai-tools/LeadQualifier.tsx`, adicionar logs e tratamento mais robusto:

- Log de debug para verificar quais IDs foram resolvidos antes do insert
- Fallback: se `effectiveTenantId` for null, buscar do `activeMembership` via contexto
- Mensagem de erro mais descritiva caso a insercao falhe

#### Passo 4: Ampliar o limite do historico de qualificacoes

Atualmente a funcao `fetchQualificationHistory` tem `.limit(10)`. Aumentar para `.limit(50)` para garantir que todas as analises aparecem no historico.

### Secao Tecnica

**Arquivos a modificar:**
- `supabase/migrations/` -- nova migracao para as politicas RLS
- `src/components/ai-tools/LeadQualifier.tsx` -- tratamento de erros e limite do historico

**Fluxo corrigido (impersonation + analise):**

```text
Master Admin impersona Diego
  -> mentoradoId = Diego membership_id (c80b41da-...)
  -> saveLeadToCRM()
    -> Query memberships (RLS OK: master_admin_view_all) -> tenant_id resolvido
    -> Query mentorados (RLS OK: nova politica master_admin) -> mentorado_id legado resolvido
    -> INSERT crm_prospections com:
       - mentorado_id: 3e5eee8c-... (legado, resolvido)
       - membership_id: c80b41da-... (direto do prop)
       - tenant_id: b0000000-... (resolvido)
    -> RLS staff_write verifica tenant_id -> PASSA
    -> Registro salvo com sucesso
```

**Risco**: Nenhum. As novas politicas apenas adicionam permissao de leitura para o master_admin, sem afetar a seguranca dos dados ou permissoes de outros papeis.

