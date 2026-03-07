
CREATE TABLE public.event_mentee_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  mentee_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  reminder_type TEXT DEFAULT 'both',
  hours_before INTEGER NOT NULL DEFAULT 24,
  interval_key TEXT NOT NULL DEFAULT '24h',
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  whatsapp_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_mentee_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage reminders" ON public.event_mentee_reminders FOR ALL TO authenticated USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Mentee can view own reminders" ON public.event_mentee_reminders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships m WHERE m.id = mentee_membership_id AND m.user_id = auth.uid()));

CREATE INDEX idx_event_mentee_reminders_status ON public.event_mentee_reminders(status, scheduled_at);
CREATE INDEX idx_event_mentee_reminders_event ON public.event_mentee_reminders(event_id);
