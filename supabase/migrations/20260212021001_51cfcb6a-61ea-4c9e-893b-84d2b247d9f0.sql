
-- Add content_type and text_content columns to trail_lessons
ALTER TABLE public.trail_lessons 
ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'video';

ALTER TABLE public.trail_lessons 
ADD COLUMN IF NOT EXISTS text_content TEXT;

ALTER TABLE public.trail_lessons 
ADD COLUMN IF NOT EXISTS file_url TEXT;

ALTER TABLE public.trail_lessons 
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Create storage bucket for lesson files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lesson-files', 'lesson-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson-files
CREATE POLICY "lesson_files_staff_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-files' AND
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
    AND role IN ('admin','ops','mentor','master_admin')
    AND status = 'active'
  )
);

CREATE POLICY "lesson_files_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-files');

CREATE POLICY "lesson_files_staff_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lesson-files' AND
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
    AND role IN ('admin','ops','mentor','master_admin')
    AND status = 'active'
  )
);
