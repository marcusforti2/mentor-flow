
-- Allow staff (admin, ops, mentor, master_admin) to INSERT/UPDATE/DELETE on crm_prospections
-- This is needed for impersonation scenarios where admin manages leads on behalf of mentees
CREATE POLICY "crm_prospections_staff_write"
ON public.crm_prospections
FOR ALL
USING (
  tenant_id IN (
    SELECT m.tenant_id FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
    AND m.status = 'active'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT m.tenant_id FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
    AND m.status = 'active'
  )
);
