
-- Tighten INSERT policy: only staff of the tenant can insert
DROP POLICY "Service can insert alerts" ON public.smart_alerts;
CREATE POLICY "Staff can insert alerts"
ON public.smart_alerts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = smart_alerts.mentor_membership_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('admin', 'mentor', 'ops', 'master_admin')
  )
  OR public.is_master_admin(auth.uid())
);

-- Tighten DELETE policy: only the mentor who owns the alert
DROP POLICY "Service can delete alerts" ON public.smart_alerts;
CREATE POLICY "Owner can delete alerts"
ON public.smart_alerts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = smart_alerts.mentor_membership_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
  OR public.is_master_admin(auth.uid())
);
