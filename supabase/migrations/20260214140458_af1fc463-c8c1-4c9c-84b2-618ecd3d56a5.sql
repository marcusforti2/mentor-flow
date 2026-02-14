-- Fix RLS policy on system_fingerprints to use memberships instead of legacy user_roles
DROP POLICY IF EXISTS "Admin master can view fingerprints" ON public.system_fingerprints;

CREATE POLICY "Admin master can view fingerprints"
ON public.system_fingerprints
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.user_id = auth.uid()
    AND memberships.role = 'master_admin'
    AND memberships.status = 'active'
  )
);

-- Now safe to drop the legacy user_roles table
DROP TABLE IF EXISTS public.user_roles;