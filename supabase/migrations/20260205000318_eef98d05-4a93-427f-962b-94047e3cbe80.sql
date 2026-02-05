-- Create storage bucket for mentorado files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mentorado-files', 
  'mentorado-files', 
  false,
  52428800, -- 50MB limit
  ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'video/*']
);

-- Storage policies for mentorado-files bucket
CREATE POLICY "Mentors can upload files for their mentorados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mentorado-files' AND
  EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.user_id = auth.uid()
  )
);

CREATE POLICY "Mentors can view all files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mentorado-files' AND
  EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.user_id = auth.uid()
  )
);

CREATE POLICY "Mentorados can view their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mentorado-files' AND
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.user_id = auth.uid()
    AND (storage.foldername(name))[1] = m.id::text
  )
);

CREATE POLICY "Mentors can delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mentorado-files' AND
  EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.user_id = auth.uid()
  )
);

-- Create table for file metadata
CREATE TABLE public.mentorado_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  
  -- Content type
  file_type TEXT NOT NULL CHECK (file_type IN ('file', 'link', 'note', 'image')),
  
  -- File info (for uploads)
  file_name TEXT,
  file_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  
  -- Link info
  link_url TEXT,
  link_title TEXT,
  
  -- Note info
  note_title TEXT,
  note_content TEXT,
  
  -- Common fields
  description TEXT,
  tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentorado_files ENABLE ROW LEVEL SECURITY;

-- Mentor can CRUD all files for their mentorados
CREATE POLICY "Mentors can manage files for their mentorados"
ON public.mentorado_files FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.id = mentorado_files.mentor_id
    AND m.user_id = auth.uid()
  )
);

-- Mentorados can view their own files
CREATE POLICY "Mentorados can view their files"
ON public.mentorado_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = mentorado_files.mentorado_id
    AND m.user_id = auth.uid()
  )
);

-- Update trigger
CREATE TRIGGER update_mentorado_files_updated_at
BEFORE UPDATE ON public.mentorado_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();