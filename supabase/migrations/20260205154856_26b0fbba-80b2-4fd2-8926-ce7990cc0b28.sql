-- Add is_featured column to trails if it doesn't exist
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;