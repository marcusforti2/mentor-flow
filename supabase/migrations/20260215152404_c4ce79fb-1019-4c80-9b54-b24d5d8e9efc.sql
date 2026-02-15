
-- Mentor availability slots
CREATE TABLE public.mentor_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Session bookings
CREATE TABLE public.session_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  mentee_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  meeting_url TEXT,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_mentor_availability_mentor ON public.mentor_availability(mentor_membership_id);
CREATE INDEX idx_session_bookings_mentor ON public.session_bookings(mentor_membership_id);
CREATE INDEX idx_session_bookings_mentee ON public.session_bookings(mentee_membership_id);
CREATE INDEX idx_session_bookings_scheduled ON public.session_bookings(scheduled_at) WHERE status = 'confirmed';

-- RLS
ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_bookings ENABLE ROW LEVEL SECURITY;

-- Availability: staff can manage, mentees can view
CREATE POLICY "Staff can manage availability"
  ON public.mentor_availability FOR ALL
  USING (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Mentees can view availability"
  ON public.mentor_availability FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND tenant_id = mentor_availability.tenant_id AND status = 'active'
  ));

-- Bookings: staff can manage all, mentees can manage their own
CREATE POLICY "Staff can manage all bookings"
  ON public.session_bookings FOR ALL
  USING (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Mentees can view own bookings"
  ON public.session_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = session_bookings.mentee_membership_id AND user_id = auth.uid()
  ));

CREATE POLICY "Mentees can create bookings"
  ON public.session_bookings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = session_bookings.mentee_membership_id AND user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Mentees can cancel own bookings"
  ON public.session_bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = session_bookings.mentee_membership_id AND user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_session_bookings_updated_at
  BEFORE UPDATE ON public.session_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_bookings;
