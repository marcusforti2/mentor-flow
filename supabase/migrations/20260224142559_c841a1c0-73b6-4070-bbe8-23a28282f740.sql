ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS facilitator_name text;