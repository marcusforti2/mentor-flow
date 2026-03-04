
-- Fix: recreate view with SECURITY INVOKER (default in PG15+, explicit for safety)
DROP VIEW IF EXISTS public.whatsapp_config_safe;

CREATE VIEW public.whatsapp_config_safe
WITH (security_invoker = true)
AS
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

GRANT SELECT ON public.whatsapp_config_safe TO authenticated;

-- Add RLS policy so mentors can read via the view (view uses invoker's permissions)
CREATE POLICY "Staff can read own tenant whatsapp config"
  ON public.tenant_whatsapp_config
  FOR SELECT
  TO authenticated
  USING (public.is_tenant_staff(auth.uid(), tenant_id));
