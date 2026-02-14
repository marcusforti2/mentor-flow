
-- Layer 2: Add membership_id to secondary/inactive tables
-- Strategy: add nullable membership_id column, keep legacy columns for now

-- 1. certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 2. behavioral_reports
ALTER TABLE public.behavioral_reports
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 3. call_transcripts
ALTER TABLE public.call_transcripts
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 4. email_logs — rename recipient to be clearer
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS recipient_membership_id UUID REFERENCES public.memberships(id);

-- 5. email_flow_executions
ALTER TABLE public.email_flow_executions
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 6. meeting_attendees
ALTER TABLE public.meeting_attendees
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 7. badges (mentor_id → owner_membership_id)
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS owner_membership_id UUID REFERENCES public.memberships(id);

-- 8. behavioral_questions (mentor_id → owner_membership_id)  
ALTER TABLE public.behavioral_questions
  ADD COLUMN IF NOT EXISTS owner_membership_id UUID REFERENCES public.memberships(id);

-- 9. calendar_events (mentor_id → owner)
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS owner_membership_id UUID REFERENCES public.memberships(id);

-- 10. email_automations
ALTER TABLE public.email_automations
  ADD COLUMN IF NOT EXISTS owner_membership_id UUID REFERENCES public.memberships(id);

-- 11. email_flows (already has tenant_id, add owner)
ALTER TABLE public.email_flows
  ADD COLUMN IF NOT EXISTS owner_membership_id UUID REFERENCES public.memberships(id);

-- 12. email_templates
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS owner_membership_id UUID REFERENCES public.memberships(id);

-- 13. meetings
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS owner_membership_id UUID REFERENCES public.memberships(id);

-- Backfill: For tables that have mentorado_id, try to populate membership_id
-- from mentorados.user_id → memberships.user_id (same tenant)
-- This is a best-effort backfill for existing data

-- Backfill certificates
UPDATE public.certificates c
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE c.mentorado_id = mt.id AND c.membership_id IS NULL;

-- Backfill behavioral_reports
UPDATE public.behavioral_reports br
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE br.mentorado_id = mt.id AND br.membership_id IS NULL;

-- Backfill call_transcripts
UPDATE public.call_transcripts ct
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE ct.mentorado_id = mt.id AND ct.membership_id IS NULL;

-- Backfill meeting_attendees
UPDATE public.meeting_attendees ma
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE ma.mentorado_id = mt.id AND ma.membership_id IS NULL;

-- Backfill mentor-owned tables from mentors.user_id → memberships
UPDATE public.badges b
SET owner_membership_id = m.id
FROM public.mentors mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role IN ('admin', 'mentor') AND m.status = 'active'
WHERE b.mentor_id = mt.id AND b.owner_membership_id IS NULL;

UPDATE public.calendar_events ce
SET owner_membership_id = m.id
FROM public.mentors mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role IN ('admin', 'mentor') AND m.status = 'active'
WHERE ce.mentor_id = mt.id AND ce.owner_membership_id IS NULL;

UPDATE public.meetings mt2
SET owner_membership_id = m.id
FROM public.mentors mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role IN ('admin', 'mentor') AND m.status = 'active'
WHERE mt2.mentor_id = mt.id AND mt2.owner_membership_id IS NULL;

UPDATE public.email_templates et
SET owner_membership_id = m.id
FROM public.mentors mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role IN ('admin', 'mentor') AND m.status = 'active'
WHERE et.mentor_id = mt.id AND et.owner_membership_id IS NULL;

UPDATE public.email_flows ef
SET owner_membership_id = m.id
FROM public.mentors mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role IN ('admin', 'mentor') AND m.status = 'active'
WHERE ef.mentor_id = mt.id AND ef.owner_membership_id IS NULL;

UPDATE public.email_automations ea
SET owner_membership_id = m.id
FROM public.mentors mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role IN ('admin', 'mentor') AND m.status = 'active'
WHERE ea.mentor_id = mt.id AND ea.owner_membership_id IS NULL;

UPDATE public.behavioral_questions bq
SET owner_membership_id = m.id
FROM public.mentors mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role IN ('admin', 'mentor') AND m.status = 'active'
WHERE bq.mentor_id = mt.id AND bq.owner_membership_id IS NULL;
