
-- =============================================
-- 1) program_investments
-- =============================================
CREATE TABLE public.program_investments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  investment_amount_cents integer NOT NULL,
  start_date date,
  onboarding_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own member select program_investments"
  ON public.program_investments FOR SELECT
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff select program_investments"
  ON public.program_investments FOR SELECT
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member insert program_investments"
  ON public.program_investments FOR INSERT
  WITH CHECK (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff insert program_investments"
  ON public.program_investments FOR INSERT
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member update program_investments"
  ON public.program_investments FOR UPDATE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff update program_investments"
  ON public.program_investments FOR UPDATE
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member delete program_investments"
  ON public.program_investments FOR DELETE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff delete program_investments"
  ON public.program_investments FOR DELETE
  USING (is_tenant_staff(auth.uid(), tenant_id));

-- =============================================
-- 2) mentee_deals
-- =============================================
CREATE TABLE public.mentee_deals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'lead',
  value_cents integer NOT NULL DEFAULT 0,
  source text,
  deal_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  lost_reason text
);

ALTER TABLE public.mentee_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own member select mentee_deals"
  ON public.mentee_deals FOR SELECT
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff select mentee_deals"
  ON public.mentee_deals FOR SELECT
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member insert mentee_deals"
  ON public.mentee_deals FOR INSERT
  WITH CHECK (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff insert mentee_deals"
  ON public.mentee_deals FOR INSERT
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member update mentee_deals"
  ON public.mentee_deals FOR UPDATE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff update mentee_deals"
  ON public.mentee_deals FOR UPDATE
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member delete mentee_deals"
  ON public.mentee_deals FOR DELETE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff delete mentee_deals"
  ON public.mentee_deals FOR DELETE
  USING (is_tenant_staff(auth.uid(), tenant_id));

-- =============================================
-- 3) mentee_activities
-- =============================================
CREATE TABLE public.mentee_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  activity_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentee_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own member select mentee_activities"
  ON public.mentee_activities FOR SELECT
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff select mentee_activities"
  ON public.mentee_activities FOR SELECT
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member insert mentee_activities"
  ON public.mentee_activities FOR INSERT
  WITH CHECK (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff insert mentee_activities"
  ON public.mentee_activities FOR INSERT
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member update mentee_activities"
  ON public.mentee_activities FOR UPDATE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff update mentee_activities"
  ON public.mentee_activities FOR UPDATE
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member delete mentee_activities"
  ON public.mentee_activities FOR DELETE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff delete mentee_activities"
  ON public.mentee_activities FOR DELETE
  USING (is_tenant_staff(auth.uid(), tenant_id));

-- =============================================
-- 4) mentee_payments
-- =============================================
CREATE TABLE public.mentee_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  description text,
  due_date date,
  paid_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own member select mentee_payments"
  ON public.mentee_payments FOR SELECT
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff select mentee_payments"
  ON public.mentee_payments FOR SELECT
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member insert mentee_payments"
  ON public.mentee_payments FOR INSERT
  WITH CHECK (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff insert mentee_payments"
  ON public.mentee_payments FOR INSERT
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member update mentee_payments"
  ON public.mentee_payments FOR UPDATE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff update mentee_payments"
  ON public.mentee_payments FOR UPDATE
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member delete mentee_payments"
  ON public.mentee_payments FOR DELETE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff delete mentee_payments"
  ON public.mentee_payments FOR DELETE
  USING (is_tenant_staff(auth.uid(), tenant_id));

-- =============================================
-- 5) metrics_snapshots
-- =============================================
CREATE TABLE public.metrics_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start date,
  period_end date,
  revenue_closed_cents integer,
  revenue_received_cents integer,
  deals_won_count integer,
  meetings_held_count integer,
  roi_ratio numeric,
  payback_months numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metrics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own member select metrics_snapshots"
  ON public.metrics_snapshots FOR SELECT
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff select metrics_snapshots"
  ON public.metrics_snapshots FOR SELECT
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member insert metrics_snapshots"
  ON public.metrics_snapshots FOR INSERT
  WITH CHECK (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff insert metrics_snapshots"
  ON public.metrics_snapshots FOR INSERT
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member update metrics_snapshots"
  ON public.metrics_snapshots FOR UPDATE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff update metrics_snapshots"
  ON public.metrics_snapshots FOR UPDATE
  USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Own member delete metrics_snapshots"
  ON public.metrics_snapshots FOR DELETE
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Staff delete metrics_snapshots"
  ON public.metrics_snapshots FOR DELETE
  USING (is_tenant_staff(auth.uid(), tenant_id));

-- Indexes for performance
CREATE INDEX idx_mentee_deals_membership ON public.mentee_deals(membership_id);
CREATE INDEX idx_mentee_deals_closed_at ON public.mentee_deals(closed_at);
CREATE INDEX idx_mentee_activities_membership ON public.mentee_activities(membership_id);
CREATE INDEX idx_mentee_activities_date ON public.mentee_activities(activity_date);
CREATE INDEX idx_mentee_payments_membership ON public.mentee_payments(membership_id);
CREATE INDEX idx_mentee_payments_paid_at ON public.mentee_payments(paid_at);
CREATE INDEX idx_program_investments_membership ON public.program_investments(membership_id);
