-- Sprint A & B Part 2: Create functions and policies for master_admin

-- Create function to check if user is master admin (platform-wide)
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
    AND role = 'master_admin'
    AND status = 'active'
  )
$$;

-- Update get_user_memberships to include master_admin properly
CREATE OR REPLACE FUNCTION public.get_user_memberships(_user_id uuid)
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  role membership_role,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    m.role,
    m.status
  FROM memberships m
  JOIN tenants t ON t.id = m.tenant_id
  WHERE m.user_id = _user_id
  AND m.status = 'active'
  ORDER BY 
    CASE m.role 
      WHEN 'master_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'ops' THEN 3
      WHEN 'mentor' THEN 4
      WHEN 'mentee' THEN 5
    END;
END;
$$;

-- RLS: Master admin has cross-tenant read access
DROP POLICY IF EXISTS "master_admin_read_all_tenants" ON public.tenants;
CREATE POLICY "master_admin_read_all_tenants" ON public.tenants
FOR SELECT USING (
  public.is_master_admin()
  OR id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid())
);

-- RLS: Master admin can read all memberships across tenants
DROP POLICY IF EXISTS "master_admin_read_all_memberships" ON public.memberships;
CREATE POLICY "master_admin_read_all_memberships" ON public.memberships
FOR SELECT USING (
  public.is_master_admin()
  OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid())
);

-- RLS: Master admin can read all mentee_profiles
DROP POLICY IF EXISTS "master_admin_read_mentee_profiles" ON public.mentee_profiles;
CREATE POLICY "master_admin_read_mentee_profiles" ON public.mentee_profiles
FOR SELECT USING (
  public.is_master_admin()
  OR membership_id IN (
    SELECT id FROM memberships WHERE user_id = auth.uid()
    OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor', 'master_admin'))
  )
);

-- RLS: Master admin can read all mentor_profiles
DROP POLICY IF EXISTS "master_admin_read_mentor_profiles" ON public.mentor_profiles;
CREATE POLICY "master_admin_read_mentor_profiles" ON public.mentor_profiles
FOR SELECT USING (
  public.is_master_admin()
  OR membership_id IN (
    SELECT id FROM memberships WHERE user_id = auth.uid()
    OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor', 'master_admin'))
  )
);