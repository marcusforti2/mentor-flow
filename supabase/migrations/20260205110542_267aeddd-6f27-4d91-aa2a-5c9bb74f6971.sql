-- ===========================================
-- FIX: Complete RLS recursion fix with helper functions
-- ===========================================

-- 1. Create helper function to check tenant admin (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
    AND tenant_id = _tenant_id
    AND role IN ('admin', 'master_admin')
    AND status = 'active'
  )
$$;

-- 2. Create helper function to get user's tenant_ids (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id uuid DEFAULT auth.uid())
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.memberships WHERE user_id = _user_id
$$;

-- 3. Drop ALL existing memberships policies
DROP POLICY IF EXISTS "admins_manage_tenant_memberships" ON public.memberships;
DROP POLICY IF EXISTS "master_admin_view_all_memberships" ON public.memberships;
DROP POLICY IF EXISTS "users_view_own_memberships" ON public.memberships;

-- 4. Create new memberships policies (using SECURITY DEFINER functions)
-- Users can view their own memberships
CREATE POLICY "users_view_own_memberships"
  ON public.memberships FOR SELECT
  USING (user_id = auth.uid());

-- Master admin can view ALL memberships
CREATE POLICY "master_admin_view_all_memberships"
  ON public.memberships FOR SELECT
  USING (is_master_admin());

-- Admins can manage memberships (uses SECURITY DEFINER function)
CREATE POLICY "admins_manage_tenant_memberships"
  ON public.memberships FOR ALL
  USING (is_master_admin() OR is_tenant_admin(tenant_id));

-- 5. Drop ALL existing tenants policies
DROP POLICY IF EXISTS "users_view_own_tenants" ON public.tenants;
DROP POLICY IF EXISTS "master_admin_manage_all_tenants" ON public.tenants;

-- 6. Create new tenants policies (using SECURITY DEFINER functions)
-- Users can view tenants where they have membership
CREATE POLICY "users_view_own_tenants"
  ON public.tenants FOR SELECT
  USING (id IN (SELECT get_user_tenant_ids()));

-- Master admin can manage ALL tenants
CREATE POLICY "master_admin_manage_all_tenants"
  ON public.tenants FOR ALL
  USING (is_master_admin());