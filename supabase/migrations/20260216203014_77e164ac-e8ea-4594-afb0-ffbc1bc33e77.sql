
-- Add tenant_id to behavioral_questions for cross-mentor visibility
ALTER TABLE public.behavioral_questions 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Backfill tenant_id from owner_membership_id -> memberships -> tenant_id
UPDATE public.behavioral_questions bq
SET tenant_id = m.tenant_id
FROM public.memberships m
WHERE bq.owner_membership_id = m.id
AND bq.tenant_id IS NULL;

-- Create index for tenant-level queries
CREATE INDEX IF NOT EXISTS idx_behavioral_questions_tenant_id ON public.behavioral_questions(tenant_id);
