-- Fix: Add WITH CHECK to the staff policy so inserts/updates work
DROP POLICY IF EXISTS "Staff can manage availability" ON public.mentor_availability;
CREATE POLICY "Staff can manage availability"
ON public.mentor_availability
FOR ALL
USING (is_tenant_staff(auth.uid(), tenant_id))
WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));