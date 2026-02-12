
-- Add optional membership_id to support per-mentee pipeline customization
ALTER TABLE public.crm_pipeline_stages 
ADD COLUMN membership_id UUID REFERENCES public.memberships(id) ON DELETE CASCADE;

-- Index for per-mentee lookup
CREATE INDEX idx_crm_pipeline_stages_membership ON public.crm_pipeline_stages(membership_id, position);

-- Update RLS: mentees can also see their own individual stages
DROP POLICY IF EXISTS "Mentees can view pipeline stages" ON public.crm_pipeline_stages;
CREATE POLICY "Members can view pipeline stages"
ON public.crm_pipeline_stages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND tenant_id = crm_pipeline_stages.tenant_id
      AND status = 'active'
  )
);
