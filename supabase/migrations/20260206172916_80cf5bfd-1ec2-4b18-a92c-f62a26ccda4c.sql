
-- Add pitch_context column to store raw product/pitch text for AI lead analysis
ALTER TABLE public.mentorado_business_profiles
ADD COLUMN IF NOT EXISTS pitch_context text;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.mentorado_business_profiles.pitch_context IS 'Raw product pitch/description text used as context for AI lead analysis via Piloterr';
