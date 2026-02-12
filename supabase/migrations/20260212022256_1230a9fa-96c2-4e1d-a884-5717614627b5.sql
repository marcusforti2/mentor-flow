
-- Fix: Add master_admin to all trail staff manage policies

-- 1. trails_staff_manage
DROP POLICY IF EXISTS "trails_staff_manage" ON public.trails;
CREATE POLICY "trails_staff_manage" ON public.trails FOR ALL
USING (
  tenant_id IN (
    SELECT m.tenant_id FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
      AND m.status = 'active'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT m.tenant_id FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
      AND m.status = 'active'
  )
);

-- 2. trail_modules_staff_manage
DROP POLICY IF EXISTS "trail_modules_staff_manage" ON public.trail_modules;
CREATE POLICY "trail_modules_staff_manage" ON public.trail_modules FOR ALL
USING (
  trail_id IN (
    SELECT t.id FROM trails t
    WHERE t.tenant_id IN (
      SELECT m.tenant_id FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
        AND m.status = 'active'
    )
  )
)
WITH CHECK (
  trail_id IN (
    SELECT t.id FROM trails t
    WHERE t.tenant_id IN (
      SELECT m.tenant_id FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
        AND m.status = 'active'
    )
  )
);

-- 3. trail_lessons_staff_manage
DROP POLICY IF EXISTS "trail_lessons_staff_manage" ON public.trail_lessons;
CREATE POLICY "trail_lessons_staff_manage" ON public.trail_lessons FOR ALL
USING (
  module_id IN (
    SELECT tm.id FROM trail_modules tm
    JOIN trails t ON t.id = tm.trail_id
    WHERE t.tenant_id IN (
      SELECT m.tenant_id FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
        AND m.status = 'active'
    )
  )
)
WITH CHECK (
  module_id IN (
    SELECT tm.id FROM trail_modules tm
    JOIN trails t ON t.id = tm.trail_id
    WHERE t.tenant_id IN (
      SELECT m.tenant_id FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
        AND m.status = 'active'
    )
  )
);
