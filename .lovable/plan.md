
# Plano: Sistema Invite-Only Completo

## Visao Geral

Implementar governanca de usuarios onde:
- Emails nao convidados NAO recebem OTP e NAO criam auth.users
- Master Admin cria mentores em qualquer tenant
- Mentor cria mentorados no proprio tenant
- Sistema resolve tenant automaticamente pelo convite

---

## Estado Atual vs Desejado

| Componente | Estado Atual | Estado Desejado |
|------------|--------------|-----------------|
| `send-otp` | Envia OTP para qualquer email | Bloqueia se nao existe invite/membership |
| `verify-otp` | Cria user com escolha de role | Usa dados do invite para criar membership |
| `Auth.tsx` | Step "register" com escolha mentor/mentorado | Remover escolha - role vem do invite |
| Tabela invites | Nao existe (mentorado_invites e legacy) | Nova tabela unificada |

---

## Fase 1: Migracao SQL - Tabela `invites`

**Objetivo**: Armazenar convites pendentes por email sem depender de user_id

```sql
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role membership_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  metadata JSONB DEFAULT '{}',  -- full_name, phone
  created_by_membership_id UUID REFERENCES public.memberships(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  UNIQUE (tenant_id, email, role)
);

-- Indices
CREATE INDEX idx_invites_email ON public.invites(lower(email));
CREATE INDEX idx_invites_tenant_status ON public.invites(tenant_id, status);

-- Trigger para normalizar email
CREATE TRIGGER tr_normalize_invite_email
BEFORE INSERT OR UPDATE ON public.invites
FOR EACH ROW EXECUTE FUNCTION public.normalize_email_trigger();
```

**RLS Policies**:
- master_admin: acesso total
- admin/mentor: gerenciar invites do proprio tenant
- service_role: consulta sem RLS

---

## Fase 2: Funcao RPC `can_receive_otp`

**Objetivo**: Verificar se email pode receber OTP antes de enviar

**Retorno**:
```typescript
{
  allowed: boolean,
  reason: 'existing_user' | 'pending_invite' | 'not_invited',
  tenant_id?: uuid,
  role?: membership_role,
  full_name?: string,
  phone?: string,
  multiple_tenants?: boolean,
  tenants?: { id, name }[]  // se multiplos invites
}
```

**Logica**:
1. Buscar profile pelo email
2. Se existe profile, buscar membership ativa
3. Se nao existe membership, buscar invite pending
4. Se multiplos invites pending, retornar lista de tenants
5. Se nenhum encontrado, retornar allowed=false

---

## Fase 3: Atualizar `send-otp`

**Arquivo**: `supabase/functions/send-otp/index.ts`

**Entrada**:
```typescript
{ email: string, tenant_hint?: string }
```

**Fluxo**:
```text
1. Normalizar email
2. Chamar RPC can_receive_otp
3. Se allowed=false: 
   - Retornar 403 "Voce precisa ser convidado"
4. Se multiple_tenants=true E sem tenant_hint:
   - Retornar 409 com lista de tenants para escolha
5. Se allowed=true:
   - Gerar OTP
   - Salvar em otp_codes
   - Enviar email
   - Retornar 200
```

**Mudancas no codigo atual**:
- Adicionar verificacao ANTES de gerar OTP (linha ~40)
- Adicionar resposta 409 para multiplos tenants
- Logar tentativas bloqueadas

---

## Fase 4: Atualizar `verify-otp`

**Arquivo**: `supabase/functions/verify-otp/index.ts`

**Entrada**:
```typescript
{ email: string, code: string, tenant_id?: string }
```

**Fluxo para usuario NOVO**:
```text
1. Validar OTP
2. Buscar invite pending para email (e tenant_id se fornecido)
3. Se nao existe invite: ERRO 403
4. Se existe invite:
   - Criar auth.user (sem senha)
   - Criar profile usando metadata do invite
   - Criar membership usando tenant_id e role do invite
   - Criar mentor_profile ou mentee_profile
   - Marcar invite como accepted
5. Gerar magic link
6. Retornar { tenant_id, role, redirect_path }
```

**Remocoes**:
- Remover step "needsName"
- Remover userType do body
- Remover logica de escolha de papel

---

## Fase 5: Edge Function `create-membership`

**Arquivo**: `supabase/functions/create-membership/index.ts`

