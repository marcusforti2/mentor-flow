

# Plano de Hardening de Seguranca - Passo 1 (Fixes Criticos)

## Resumo Executivo

4 vulnerabilidades criticas identificadas na auditoria anterior. Este plano implementa os fixes de curto prazo que nao quebram produto nem mudam UX.

---

## Fix 1: Edge Functions sem autenticacao (seed-sandbox, cleanup-system)

**Risco:** Qualquer pessoa pode chamar essas funcoes publicamente e deletar TODOS os dados do sistema.

**O que ja esta seguro:** `create-invite` ja possui auth + verificacao de permissoes (linhas 191-256). Nao precisa de fix.

**O que precisa de fix:**
- `seed-sandbox/index.ts` - zero autenticacao, aceita qualquer request
- `cleanup-system/index.ts` - zero autenticacao, deleta dados de producao

**Acao:**
Adicionar validacao de auth + verificar que o caller e `master_admin` em ambas as funcoes. Apenas master_admin pode executar operacoes destrutivas de sistema.

---

## Fix 2: RLS em tabelas expostas (ranking_entries, reward_catalog, trails)

**Risco:** Vazamento de dados entre tenants (tenant escape).

**Problemas encontrados:**
- `ranking_entries`: politica SELECT com `qual: true` -- qualquer usuario autenticado ve rankings de TODOS os tenants
- `reward_catalog`: politica SELECT para "Everyone can view active rewards" sem filtro de tenant -- qualquer usuario ve premios de todos os tenants
- `reward_catalog`: politica ALL para mentores sem filtro de tenant -- um mentor pode gerenciar premios de QUALQUER tenant
- `trails`: politicas existentes com filtro de tenant (staff_manage e mentee_view) -- ja esta correto

**Acao:**
- `ranking_entries`: substituir `USING (true)` por filtro de tenant via membership
- `reward_catalog`: adicionar filtro de tenant nas politicas de SELECT e ALL

---

## Fix 3: IDOR nas funcoes de IA (ai-tools, contextual-chat)

**Risco:** Um usuario autenticado pode passar qualquer `membership_id` / `mentorado_id` e acessar dados de negocio de outros mentorados de outros tenants.

**Problemas encontrados:**
- `ai-tools`: autentica o usuario (linha 420-434), mas depois usa `mentorado_id` direto do body sem verificar se o caller TEM ACESSO a esse mentorado
- `contextual-chat`: autentica o usuario (linha 18-38), mas aceita qualquer `membership_id` sem verificar posse

**Acao:**
- `ai-tools`: apos autenticar, verificar que o `mentorado_id` pertence ao mesmo usuario OU que o caller e staff do mesmo tenant
- `contextual-chat`: verificar que o `membership_id` pertence ao usuario autenticado (mentorado so acessa seus proprios dados) ou que o caller e staff do tenant

---

## Fix 4: Bloqueio de auto-escalacao de privilegios em memberships

**Risco:** Um tenant admin pode fazer UPDATE no proprio registro de membership e mudar `role` para `master_admin`, obtendo acesso total ao sistema.

**Problema encontrado:**
A politica `admins_manage_tenant_memberships` com `cmd: ALL` permite que admins/master_admins facam UPDATE em qualquer coluna de memberships do tenant, incluindo `role`.

**Acao:**
Criar um trigger `BEFORE UPDATE` na tabela `memberships` que:
1. Impede que qualquer usuario mude o `role` para `master_admin` (exceto se ja for master_admin)
2. Impede que um usuario mude seu proprio `role` (auto-escalacao)
3. Bloqueia mudanca de `tenant_id` (impedindo mover membership entre tenants)

---

## Detalhes Tecnicos

### Fix 1 - Codigo das Edge Functions

**seed-sandbox/index.ts:**
```typescript
// Adicionar apos OPTIONS check:
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), 
    { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
  global: { headers: { Authorization: authHeader } }
});
const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), 
    { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
// Verificar master_admin
const { data: isMaster } = await admin.from('memberships')
  .select('id').eq('user_id', user.id).eq('role', 'master_admin').eq('status', 'active').maybeSingle();
if (!isMaster) {
  return new Response(JSON.stringify({ error: 'Forbidden: master_admin required' }), 
    { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
```

Mesmo padrao para `cleanup-system/index.ts`.

### Fix 2 - Migracoes SQL

