
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-backups', 'data-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Only master_admin can access backup files
CREATE POLICY "Master admin can manage backups"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'data-backups' AND public.is_master_admin(auth.uid()))
WITH CHECK (bucket_id = 'data-backups' AND public.is_master_admin(auth.uid()));
