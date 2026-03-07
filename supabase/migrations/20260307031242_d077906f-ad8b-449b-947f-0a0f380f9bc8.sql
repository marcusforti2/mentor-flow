
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE public.trail_modules ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE public.trail_lessons ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
