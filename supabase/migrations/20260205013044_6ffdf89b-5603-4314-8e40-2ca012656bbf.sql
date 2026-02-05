-- =============================================
-- SPRINT 1: MULTI-TENANT SCHEMA FOUNDATION
-- =============================================

-- 1. Create enum for membership roles
CREATE TYPE public.membership_role AS ENUM ('admin', 'ops', 'mentor', 'mentee');

-- 2. Create tenants table (umbrella companies)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  secondary_color TEXT DEFAULT '#A78BFA',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create memberships table (replaces user_roles)
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  can_impersonate BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, user_id, role)
);

-- 4. Create mentor_profiles table (replaces mentors)
CREATE TABLE public.mentor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE UNIQUE,
  bio TEXT,
  business_name TEXT,
  website TEXT,
  specialties TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create mentee_profiles table (evolution of mentorados)
CREATE TABLE public.mentee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  business_profile JSONB DEFAULT '{}',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Create mentor_mentee_assignments table
CREATE TABLE public.mentor_mentee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  mentor_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  mentee_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mentor_membership_id, mentee_membership_id)
);

-- 7. Create impersonation_logs table (audit)
CREATE TABLE public.impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  target_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_memberships_tenant_id ON public.memberships(tenant_id);
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_memberships_role ON public.memberships(role);
CREATE INDEX idx_mentor_profiles_membership_id ON public.mentor_profiles(membership_id);
CREATE INDEX idx_mentee_profiles_membership_id ON public.mentee_profiles(membership_id);
CREATE INDEX idx_assignments_tenant_id ON public.mentor_mentee_assignments(tenant_id);
CREATE INDEX idx_assignments_mentor ON public.mentor_mentee_assignments(mentor_membership_id);
CREATE INDEX idx_assignments_mentee ON public.mentor_mentee_assignments(mentee_membership_id);
CREATE INDEX idx_impersonation_admin ON public.impersonation_logs(admin_membership_id);

-- =============================================
-- RPC FUNCTIONS FOR RBAC
-- =============================================

-- Get user's memberships in a tenant
CREATE OR REPLACE FUNCTION public.get_user_memberships(_user_id UUID, _tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  role membership_role,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    m.role,
    m.status
  FROM public.memberships m
  JOIN public.tenants t ON t.id = m.tenant_id
  WHERE m.user_id = _user_id
    AND m.status = 'active'
    AND (_tenant_id IS NULL OR m.tenant_id = _tenant_id)
  ORDER BY m.created_at;
$$;

-- Check if user has specific role in tenant
CREATE OR REPLACE FUNCTION public.has_membership_role(_user_id UUID, _tenant_id UUID, _role membership_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
      AND status = 'active'
  );
$$;

-- Get effective role (highest privilege) in tenant
CREATE OR REPLACE FUNCTION public.get_effective_membership(_user_id UUID, _tenant_id UUID)
RETURNS TABLE (
  membership_id UUID,
  role membership_role,
  can_impersonate BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as membership_id,
    role,
    can_impersonate
  FROM public.memberships
  WHERE user_id = _user_id
    AND tenant_id = _tenant_id
    AND status = 'active'
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'ops' THEN 2 
      WHEN 'mentor' THEN 3 
      WHEN 'mentee' THEN 4 
    END
  LIMIT 1;
$$;

-- Check if can view mentee (admin/ops see all, mentor sees assigned)
CREATE OR REPLACE FUNCTION public.can_view_mentee(_viewer_membership_id UUID, _mentee_membership_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_role membership_role;
  v_viewer_tenant_id UUID;
  v_mentee_tenant_id UUID;
BEGIN
  -- Get viewer info
  SELECT role, tenant_id INTO v_viewer_role, v_viewer_tenant_id
  FROM public.memberships WHERE id = _viewer_membership_id;
  
  -- Get mentee tenant
  SELECT tenant_id INTO v_mentee_tenant_id
  FROM public.memberships WHERE id = _mentee_membership_id;
  
  -- Must be same tenant
  IF v_viewer_tenant_id != v_mentee_tenant_id THEN
    RETURN FALSE;
  END IF;
  
  -- Admin/Ops can see all
  IF v_viewer_role IN ('admin', 'ops') THEN
    RETURN TRUE;
  END IF;
  
  -- Mentor can see assigned mentees
  IF v_viewer_role = 'mentor' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.mentor_mentee_assignments
      WHERE mentor_membership_id = _viewer_membership_id
        AND mentee_membership_id = _mentee_membership_id
        AND status = 'active'
    );
  END IF;
  
  -- Mentee can only see self
  RETURN _viewer_membership_id = _mentee_membership_id;
END;
$$;

-- Log impersonation start
CREATE OR REPLACE FUNCTION public.start_impersonation(
  _admin_membership_id UUID,
  _target_membership_id UUID,
  _ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_admin_role membership_role;
  v_can_impersonate BOOLEAN;
  v_same_tenant BOOLEAN;
BEGIN
  -- Validate admin has permission
  SELECT role, can_impersonate INTO v_admin_role, v_can_impersonate
  FROM public.memberships WHERE id = _admin_membership_id;
  
  IF v_admin_role != 'admin' AND NOT v_can_impersonate THEN
    RAISE EXCEPTION 'Sem permissão para impersonar';
  END IF;
  
  -- Validate same tenant
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m1
    JOIN public.memberships m2 ON m1.tenant_id = m2.tenant_id
    WHERE m1.id = _admin_membership_id AND m2.id = _target_membership_id
  ) INTO v_same_tenant;
  
  IF NOT v_same_tenant THEN
    RAISE EXCEPTION 'Memberships devem ser do mesmo tenant';
  END IF;
  
  -- Create log entry
  INSERT INTO public.impersonation_logs (admin_membership_id, target_membership_id, ip_address)
  VALUES (_admin_membership_id, _target_membership_id, _ip_address)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Log impersonation end
CREATE OR REPLACE FUNCTION public.end_impersonation(_log_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.impersonation_logs
  SET ended_at = now()
  WHERE id = _log_id AND ended_at IS NULL;
$$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_mentee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Tenants: users can see tenants they belong to
CREATE POLICY "Users can view their tenants"
ON public.tenants FOR SELECT
TO authenticated
USING (
  id IN (SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid())
);

-- Memberships: users can see memberships in their tenant
CREATE POLICY "Users can view memberships in their tenant"
ON public.memberships FOR SELECT
TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid())
);

-- Memberships: only admin can insert/update/delete
CREATE POLICY "Admins can manage memberships"
ON public.memberships FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = memberships.tenant_id
      AND m.role = 'admin'
      AND m.status = 'active'
  )
);

