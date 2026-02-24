
-- Add column to track who uploaded the file (mentor or mentee)
ALTER TABLE public.mentorado_files 
ADD COLUMN IF NOT EXISTS uploaded_by_membership_id UUID REFERENCES public.memberships(id);

-- Update existing records: assume all existing files were uploaded by staff (no uploaded_by = legacy/staff)
-- New uploads will always set this column

-- Allow mentees to INSERT files for themselves
CREATE POLICY "mentee_insert_own_files"
ON public.mentorado_files
FOR INSERT
TO authenticated
WITH CHECK (
  owner_membership_id IN (
    SELECT id FROM public.memberships 
    WHERE user_id = auth.uid() AND role = 'mentee' AND status = 'active'
  )
  AND uploaded_by_membership_id IN (
    SELECT id FROM public.memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Allow mentees to DELETE their own uploaded files only
CREATE POLICY "mentee_delete_own_uploads"
ON public.mentorado_files
FOR DELETE
TO authenticated
USING (
  uploaded_by_membership_id IN (
    SELECT id FROM public.memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  AND owner_membership_id IN (
    SELECT id FROM public.memberships 
    WHERE user_id = auth.uid() AND role = 'mentee' AND status = 'active'
  )
);

-- Storage: allow mentees to upload to their own folder in mentorado-files bucket
CREATE POLICY "mentee_upload_own_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mentorado-files'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.memberships 
    WHERE user_id = auth.uid() AND role = 'mentee' AND status = 'active'
  )
);

-- Storage: allow mentees to read their own files
CREATE POLICY "mentee_read_own_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mentorado-files'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
