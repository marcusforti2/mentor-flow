
-- 1. Policy para mentorados verem arquivos via owner_membership_id
CREATE POLICY "mentorado_files_mentee_own_membership"
ON public.mentorado_files FOR SELECT
USING (
  owner_membership_id IS NOT NULL
  AND owner_membership_id IN (
    SELECT id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- 2. Storage: policy para mentorado ver arquivos na pasta do membership_id
CREATE POLICY "Mentorados can view files by membership folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mentorado-files'
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND id::text = (storage.foldername(name))[1]
  )
);
