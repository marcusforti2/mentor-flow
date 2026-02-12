
-- Add a dedicated INSERT/UPDATE/DELETE policy for staff on mentorado_files
-- The existing "Mentors can manage files" policy only works with legacy mentor_id
-- We need a staff policy that works with the membership-based architecture

-- Drop and recreate a comprehensive staff policy for all operations
DROP POLICY IF EXISTS "mentorado_files_staff_manage" ON public.mentorado_files;
CREATE POLICY "mentorado_files_staff_manage"
ON public.mentorado_files FOR ALL
USING (public.is_tenant_staff(auth.uid(), tenant_id))
WITH CHECK (public.is_tenant_staff(auth.uid(), tenant_id));
