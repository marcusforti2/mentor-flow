
-- Drop old restrictive policies
DROP POLICY IF EXISTS "events_own" ON public.calendar_events;
DROP POLICY IF EXISTS "events_view" ON public.calendar_events;

-- SELECT: tenant members can view events in their tenant
CREATE POLICY "events_select_tenant"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  tenant_id IN (SELECT get_user_tenant_ids())
  OR is_master_admin(auth.uid())
);

-- INSERT: staff (admin, ops, mentor, master_admin) can create events in their tenant
CREATE POLICY "events_insert_staff"
ON public.calendar_events
FOR INSERT
TO authenticated
WITH CHECK (
  is_tenant_staff(auth.uid(), tenant_id)
);

-- UPDATE: staff can update events in their tenant
CREATE POLICY "events_update_staff"
ON public.calendar_events
FOR UPDATE
TO authenticated
USING (
  is_tenant_staff(auth.uid(), tenant_id)
);

-- DELETE: staff can delete events in their tenant
CREATE POLICY "events_delete_staff"
ON public.calendar_events
FOR DELETE
TO authenticated
USING (
  is_tenant_staff(auth.uid(), tenant_id)
);
