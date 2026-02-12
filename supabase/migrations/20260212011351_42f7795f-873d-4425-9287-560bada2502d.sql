
-- Allow mentors/admin/ops to view memberships in their own tenant
CREATE POLICY "staff_view_tenant_memberships"
ON public.memberships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships viewer
    WHERE viewer.user_id = auth.uid()
      AND viewer.tenant_id = memberships.tenant_id
      AND viewer.status = 'active'
      AND viewer.role IN ('admin', 'ops', 'mentor')
  )
);
