
-- 1. Create a masked view for safe reading
CREATE OR REPLACE VIEW public.whatsapp_config_safe AS
SELECT
  id,
  tenant_id,
  ultramsg_instance_id,
  CASE
    WHEN ultramsg_token IS NOT NULL AND length(ultramsg_token) > 4
      THEN '••••••••' || right(ultramsg_token, 4)
    WHEN ultramsg_token IS NOT NULL
      THEN '••••'
    ELSE NULL
  END AS ultramsg_token_masked,
  is_active,
  sender_name,
  created_at
FROM public.tenant_whatsapp_config;

-- 2. Drop old permissive SELECT policies for non-master roles
DROP POLICY IF EXISTS "Staff can read whatsapp config" ON public.tenant_whatsapp_config;

-- 3. Keep master_admin full access (already exists as ALL policy, recreate cleanly)
DROP POLICY IF EXISTS "Master admin full access whatsapp config" ON public.tenant_whatsapp_config;
CREATE POLICY "Master admin full access whatsapp config"
  ON public.tenant_whatsapp_config
  FOR ALL
  TO authenticated
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

-- 4. Grant SELECT on the masked view to authenticated users
GRANT SELECT ON public.whatsapp_config_safe TO authenticated;