-- Mentor profiles: viewable by same tenant members
CREATE POLICY "Tenant members can view mentor profiles"
ON public.mentor_profiles FOR SELECT
TO authenticated
USING (
  membership_id IN (
    SELECT m.id FROM public.memberships m
    WHERE m.tenant_id IN (
      SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid()
    )
  )
);

-- Mentor profiles: mentor can edit own
CREATE POLICY "Mentors can edit own profile"
ON public.mentor_profiles FOR UPDATE
TO authenticated
USING (
  membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
);

-- Mentee profiles: self or staff can view
CREATE POLICY "Self or staff can view mentee profiles"
ON public.mentee_profiles FOR SELECT
TO authenticated
USING (
  -- Own profile
  membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
  OR
  -- Admin/Ops/Mentor in same tenant
  EXISTS (
    SELECT 1 FROM public.memberships viewer
    JOIN public.memberships mentee ON mentee.id = mentee_profiles.membership_id
    WHERE viewer.user_id = auth.uid()
      AND viewer.tenant_id = mentee.tenant_id
      AND viewer.role IN ('admin', 'ops', 'mentor')
      AND viewer.status = 'active'
  )
);

-- Mentee profiles: self can update own
CREATE POLICY "Mentees can update own profile"
ON public.mentee_profiles FOR UPDATE
TO authenticated
USING (
  membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
);

-- Assignments: viewable by same tenant admin/ops/mentor
CREATE POLICY "Staff can view assignments"
ON public.mentor_mentee_assignments FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'ops', 'mentor')
      AND status = 'active'
  )
);

-- Assignments: only admin can manage
CREATE POLICY "Admins can manage assignments"
ON public.mentor_mentee_assignments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND tenant_id = mentor_mentee_assignments.tenant_id
      AND role = 'admin'
      AND status = 'active'
  )
);

-- Impersonation logs: only admin can view
CREATE POLICY "Admins can view impersonation logs"
ON public.impersonation_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.memberships target ON target.id = impersonation_logs.target_membership_id
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = target.tenant_id
      AND m.role = 'admin'
      AND m.status = 'active'
  )
);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentor_profiles_updated_at
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentee_profiles_updated_at
  BEFORE UPDATE ON public.mentee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEED DEFAULT TENANT (LBV)
-- =============================================

