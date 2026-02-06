-- Permitir staff (admin, ops, mentor, master_admin) ler trail_lessons
CREATE POLICY "trail_lessons_staff_view"
ON public.trail_lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
    AND m.status = 'active'
  )
);

-- Permitir staff (admin, ops, mentor, master_admin) ler trail_modules
CREATE POLICY "trail_modules_staff_view"
ON public.trail_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin', 'ops', 'mentor', 'master_admin')
    AND m.status = 'active'
  )
);