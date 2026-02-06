-- Add membership_id column to ranking_entries for new architecture
ALTER TABLE public.ranking_entries ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ranking_entries_membership_id ON public.ranking_entries(membership_id);