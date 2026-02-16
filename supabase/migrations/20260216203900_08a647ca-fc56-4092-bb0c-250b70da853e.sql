
-- Table to schedule event email reminders
CREATE TABLE public.event_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  remind_before interval NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_reminders" ON public.event_reminders FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE INDEX idx_event_reminders_scheduled ON public.event_reminders(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_event_reminders_event ON public.event_reminders(event_id);
