
-- Drop the ambiguous ALL policy and replace with explicit per-command policies for mentees
DROP POLICY IF EXISTS "prospections_own" ON public.crm_prospections;
DROP POLICY IF EXISTS "prospections_staff" ON public.crm_prospections;
DROP POLICY IF EXISTS "prospections_staff_update" ON public.crm_prospections;
DROP POLICY IF EXISTS "prospections_staff_delete" ON public.crm_prospections;

-- SELECT: users can see their own leads + staff can see all in tenant
CREATE POLICY "prospections_select_own"
ON public.crm_prospections FOR SELECT TO authenticated
USING (
  membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid())
  OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin','ops','mentor','master_admin') AND status = 'active')
);

-- INSERT: users can insert leads with their own membership_id
CREATE POLICY "prospections_insert_own"
ON public.crm_prospections FOR INSERT TO authenticated
WITH CHECK (
  membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

-- UPDATE: users can update their own leads + staff can update any in tenant
CREATE POLICY "prospections_update_own_or_staff"
ON public.crm_prospections FOR UPDATE TO authenticated
USING (
  membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid())
  OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin','ops','mentor','master_admin') AND status = 'active')
)
WITH CHECK (
  membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid())
  OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin','ops','mentor','master_admin') AND status = 'active')
);

-- DELETE: users can delete their own leads + staff can delete in tenant
CREATE POLICY "prospections_delete_own_or_staff"
ON public.crm_prospections FOR DELETE TO authenticated
USING (
  membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid())
  OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin','ops','mentor','master_admin') AND status = 'active')
);
