
-- 1. Storage bucket para capas de trilhas
INSERT INTO storage.buckets (id, name, public) VALUES ('trail-covers', 'trail-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies para trail-covers
CREATE POLICY "Anyone can view trail covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'trail-covers');

CREATE POLICY "Staff can upload trail covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trail-covers'
  AND is_tenant_staff(auth.uid(), (
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
  ))
);

CREATE POLICY "Staff can delete trail covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trail-covers'
  AND is_tenant_staff(auth.uid(), (
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
  ))
);

-- 2. Fix INSERT/UPDATE/DELETE policies for trail_modules (staff)
CREATE POLICY "trail_modules_staff_manage"
ON public.trail_modules FOR ALL
USING (
  trail_id IN (
    SELECT t.id FROM public.trails t
    WHERE t.tenant_id IN (
      SELECT tenant_id FROM public.memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor') AND status = 'active'
    )
  )
)
WITH CHECK (
  trail_id IN (
    SELECT t.id FROM public.trails t
    WHERE t.tenant_id IN (
      SELECT tenant_id FROM public.memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor') AND status = 'active'
    )
  )
);

-- 3. Fix INSERT/UPDATE/DELETE policies for trail_lessons (staff)
CREATE POLICY "trail_lessons_staff_manage"
ON public.trail_lessons FOR ALL
USING (
  module_id IN (
    SELECT tm.id FROM public.trail_modules tm
    JOIN public.trails t ON t.id = tm.trail_id
    WHERE t.tenant_id IN (
      SELECT tenant_id FROM public.memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor') AND status = 'active'
    )
  )
)
WITH CHECK (
  module_id IN (
    SELECT tm.id FROM public.trail_modules tm
    JOIN public.trails t ON t.id = tm.trail_id
    WHERE t.tenant_id IN (
      SELECT tenant_id FROM public.memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor') AND status = 'active'
    )
  )
);

-- 4. Mentorado view policy for trails by tenant (mentee role via memberships)
CREATE POLICY "trails_mentee_tenant_view"
ON public.trails FOR SELECT
USING (
  is_published = true
  AND tenant_id IN (
    SELECT tenant_id FROM public.memberships
    WHERE user_id = auth.uid() AND role = 'mentee' AND status = 'active'
  )
);

-- 5. Mentee view for modules by tenant
CREATE POLICY "trail_modules_mentee_view"
ON public.trail_modules FOR SELECT
USING (
  trail_id IN (
    SELECT id FROM public.trails
    WHERE is_published = true
    AND tenant_id IN (
      SELECT tenant_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'mentee' AND status = 'active'
    )
  )
);

-- 6. Mentee view for lessons by tenant  
CREATE POLICY "trail_lessons_mentee_view"
ON public.trail_lessons FOR SELECT
USING (
  module_id IN (
    SELECT tm.id FROM public.trail_modules tm
    JOIN public.trails t ON t.id = tm.trail_id
    WHERE t.is_published = true
    AND t.tenant_id IN (
      SELECT tenant_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'mentee' AND status = 'active'
    )
  )
);
