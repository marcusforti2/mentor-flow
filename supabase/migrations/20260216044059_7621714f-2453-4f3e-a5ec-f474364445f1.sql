-- Add public_slug for shareable links
ALTER TABLE public.playbooks ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_playbooks_public_slug ON public.playbooks(public_slug) WHERE public_slug IS NOT NULL;

-- Allow anonymous read for public playbooks via slug
CREATE POLICY "Anyone can view public playbooks by slug"
ON public.playbooks
FOR SELECT
USING (visibility = 'public' AND public_slug IS NOT NULL);
