
-- Fix tenants RLS: drop old policies and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "master_admin_manage_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "users_view_own_tenants" ON public.tenants;

-- Master admins can do everything on tenants (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "master_admin_full_access_tenants"
ON public.tenants
FOR ALL
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- Users can view tenants they belong to
CREATE POLICY "users_view_own_tenants"
ON public.tenants
FOR SELECT
USING (id IN (SELECT public.get_user_tenant_ids()));

-- Tenant admins can update their own tenant
CREATE POLICY "tenant_admins_update_own_tenant"
ON public.tenants
FOR UPDATE
USING (public.is_tenant_admin(id))
WITH CHECK (public.is_tenant_admin(id));
