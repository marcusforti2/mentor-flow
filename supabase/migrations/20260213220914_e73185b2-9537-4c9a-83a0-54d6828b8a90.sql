
-- Table for journeys (parent of stages)
CREATE TABLE public.cs_journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Jornada CS',
  total_days INT NOT NULL DEFAULT 365,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add journey_id to existing stages table
ALTER TABLE public.cs_journey_stages 
  ADD COLUMN journey_id UUID REFERENCES public.cs_journeys(id) ON DELETE CASCADE;

-- Junction table: mentees can be in multiple journeys
CREATE TABLE public.mentee_journey_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.cs_journeys(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(membership_id, journey_id)
);

-- Enable RLS
ALTER TABLE public.cs_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentee_journey_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for cs_journeys
CREATE POLICY "Staff can view journeys" ON public.cs_journeys
  FOR SELECT USING (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can insert journeys" ON public.cs_journeys
  FOR INSERT WITH CHECK (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can update journeys" ON public.cs_journeys
  FOR UPDATE USING (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can delete journeys" ON public.cs_journeys
  FOR DELETE USING (public.is_tenant_staff(auth.uid(), tenant_id));

-- Mentees can see their own assignments
CREATE POLICY "Mentees can view own assignments" ON public.mentee_journey_assignments
  FOR SELECT USING (
    membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
    OR public.is_tenant_staff(auth.uid(), tenant_id)
  );

CREATE POLICY "Staff can manage assignments" ON public.mentee_journey_assignments
  FOR INSERT WITH CHECK (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can update assignments" ON public.mentee_journey_assignments
  FOR UPDATE USING (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can delete assignments" ON public.mentee_journey_assignments
  FOR DELETE USING (public.is_tenant_staff(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_cs_journeys_updated_at
  BEFORE UPDATE ON public.cs_journeys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing stages: create a default journey per tenant that has stages
INSERT INTO public.cs_journeys (tenant_id, name, is_default)
SELECT DISTINCT tenant_id, 'Jornada CS', true
FROM public.cs_journey_stages;

-- Link existing stages to the newly created default journey
UPDATE public.cs_journey_stages s
SET journey_id = j.id
FROM public.cs_journeys j
WHERE j.tenant_id = s.tenant_id AND j.is_default = true;
