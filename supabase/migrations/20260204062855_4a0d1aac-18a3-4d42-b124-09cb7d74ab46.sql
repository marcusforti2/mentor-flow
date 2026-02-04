-- Add profile_url column to crm_prospections to store the lead's social profile URL
ALTER TABLE public.crm_prospections 
ADD COLUMN IF NOT EXISTS profile_url TEXT;