-- Fix: Allow staff (mentors) to update tenant automations, not just admins
DROP POLICY "Admin can update tenant automations" ON public.tenant_automations;
CREATE POLICY "Staff can update tenant automations"
  ON public.tenant_automations
  FOR UPDATE
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));