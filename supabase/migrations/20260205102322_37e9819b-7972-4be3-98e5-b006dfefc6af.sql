-- Drop both existing versions of the function
DROP FUNCTION IF EXISTS public.get_user_memberships(uuid);
DROP FUNCTION IF EXISTS public.get_user_memberships(uuid, uuid);

-- Create single unified function
CREATE OR REPLACE FUNCTION public.get_user_memberships(
  _user_id uuid,
  _tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  tenant_id uuid, 
  tenant_name text, 
  tenant_slug text, 
  role membership_role, 
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
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
  ORDER BY 
    CASE m.role 
      WHEN 'master_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'ops' THEN 3
      WHEN 'mentor' THEN 4
      WHEN 'mentee' THEN 5
    END;
$$;