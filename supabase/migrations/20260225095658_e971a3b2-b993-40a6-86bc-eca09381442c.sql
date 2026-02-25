-- Drop and recreate events_view policy to support master_admin impersonation
DROP POLICY IF EXISTS "events_view" ON public.calendar_events;

CREATE POLICY "events_view" ON public.calendar_events
  FOR SELECT
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_master_admin(auth.uid())
  );
