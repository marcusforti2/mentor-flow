
CREATE TABLE public.google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  calendar_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(membership_id)
);

CREATE TABLE public.google_drive_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  drive_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(membership_id)
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view calendar tokens" ON public.google_calendar_tokens FOR SELECT TO authenticated USING (is_tenant_staff(auth.uid(), tenant_id) OR EXISTS (SELECT 1 FROM memberships m WHERE m.id = membership_id AND m.user_id = auth.uid()));

CREATE POLICY "Own user can insert calendar token" ON public.google_calendar_tokens FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.id = membership_id AND m.user_id = auth.uid()));

CREATE POLICY "Own user can update calendar token" ON public.google_calendar_tokens FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.id = membership_id AND m.user_id = auth.uid()));

CREATE POLICY "Own user can delete calendar token" ON public.google_calendar_tokens FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.id = membership_id AND m.user_id = auth.uid()));

CREATE POLICY "Staff can view drive tokens" ON public.google_drive_tokens FOR SELECT TO authenticated USING (is_tenant_staff(auth.uid(), tenant_id) OR EXISTS (SELECT 1 FROM memberships m WHERE m.id = membership_id AND m.user_id = auth.uid()));

CREATE POLICY "Own user can insert drive token" ON public.google_drive_tokens FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.id = membership_id AND m.user_id = auth.uid()));

CREATE POLICY "Own user can update drive token" ON public.google_drive_tokens FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.id = membership_id AND m.user_id = auth.uid()));

CREATE POLICY "Own user can delete drive token" ON public.google_drive_tokens FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.id = membership_id AND m.user_id = auth.uid()));

CREATE TRIGGER update_google_calendar_tokens_updated_at BEFORE UPDATE ON public.google_calendar_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_drive_tokens_updated_at BEFORE UPDATE ON public.google_drive_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
