ALTER TABLE public.mentee_profiles
  ADD COLUMN IF NOT EXISTS showcase_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS showcase_bio TEXT;