
-- Add audience columns to calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS audience_type text NOT NULL DEFAULT 'all_mentees',
  ADD COLUMN IF NOT EXISTS audience_membership_ids uuid[] DEFAULT '{}';

-- Add check constraint for valid audience types
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_audience_type_check
  CHECK (audience_type IN ('all_mentees', 'specific', 'staff_only'));

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_calendar_events_audience ON public.calendar_events(audience_type);
