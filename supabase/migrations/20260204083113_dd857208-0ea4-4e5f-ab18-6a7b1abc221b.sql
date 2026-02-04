-- Create table for calendar events
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  event_type TEXT DEFAULT 'geral',
  meeting_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Mentors can manage their own events
CREATE POLICY "Mentors can manage their events"
ON public.calendar_events
FOR ALL
USING (
  mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
)
WITH CHECK (
  mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
);

-- Mentorados can view events from their mentor
CREATE POLICY "Mentorados can view mentor events"
ON public.calendar_events
FOR SELECT
USING (
  mentor_id IN (
    SELECT mentor_id FROM public.mentorados WHERE user_id = auth.uid()
  )
);

-- Admin master can view all events
CREATE POLICY "Admin master can view all events"
ON public.calendar_events
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin_master')
);

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();