**Endpoint**:
```text
POST /create-membership
{
  tenant_id: string,
  email: string,
  full_name?: string,
  phone?: string,
  role: 'mentor' | 'mentee'
}
```

**Permissoes**:
- master_admin: criar mentor/mentee em qualquer tenant
- admin/mentor: criar mentee apenas no proprio tenant
- mentor NAO pode criar outro mentor

**Processo**:
1. Validar JWT do caller
2. Buscar memberships do caller
3. Verificar permissao por role
4. Verificar se tenant existe
5. Normalizar email
6. Upsert em invites (status=pending)
7. Retornar dados para convite WhatsApp

**Retorno**:
```typescript
{
  success: true,
  invite: { id, email, role },
  tenant: { id, name, slug },
  login_url: string
}
```

---

## Fase 6: Simplificar `Auth.tsx`

**Arquivo**: `src/pages/Auth.tsx`

**Remover**:
- Step "register" inteiro (linhas 507-616)
- Estado userType
- RadioGroup de escolha de papel
- Funcao handleCreateAccount
- Tipo AuthStep = "email" | "code" (remover "register")

**Adicionar**:
- Estado para escolha de tenant (caso multiplos)
- Handler para resposta 409 (multiplos tenants)

**Novo fluxo**:
```text
Tela 1: Email
  - Usuario digita email
  - Chamar send-otp
  - Se 403: mostrar "Voce precisa ser convidado"
  - Se 409: mostrar Tela 1b com lista de tenants
  - Se 200: ir para Tela 2

Tela 1b: Escolher Tenant (se multiplos invites)
  - Listar tenants permitidos
  - Usuario seleciona
  - Reenviar send-otp com tenant_hint
  - Ir para Tela 2

Tela 2: Codigo OTP
  - Usuario digita codigo
  - Chamar verify-otp
  - Redirecionar por role
```

---

## Fase 7: UI - CreateMentorModal

**Arquivo**: `src/components/admin/CreateMentorModal.tsx`

**Campos**:
- Tenant (select) - obrigatorio
- Nome Completo (input) - obrigatorio
- Email (input) - obrigatorio
- Telefone WhatsApp (input) - opcional
- Checkbox "Abrir convite WhatsApp"

**Integracao**:
- Importar em `UsersPage.tsx`
- Botao "Novo Mentor" no header
- Ao criar, invalidar queries e opcionalmente abrir WhatsApp

---

## Fase 8: UI - CreateMenteeModal

**Arquivo**: `src/components/admin/CreateMenteeModal.tsx`

**Diferenca do CreateMentorModal**:
- Nao tem select de tenant (usa tenant do mentor logado)
- Role fixo como "mentee"

**Integracao**:
- Importar em `Mentorados.tsx`
- Botao "Novo Mentorado" no header

---

## Fase 9: Hook `useCreateMembership`

**Arquivo**: `src/hooks/useCreateMembership.tsx`

```typescript
interface CreateMembershipParams {
  tenant_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'mentor' | 'mentee';
}

export const useCreateMembership = () => {
  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.functions.invoke('create-membership', {
        body: params,
      });
      if (error || data.error) throw new Error(data?.error || error?.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
};
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/create-membership/index.ts` | Edge function para criar convites |
| `src/components/admin/CreateMentorModal.tsx` | Modal Master Admin criar mentor |
| `src/components/admin/CreateMenteeModal.tsx` | Modal Mentor criar mentorado |
| `src/hooks/useCreateMembership.tsx` | Hook para chamar edge function |

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/send-otp/index.ts` | Verificar invite/membership ANTES de enviar OTP |
| `supabase/functions/verify-otp/index.ts` | Usar dados do invite para criar user |
| `src/pages/Auth.tsx` | Remover step "register", adicionar escolha de tenant |
| `src/pages/master/UsersPage.tsx` | Adicionar botao "Novo Mentor" e modal |
| `src/pages/admin/Mentorados.tsx` | Adicionar botao "Novo Mentorado" e modal |
| `supabase/config.toml` | Registrar funcao create-membership |

---

## Ordem de Implementacao

1. **Migracao SQL**: Criar tabela `invites` + funcao `can_receive_otp`
2. **send-otp**: Adicionar verificacao de permissao
3. **verify-otp**: Usar dados do invite para criar user
4. **create-membership**: Nova edge function
5. **useCreateMembership**: Hook no frontend
6. **CreateMentorModal**: UI para Master Admin
7. **UsersPage**: Integrar botao e modal
8. **CreateMenteeModal**: UI para Mentor
9. **Mentorados.tsx**: Integrar botao e modal
10. **Auth.tsx**: Remover auto-registro, adicionar escolha tenant
11. **Testes end-to-end**

---

## Checklist de Validacao

| Teste | Resultado Esperado |
|-------|-------------------|
| Email aleatorio tenta OTP | ERRO 403, sem OTP enviado |
| Master cria invite de mentor | Invite criado com status pending |
| Mentor convidado faz login | OTP enviado, user+membership criados |
| Mentor tenta criar outro mentor | ERRO 403 |
| Mentor cria invite de mentorado | Invite criado no tenant do mentor |
| Mentorado faz login | OTP enviado, user+membership criados |
| Email com multiplos invites | Mostra lista de tenants para escolher |
| Master visualiza usuarios | Ve mentores E mentorados de todos tenants |

---

## Detalhes Tecnicos

### Migracao SQL Completa

```sql
-- 1. Funcao para normalizar email
CREATE OR REPLACE FUNCTION public.normalize_email_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tabela invites
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role membership_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  metadata JSONB DEFAULT '{}',
  created_by_membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  UNIQUE (tenant_id, email, role)
);

