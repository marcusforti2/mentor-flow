
-- Fix crm_prospections staff view to include master_admin
DROP POLICY IF EXISTS "crm_prospections_staff_view" ON public.crm_prospections;
CREATE POLICY "crm_prospections_staff_view" ON public.crm_prospections
FOR SELECT
USING (
  tenant_id IN (
    SELECT memberships.tenant_id
    FROM memberships
    WHERE memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'ops', 'mentor', 'master_admin')
      AND memberships.status = 'active'
  )
);

-- Fix trail_progress: add staff view policy that includes master_admin
DROP POLICY IF EXISTS "Mentors can view all progress" ON public.trail_progress;
CREATE POLICY "trail_progress_staff_view" ON public.trail_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = trail_progress.tenant_id
      AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
      AND m.status = 'active'
  )
);

-- Also add a membership-based read policy for trail_progress (so mentees can see via membership_id)
DROP POLICY IF EXISTS "trail_progress_mentee_own" ON public.trail_progress;
CREATE POLICY "trail_progress_mentee_own" ON public.trail_progress
FOR ALL
USING (
  membership_id IN (
    SELECT memberships.id
    FROM memberships
    WHERE memberships.user_id = auth.uid()
  )
);
