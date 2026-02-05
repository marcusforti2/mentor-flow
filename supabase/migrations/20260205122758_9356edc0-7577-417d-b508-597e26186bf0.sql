-- 1. Funcao para normalizar email (se nao existir)
CREATE OR REPLACE FUNCTION public.normalize_email_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

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

-- 3. Trigger para normalizar email
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