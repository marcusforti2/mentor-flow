
-- Fix RLS: allow staff (including mentors) to view, but only master_admin/admin to manage credentials
DROP POLICY IF EXISTS "Admin can manage own tenant whatsapp config" ON public.tenant_whatsapp_config;
DROP POLICY IF EXISTS "Staff can view own tenant whatsapp config" ON public.tenant_whatsapp_config;
DROP POLICY IF EXISTS "Staff can manage own tenant whatsapp config" ON public.tenant_whatsapp_config;

-- Master admin can manage any tenant config
CREATE POLICY "Master admin can manage all whatsapp config"
ON public.tenant_whatsapp_config
FOR ALL
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

-- Tenant admin can manage their own config
CREATE POLICY "Tenant admin can manage own whatsapp config"
ON public.tenant_whatsapp_config
FOR ALL
USING (is_tenant_admin(tenant_id, auth.uid()))
WITH CHECK (is_tenant_admin(tenant_id, auth.uid()));

-- Staff can view (read-only) their tenant config
CREATE POLICY "Staff can view own tenant whatsapp config"
ON public.tenant_whatsapp_config
FOR SELECT
USING (is_tenant_staff(auth.uid(), tenant_id));