```sql
-- ranking_entries: remover politica permissiva
DROP POLICY IF EXISTS "ranking_view" ON ranking_entries;
CREATE POLICY "ranking_view_tenant" ON ranking_entries FOR SELECT
USING (
  membership_id IN (
    SELECT m2.id FROM memberships m2
    WHERE m2.tenant_id IN (
      SELECT m.tenant_id FROM memberships m 
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  )
);

-- reward_catalog: corrigir politica de visualizacao
DROP POLICY IF EXISTS "Everyone can view active rewards" ON reward_catalog;
CREATE POLICY "reward_catalog_tenant_view" ON reward_catalog FOR SELECT
USING (
  is_active = true AND tenant_id IN (
    SELECT m.tenant_id FROM memberships m 
    WHERE m.user_id = auth.uid() AND m.status = 'active'
  )
);

-- reward_catalog: corrigir politica de gestao
DROP POLICY IF EXISTS "Mentors can manage rewards" ON reward_catalog;
CREATE POLICY "reward_catalog_staff_manage" ON reward_catalog FOR ALL
USING (is_tenant_staff(auth.uid(), tenant_id))
WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));
```

### Fix 3 - Validacao IDOR nas Edge Functions

**ai-tools/index.ts** (apos autenticacao, antes de buscar business profile):
```typescript
// Verificar que o caller tem acesso ao mentorado_id
if (mentorado_id) {
  const { data: callerUser } = await supabaseAuthClient.auth.getUser(authHeader.replace("Bearer ", ""));
  const callerId = callerUser?.user?.id;
  
  const { data: targetMembership } = await supabase
    .from("memberships")
    .select("user_id, tenant_id")
    .eq("id", mentorado_id)
    .single();
  
  if (!targetMembership) {
    return new Response(JSON.stringify({ error: "Membership not found" }), 
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  // Verificar: ou e o proprio usuario, ou e staff do tenant
  if (targetMembership.user_id !== callerId) {
    const { data: isStaff } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", callerId)
      .eq("tenant_id", targetMembership.tenant_id)
      .in("role", ["admin", "ops", "mentor", "master_admin"])
      .eq("status", "active")
      .maybeSingle();
    
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Access denied" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }
}
```

**contextual-chat/index.ts** (apos autenticacao):
```typescript
// Verificar que o caller e dono do membership_id ou staff
const { data: callerUser } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
const callerId = callerUser?.user?.id;

if (membership.user_id !== callerId) {
  const { data: isStaff } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", callerId)
    .eq("tenant_id", membership.tenant_id)
    .in("role", ["admin", "ops", "mentor", "master_admin"])
    .eq("status", "active")
    .maybeSingle();
  
  if (!isStaff) {
    return new Response(JSON.stringify({ error: "Access denied" }), 
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}
```

### Fix 4 - Trigger anti-escalacao

```sql
CREATE OR REPLACE FUNCTION public.prevent_membership_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role membership_role;
BEGIN
  -- Bloquear mudanca de tenant_id
  IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Nao e permitido mover membership entre tenants';
  END IF;

  -- Se role nao mudou, permitir
  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  -- Buscar role do caller
  SELECT role INTO v_caller_role
  FROM memberships
  WHERE user_id = auth.uid() AND status = 'active'
  ORDER BY CASE role 
    WHEN 'master_admin' THEN 1 
    WHEN 'admin' THEN 2 
    ELSE 3 
  END
  LIMIT 1;

  -- Ninguem pode se auto-escalar
  IF OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Nao e permitido alterar o proprio papel';
  END IF;

  -- Apenas master_admin pode promover para master_admin
  IF NEW.role = 'master_admin' AND v_caller_role != 'master_admin' THEN
    RAISE EXCEPTION 'Apenas master_admin pode promover para master_admin';
  END IF;

  -- Admin nao pode rebaixar outro admin (apenas master pode)
  IF OLD.role = 'admin' AND v_caller_role != 'master_admin' THEN
    RAISE EXCEPTION 'Apenas master_admin pode alterar papel de admin';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_membership_escalation
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_membership_escalation();
```

---

## Passo 2 (pos-fixes): Re-auditoria

Apos implementar os 4 fixes, executarei:
1. Security scan automatizado
2. Verificacao manual das novas politicas
3. Geracao do relatorio v2 com status "before/after" de cada finding

## Passo 3: Postura Institucional

Documentacao da postura de seguranca:
- Security hardening continuo como pratica padrao
- Auditorias periodicas (a cada release major)
- Least privilege por padrao em novas features
- Registro em memoria do projeto para referencia futura

---

## Impacto

| Fix | Risco Antes | Risco Depois | Quebra UX? |
|-----|-------------|--------------|------------|
| Edge Functions auth | Critico | Mitigado | Nao |
| RLS tenant isolation | Alto | Mitigado | Nao |
| IDOR em IA | Alto | Mitigado | Nao |
| Anti-escalacao | Critico | Mitigado | Nao |

