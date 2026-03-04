
-- Forms system: dedicated tables
CREATE TABLE public.tenant_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Novo Formulário',
  description TEXT,
  form_type TEXT NOT NULL DEFAULT 'custom', -- 'onboarding' | 'custom'
  slug TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  journey_stage_id UUID REFERENCES public.cs_journey_stages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug),
  UNIQUE(tenant_id, form_type) -- only 1 onboarding form per tenant (partial via trigger)
);

-- Remove the unique constraint on form_type since custom forms can be many
ALTER TABLE public.tenant_forms DROP CONSTRAINT tenant_forms_tenant_id_form_type_key;
-- Add partial unique for onboarding only
CREATE UNIQUE INDEX idx_one_onboarding_per_tenant ON public.tenant_forms (tenant_id) WHERE form_type = 'onboarding';

CREATE TABLE public.form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.tenant_forms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text', -- text, textarea, select, multiple_choice, yes_no, scale, link, image, system_field
  system_field_key TEXT, -- full_name, email, phone, etc (only for system_field type)
  options JSONB DEFAULT '[]',
  is_required BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL DEFAULT 0,
  section TEXT DEFAULT 'custom', -- basic, business, custom
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.tenant_forms(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  respondent_name TEXT,
  respondent_email TEXT,
  answers JSONB NOT NULL DEFAULT '{}', -- { question_id: answer_value }
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.tenant_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- tenant_forms: staff can manage, public can read active forms
CREATE POLICY "staff_manage_forms" ON public.tenant_forms FOR ALL TO authenticated
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "public_read_active_forms" ON public.tenant_forms FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "authenticated_read_active_forms" ON public.tenant_forms FOR SELECT TO authenticated
  USING (is_active = true);

-- form_questions: anyone can read (for public form), staff can manage
CREATE POLICY "anyone_read_questions" ON public.form_questions FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "staff_manage_questions" ON public.form_questions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_forms tf 
    WHERE tf.id = form_id AND is_tenant_staff(auth.uid(), tf.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_forms tf 
    WHERE tf.id = form_id AND is_tenant_staff(auth.uid(), tf.tenant_id)
  ));

-- form_submissions: staff can read all for their tenant, anyone can insert
CREATE POLICY "staff_read_submissions" ON public.form_submissions FOR SELECT TO authenticated
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "anyone_insert_submission" ON public.form_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenant_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
