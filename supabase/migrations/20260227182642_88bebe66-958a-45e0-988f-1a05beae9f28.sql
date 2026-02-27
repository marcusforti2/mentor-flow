
CREATE TABLE public.crm_stage_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  from_stage_key TEXT NOT NULL,
  to_stage_key TEXT NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_stage_automations ENABLE ROW LEVEL SECURITY;

-- Mentee can manage their own automations
CREATE POLICY "Users can manage own automations"
  ON public.crm_stage_automations
  FOR ALL
  TO authenticated
  USING (
    membership_id IN (
      SELECT id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    membership_id IN (
      SELECT id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Staff can view automations in their tenant
CREATE POLICY "Staff can view tenant automations"
  ON public.crm_stage_automations
  FOR SELECT
  TO authenticated
  USING (
    is_tenant_staff(auth.uid(), tenant_id)
  );
