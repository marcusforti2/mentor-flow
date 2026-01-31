-- Function to check if this is the first mentor (no mentors exist yet)
CREATE OR REPLACE FUNCTION public.is_first_mentor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'mentor'
  )
$$;

-- Function to assign a role to a user
-- Only allows mentor assignment if no mentor exists yet
CREATE OR REPLACE FUNCTION public.assign_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow mentor assignment if no mentor exists (for initial setup)
  IF _role = 'mentor' AND EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'mentor') THEN
    RAISE EXCEPTION 'Já existe um mentor cadastrado no sistema';
  END IF;
  
  -- Insert the role, ignore if already exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Also create mentor record if assigning mentor role
  IF _role = 'mentor' THEN
    INSERT INTO public.mentors (user_id)
    VALUES (_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Function for mentor to approve a mentorado (assigns role and creates mentorado record)
CREATE OR REPLACE FUNCTION public.approve_mentorado(_user_id uuid, _mentor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert mentorado role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'mentorado')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create mentorado record linked to mentor
  INSERT INTO public.mentorados (user_id, mentor_id, status, joined_at)
  VALUES (_user_id, _mentor_id, 'active', now())
  ON CONFLICT DO NOTHING;
END;
$$;

-- Function to get pending users (users with profile but no role)
CREATE OR REPLACE FUNCTION public.get_pending_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE ur.id IS NULL
  ORDER BY p.created_at DESC
$$;