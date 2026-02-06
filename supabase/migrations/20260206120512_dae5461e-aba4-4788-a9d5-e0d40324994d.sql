
-- ETAPA 1.1: Atualizar has_role() para consultar memberships ao invés de user_roles
-- Isso desbloqueia imediatamente 12+ tabelas com RLS policies que usam has_role()
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
    AND (
      -- Direct role match (mentor = mentor)
      (role::text = _role::text) OR
      -- Map legacy 'mentorado' role name to 'mentee'
      (_role::text = 'mentorado' AND role = 'mentee')
    )
    AND status = 'active'
  )
$$;

-- ETAPA 1.2: Criar mentor_profiles para Erika real (tenant LBV)
INSERT INTO public.mentor_profiles (membership_id, business_name, bio)
VALUES (
  '26cfdc99-a0c9-4472-a8d6-2ddc05779f52',
  'LBV Mentoria',
  'Mentora de vendas e negócios'
)
ON CONFLICT (membership_id) DO NOTHING;

-- ETAPA 1.3: Criar mentee_profiles para Ricardo (tenant LBV)
INSERT INTO public.mentee_profiles (membership_id, onboarding_completed)
VALUES (
  'ed987bad-5049-4182-b65e-f386d27cec82',
  false
)
ON CONFLICT (membership_id) DO NOTHING;
