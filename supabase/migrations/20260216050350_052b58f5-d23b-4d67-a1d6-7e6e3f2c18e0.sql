
-- Create storage bucket for playbook covers
INSERT INTO storage.buckets (id, name, public) VALUES ('playbook-covers', 'playbook-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload covers
CREATE POLICY "Authenticated users can upload playbook covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'playbook-covers');

-- Allow authenticated users to update their covers
CREATE POLICY "Authenticated users can update playbook covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'playbook-covers');

-- Public read access for covers
CREATE POLICY "Public read access for playbook covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'playbook-covers');

-- Allow authenticated users to delete covers
CREATE POLICY "Authenticated users can delete playbook covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'playbook-covers');
