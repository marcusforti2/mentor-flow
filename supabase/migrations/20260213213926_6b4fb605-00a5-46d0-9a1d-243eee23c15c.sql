
CREATE TABLE public.cs_journey_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  day_start INTEGER NOT NULL DEFAULT 0,
  day_end INTEGER NOT NULL DEFAULT 7,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint per tenant + stage_key
CREATE UNIQUE INDEX idx_cs_journey_stages_tenant_key ON public.cs_journey_stages(tenant_id, stage_key);

-- Index for ordering
CREATE INDEX idx_cs_journey_stages_position ON public.cs_journey_stages(tenant_id, position);

-- Enable RLS
ALTER TABLE public.cs_journey_stages ENABLE ROW LEVEL SECURITY;

-- Read: members of the tenant
CREATE POLICY "Members can view journey stages"
ON public.cs_journey_stages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.tenant_id = cs_journey_stages.tenant_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
  )
);

-- Insert: staff only (admin, mentor, ops)
CREATE POLICY "Staff can create journey stages"
ON public.cs_journey_stages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.tenant_id = cs_journey_stages.tenant_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
    AND memberships.role IN ('admin', 'mentor', 'ops')
  )
);

-- Update: staff only
CREATE POLICY "Staff can update journey stages"
ON public.cs_journey_stages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.tenant_id = cs_journey_stages.tenant_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
    AND memberships.role IN ('admin', 'mentor', 'ops')
  )
);

-- Delete: staff only
CREATE POLICY "Staff can delete journey stages"
ON public.cs_journey_stages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.tenant_id = cs_journey_stages.tenant_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
    AND memberships.role IN ('admin', 'mentor', 'ops')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_cs_journey_stages_updated_at
BEFORE UPDATE ON public.cs_journey_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
