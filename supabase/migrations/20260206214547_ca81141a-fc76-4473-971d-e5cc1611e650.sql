
-- Allow admins and mentors in the same tenant to read mentor records
CREATE POLICY "Admins can view mentors in their tenant"
ON public.mentors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memberships m1
    JOIN memberships m2 ON m1.tenant_id = m2.tenant_id
    WHERE m1.user_id = auth.uid()
    AND m1.role IN ('admin', 'mentor')
    AND m1.status = 'active'
    AND m2.user_id = mentors.user_id
    AND m2.status = 'active'
  )
);