-- 3. Trigger
CREATE TRIGGER tr_normalize_invite_email
BEFORE INSERT OR UPDATE ON public.invites
FOR EACH ROW EXECUTE FUNCTION public.normalize_email_trigger();

-- 4. Indices
CREATE INDEX idx_invites_email ON public.invites(lower(email));
CREATE INDEX idx_invites_tenant_status ON public.invites(tenant_id, status);
CREATE INDEX idx_invites_status_expires ON public.invites(status, expires_at);

-- 5. RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_admin_full_access" ON public.invites
  FOR ALL TO authenticated
  USING (public.is_master_admin());

CREATE POLICY "tenant_members_manage" ON public.invites
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = invites.tenant_id
        AND m.role IN ('admin', 'ops', 'mentor')
        AND m.status = 'active'
    )
  );

-- 6. Funcao RPC can_receive_otp
CREATE OR REPLACE FUNCTION public.can_receive_otp(_email TEXT, _tenant_hint UUID DEFAULT NULL)
RETURNS TABLE(
  allowed BOOLEAN, 
  reason TEXT, 
  tenant_id UUID, 
  role membership_role,
  full_name TEXT,
  phone TEXT,
  multiple_tenants BOOLEAN,
  tenants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(_email));
  v_user_id UUID;
  v_invite_count INT;
BEGIN
  -- 1. Verificar se usuario existe
  SELECT p.user_id INTO v_user_id
  FROM profiles p
  WHERE lower(p.email) = v_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Usuario existe, verificar membership ativa
    RETURN QUERY
    SELECT 
      true as allowed,
      'existing_user'::TEXT as reason,
      m.tenant_id,
      m.role,
      NULL::TEXT as full_name,
      NULL::TEXT as phone,
      false as multiple_tenants,
      NULL::JSONB as tenants
    FROM memberships m
    WHERE m.user_id = v_user_id AND m.status = 'active'
    ORDER BY CASE m.role 
      WHEN 'master_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'mentor' THEN 3
      WHEN 'mentee' THEN 4
    END
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- 2. Contar invites pending
  SELECT COUNT(*) INTO v_invite_count
  FROM invites i
  WHERE lower(i.email) = v_email 
    AND i.status = 'pending'
    AND i.expires_at > now();
  
  IF v_invite_count = 0 THEN
    -- Nenhum invite
    RETURN QUERY SELECT 
      false, 
      'not_invited'::TEXT, 
      NULL::UUID, 
      NULL::membership_role,
      NULL::TEXT,
      NULL::TEXT,
      false,
      NULL::JSONB;
    RETURN;
  END IF;
  
  IF v_invite_count > 1 AND _tenant_hint IS NULL THEN
    -- Multiplos invites, precisa escolher tenant
    RETURN QUERY SELECT 
      false, 
      'multiple_invites'::TEXT, 
      NULL::UUID, 
      NULL::membership_role,
      NULL::TEXT,
      NULL::TEXT,
      true,
      (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name))
       FROM invites i2
       JOIN tenants t ON t.id = i2.tenant_id
       WHERE lower(i2.email) = v_email 
         AND i2.status = 'pending'
         AND i2.expires_at > now());
    RETURN;
  END IF;
  
  -- 3. Retornar invite unico ou filtrado por tenant_hint
  RETURN QUERY
  SELECT 
    true as allowed,
    'pending_invite'::TEXT as reason,
    i.tenant_id,
    i.role,
    (i.metadata->>'full_name')::TEXT as full_name,
    (i.metadata->>'phone')::TEXT as phone,
    false as multiple_tenants,
    NULL::JSONB as tenants
  FROM invites i
  WHERE lower(i.email) = v_email 
    AND i.status = 'pending'
    AND i.expires_at > now()
    AND (_tenant_hint IS NULL OR i.tenant_id = _tenant_hint)
  LIMIT 1;
