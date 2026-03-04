-- Allow global master admins to manage mentee showcase profiles
DROP POLICY IF EXISTS "Master admin can manage mentee profiles" ON public.mentee_profiles;

CREATE POLICY "Master admin can manage mentee profiles"
ON public.mentee_profiles
FOR ALL
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());