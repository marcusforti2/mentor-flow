
-- 1. Tornar FKs legadas nullable
ALTER TABLE public.mentorado_files ALTER COLUMN mentor_id DROP NOT NULL;
ALTER TABLE public.mentorado_files ALTER COLUMN mentorado_id DROP NOT NULL;

-- 2. Storage: policy de upload para staff
CREATE POLICY "Staff can upload mentorado files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mentorado-files'
  AND is_tenant_staff(auth.uid(), (
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
  ))
);

-- 3. Storage: policy de leitura para staff
CREATE POLICY "Staff can view mentorado files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mentorado-files'
  AND is_tenant_staff(auth.uid(), (
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
  ))
);

-- 4. Storage: policy de delete para staff
CREATE POLICY "Staff can delete mentorado files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mentorado-files'
  AND is_tenant_staff(auth.uid(), (
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
  ))
);
