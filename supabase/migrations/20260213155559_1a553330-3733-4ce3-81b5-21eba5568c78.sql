
-- Create table for behavioral analyses of mentees
CREATE TABLE public.mentee_behavioral_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES public.memberships(id),
  social_data_source TEXT DEFAULT 'none',
  behavioral_profile JSONB,
  hidden_fears JSONB,
  emotional_patterns JSONB,
  execution_blockers JSONB,
  potentiation_strategy JSONB,
  ideal_language JSONB,
  mentor_mistakes JSONB,
  how_to_succeed JSONB,
  motivation_triggers JSONB,
  alert_signals JSONB,
  full_report TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentee_behavioral_analyses ENABLE ROW LEVEL SECURITY;

-- Staff can read all analyses in their tenant
CREATE POLICY "Staff can read tenant analyses"
ON public.mentee_behavioral_analyses
FOR SELECT
USING (public.is_tenant_staff(auth.uid(), tenant_id));

-- Staff can create analyses in their tenant
CREATE POLICY "Staff can create tenant analyses"
ON public.mentee_behavioral_analyses
FOR INSERT
WITH CHECK (public.is_tenant_staff(auth.uid(), tenant_id));

-- Mentee can read their own analyses
CREATE POLICY "Mentee can read own analyses"
ON public.mentee_behavioral_analyses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = mentee_behavioral_analyses.membership_id
    AND user_id = auth.uid()
  )
);

-- Index for fast lookups
CREATE INDEX idx_mentee_behavioral_analyses_membership ON public.mentee_behavioral_analyses(membership_id);
CREATE INDEX idx_mentee_behavioral_analyses_tenant ON public.mentee_behavioral_analyses(tenant_id);
