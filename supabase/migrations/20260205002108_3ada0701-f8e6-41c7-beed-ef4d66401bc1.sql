-- Create mentorado_invites table for pre-registration system
CREATE TABLE public.mentorado_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  welcome_message TEXT,
  mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for fast token lookups
CREATE INDEX idx_mentorado_invites_token ON public.mentorado_invites(invite_token);
CREATE INDEX idx_mentorado_invites_mentor ON public.mentorado_invites(mentor_id);
CREATE INDEX idx_mentorado_invites_status ON public.mentorado_invites(status);

-- Enable RLS
ALTER TABLE public.mentorado_invites ENABLE ROW LEVEL SECURITY;

-- Mentors can view their own invites
CREATE POLICY "Mentors can view their own invites"
ON public.mentorado_invites
FOR SELECT
USING (
  mentor_id IN (
    SELECT id FROM public.mentors WHERE user_id = auth.uid()
  )
);

-- Mentors can create invites
CREATE POLICY "Mentors can create invites"
ON public.mentorado_invites
FOR INSERT
WITH CHECK (
  mentor_id IN (
    SELECT id FROM public.mentors WHERE user_id = auth.uid()
  )
);

-- Mentors can update their own invites
CREATE POLICY "Mentors can update their own invites"
ON public.mentorado_invites
FOR UPDATE
USING (
  mentor_id IN (
    SELECT id FROM public.mentors WHERE user_id = auth.uid()
  )
);

-- Mentors can delete their own invites
CREATE POLICY "Mentors can delete their own invites"
ON public.mentorado_invites
FOR DELETE
USING (
  mentor_id IN (
    SELECT id FROM public.mentors WHERE user_id = auth.uid()
  )
);

-- Public can read invites by token (for onboarding validation)
CREATE POLICY "Anyone can read invite by token"
ON public.mentorado_invites
FOR SELECT
USING (true);

-- Function to generate unique invite token
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to accept an invite and link mentorado
CREATE OR REPLACE FUNCTION public.accept_invite(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_mentorado_id UUID;
  v_result JSON;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite
  FROM public.mentorado_invites
  WHERE invite_token = p_token
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite inválido, expirado ou já utilizado');
  END IF;
  
  -- Create the mentorado record
  INSERT INTO public.mentorados (user_id, mentor_id, status, onboarding_completed, joined_at)
  VALUES (p_user_id, v_invite.mentor_id, 'active', false, now())
  RETURNING id INTO v_mentorado_id;
  
  -- Assign mentorado role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'mentorado')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update the invite
  UPDATE public.mentorado_invites
  SET status = 'accepted',
      mentorado_id = v_mentorado_id,
      accepted_at = now()
  WHERE id = v_invite.id;
  
  RETURN json_build_object(
    'success', true, 
    'mentorado_id', v_mentorado_id,
    'mentor_id', v_invite.mentor_id
  );
END;
$$;