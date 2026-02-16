-- Allow staff (mentor, ops, admin) to update membership status to 'suspended' for mentees in same tenant
CREATE POLICY "staff_can_suspend_mentee"
ON public.memberships
FOR UPDATE
USING (
  is_tenant_staff(auth.uid(), tenant_id)
  AND role = 'mentee'
)
WITH CHECK (
  is_tenant_staff(auth.uid(), tenant_id)
  AND role = 'mentee'
  AND status IN ('active', 'suspended')
);