END;
$$;
```

### send-otp Atualizado (Trecho Chave)

```typescript
// NOVA VERIFICACAO - Inicio da funcao (antes de gerar OTP)
const normalizedEmail = email.toLowerCase().trim();
const tenantHint = tenant_hint || null;

// Verificar permissao
const { data: permission, error: permError } = await supabase
  .rpc('can_receive_otp', { 
    _email: normalizedEmail,
    _tenant_hint: tenantHint 
  })
  .single();

if (permError) {
  console.error('Error checking OTP permission:', permError);
  throw new Error('Erro ao verificar permissao');
}

if (!permission?.allowed) {
  if (permission?.reason === 'multiple_invites') {
    // Multiplos tenants - retornar lista para escolha
    return new Response(
      JSON.stringify({ 
        error: 'multiple_tenants',
        tenants: permission.tenants,
        message: 'Selecione o programa que deseja acessar'
      }),
      { status: 409, headers: corsHeaders }
    );
  }
  
  // Nao convidado
  console.log('OTP blocked for:', normalizedEmail, permission?.reason);
  return new Response(
    JSON.stringify({ 
      error: 'Acesso nao configurado. Voce precisa ser convidado para acessar a plataforma.' 
    }),
    { status: 403, headers: corsHeaders }
  );
}

console.log('OTP allowed:', normalizedEmail, 'reason:', permission.reason);
// ... resto do codigo (gerar e enviar OTP)
```

### verify-otp Atualizado (Trecho Chave para Novo Usuario)

```typescript
// Usuario NAO existe - criar usando dados do invite
const { data: invite, error: inviteError } = await supabase
  .from('invites')
  .select('*')
  .eq('email', normalizedEmail)
  .eq('status', 'pending')
  .gt('expires_at', new Date().toISOString())
  .single();

if (inviteError || !invite) {
  return new Response(
    JSON.stringify({ error: 'Convite nao encontrado ou expirado' }),
    { status: 403, headers: corsHeaders }
  );
}

// Criar usuario com dados do invite
const fullName = invite.metadata?.full_name || '';
const phone = invite.metadata?.phone || '';

const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
  email: normalizedEmail,
  email_confirm: true,
  user_metadata: { full_name: fullName, phone },
});

if (createError) throw new Error('Erro ao criar usuario');

// Criar profile
await supabase.from('profiles').upsert({
  user_id: newUser.user.id,
  email: normalizedEmail,
  full_name: fullName,
  phone: phone,
});

// Criar membership usando dados do invite
await supabase.from('memberships').insert({
  user_id: newUser.user.id,
  tenant_id: invite.tenant_id,
  role: invite.role,
  status: 'active',
});

// Criar profile especifico
if (invite.role === 'mentee') {
  await supabase.from('mentee_profiles').insert({
    membership_id: membership.id,
    onboarding_completed: false,
  });
} else if (['mentor', 'admin'].includes(invite.role)) {
  await supabase.from('mentor_profiles').insert({
    membership_id: membership.id,
    business_name: `Mentoria de ${fullName}`,
  });
}

// Marcar invite como aceito
await supabase.from('invites')
  .update({ status: 'accepted', accepted_at: new Date().toISOString() })
  .eq('id', invite.id);

// ... gerar magic link e retornar
```

---

## Resultado Final

### Antes (Vulneravel)
- Qualquer email cria conta
- Usuario escolhe seu papel
- Bloqueio so no frontend
- auth.users poluido

### Depois (Governado)
- Somente emails convidados recebem OTP
- Papel definido pelo invite
- Bloqueio no backend (send-otp)
- Master Admin cria mentores
- Mentores criam mentorados
- Sistema resolve tenant automaticamente
- Visibilidade completa no Master