INSERT INTO public.tenants (name, slug, primary_color, secondary_color, settings)
VALUES ('LBV Tech', 'lbv', '#8B5CF6', '#A78BFA', '{"welcomeMessage": "Bem-vindo à LBV!"}');

-- =============================================
-- MIGRATE EXISTING DATA
-- =============================================

-- Migrate mentors to memberships + mentor_profiles
DO $$
DECLARE
  v_tenant_id UUID;
  v_mentor RECORD;
  v_membership_id UUID;
BEGIN
  -- Get LBV tenant
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'lbv';
  
  -- Migrate each mentor
  FOR v_mentor IN SELECT * FROM public.mentors LOOP
    -- Create membership
    INSERT INTO public.memberships (tenant_id, user_id, role, can_impersonate)
    VALUES (v_tenant_id, v_mentor.user_id, 'mentor', false)
    ON CONFLICT (tenant_id, user_id, role) DO NOTHING
    RETURNING id INTO v_membership_id;
    
    -- If membership already existed, get its ID
    IF v_membership_id IS NULL THEN
      SELECT id INTO v_membership_id 
      FROM public.memberships 
      WHERE tenant_id = v_tenant_id AND user_id = v_mentor.user_id AND role = 'mentor';
    END IF;
    
    -- Create mentor profile
    IF v_membership_id IS NOT NULL THEN
      INSERT INTO public.mentor_profiles (membership_id, bio, business_name, website)
      VALUES (v_membership_id, v_mentor.bio, v_mentor.business_name, v_mentor.website)
      ON CONFLICT (membership_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Migrate mentorados to memberships + mentee_profiles + assignments
DO $$
DECLARE
  v_tenant_id UUID;
  v_mentorado RECORD;
  v_membership_id UUID;
  v_mentor_membership_id UUID;
BEGIN
  -- Get LBV tenant
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'lbv';
  
  -- Migrate each mentorado
  FOR v_mentorado IN SELECT * FROM public.mentorados LOOP
    -- Create membership
    INSERT INTO public.memberships (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_mentorado.user_id, 'mentee')
    ON CONFLICT (tenant_id, user_id, role) DO NOTHING
    RETURNING id INTO v_membership_id;
    
    -- If membership already existed, get its ID
    IF v_membership_id IS NULL THEN
      SELECT id INTO v_membership_id 
      FROM public.memberships 
      WHERE tenant_id = v_tenant_id AND user_id = v_mentorado.user_id AND role = 'mentee';
    END IF;
    
    -- Create mentee profile
    IF v_membership_id IS NOT NULL THEN
      INSERT INTO public.mentee_profiles (
        membership_id, 
        onboarding_completed, 
        onboarding_step,
        joined_at
      )
      VALUES (
        v_membership_id, 
        v_mentorado.onboarding_completed, 
        v_mentorado.onboarding_step,
        v_mentorado.joined_at
      )
      ON CONFLICT (membership_id) DO NOTHING;
      
      -- Create assignment to mentor (if mentor_id exists)
      IF v_mentorado.mentor_id IS NOT NULL THEN
        -- Find mentor's membership
        SELECT m.id INTO v_mentor_membership_id
        FROM public.memberships m
        JOIN public.mentors mt ON mt.user_id = m.user_id
        WHERE mt.id = v_mentorado.mentor_id 
          AND m.role = 'mentor'
          AND m.tenant_id = v_tenant_id;
        
        IF v_mentor_membership_id IS NOT NULL THEN
          INSERT INTO public.mentor_mentee_assignments (
            tenant_id, 
            mentor_membership_id, 
            mentee_membership_id,
            status
          )
          VALUES (
            v_tenant_id, 
            v_mentor_membership_id, 
            v_membership_id,
            CASE WHEN v_mentorado.status = 'active' THEN 'active' ELSE 'paused' END
          )
          ON CONFLICT (mentor_membership_id, mentee_membership_id) DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Promote first user_role admin_master to tenant admin
DO $$
DECLARE
  v_tenant_id UUID;
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'lbv';
  
  -- Find existing admin_master
  SELECT user_id INTO v_admin_user_id 
  FROM public.user_roles 
  WHERE role = 'admin_master' 
  LIMIT 1;
  
  IF v_admin_user_id IS NOT NULL THEN
    INSERT INTO public.memberships (tenant_id, user_id, role, can_impersonate)
    VALUES (v_tenant_id, v_admin_user_id, 'admin', true)
    ON CONFLICT (tenant_id, user_id, role) DO NOTHING;
  END IF;
END $$;