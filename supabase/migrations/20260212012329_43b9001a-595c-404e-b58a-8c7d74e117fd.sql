
-- Drop the recursive policy
DROP POLICY IF EXISTS "staff_view_tenant_memberships" ON public.memberships;

-- Create a security definer function to check if user is staff in a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_staff(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND status = 'active'
      AND role IN ('admin', 'ops', 'mentor', 'master_admin')
  );
$$;

-- Recreate policy using the function
CREATE POLICY "staff_view_tenant_memberships"
ON public.memberships
FOR SELECT
USING (
  public.is_tenant_staff(auth.uid(), tenant_id)
);
