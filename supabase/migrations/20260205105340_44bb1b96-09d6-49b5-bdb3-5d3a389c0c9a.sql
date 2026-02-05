-- ===========================================
-- FIX: Infinite Recursion in RLS Policies
-- ===========================================

-- 1. Create SECURITY DEFINER function to bypass RLS
-- This is the KEY to breaking the recursion cycle
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
    AND role = 'master_admin'
    AND status = 'active'
  )
$$;

-- 2. Drop problematic memberships policies
DROP POLICY IF EXISTS "Users can view memberships in their tenant" ON public.memberships;
DROP POLICY IF EXISTS "master_admin_read_all_memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.memberships;

-- 3. Create new memberships policies (non-recursive)
-- Policy: Users can view their own memberships
CREATE POLICY "users_view_own_memberships"
  ON public.memberships FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Master admin can view ALL memberships (uses SECURITY DEFINER function)
CREATE POLICY "master_admin_view_all_memberships"
  ON public.memberships FOR SELECT
  USING (is_master_admin());

-- Policy: Admins can manage memberships in their tenant
CREATE POLICY "admins_manage_tenant_memberships"
  ON public.memberships FOR ALL
  USING (is_master_admin() OR (
    tenant_id IN (
      SELECT m.tenant_id FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.role = 'admin'
      AND m.status = 'active'
    )
  ));

-- 4. Drop problematic tenants policies
DROP POLICY IF EXISTS "Users can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "master_admin_read_all_tenants" ON public.tenants;

-- 5. Create new tenants policies (non-recursive)
-- Policy: Users can view tenants where they have membership
CREATE POLICY "users_view_own_tenants"
  ON public.tenants FOR SELECT
  USING (
    id IN (SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid())
  );

-- Policy: Master admin can manage ALL tenants
CREATE POLICY "master_admin_manage_all_tenants"
  ON public.tenants FOR ALL
  USING (is_master_admin());