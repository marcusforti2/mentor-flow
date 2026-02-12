
-- Create pipeline stages table for customizable CRM pipeline
CREATE TABLE public.crm_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status_key TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-slate-500',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Staff (admin, ops, mentor, master_admin) can full CRUD
CREATE POLICY "Staff can manage pipeline stages"
ON public.crm_pipeline_stages
FOR ALL
USING (public.is_tenant_staff(auth.uid(), tenant_id))
WITH CHECK (public.is_tenant_staff(auth.uid(), tenant_id));

-- Mentees can read pipeline stages of their tenant
CREATE POLICY "Mentees can view pipeline stages"
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

-- Index for fast lookup by tenant
CREATE INDEX idx_crm_pipeline_stages_tenant ON public.crm_pipeline_stages(tenant_id, position);
