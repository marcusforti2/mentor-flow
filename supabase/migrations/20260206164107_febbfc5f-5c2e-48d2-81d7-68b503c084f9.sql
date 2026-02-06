
-- Create a SECURITY DEFINER function to check if a user owns a mentorado record
-- This bypasses RLS on the mentorados table to avoid nested RLS issues
CREATE OR REPLACE FUNCTION public.is_mentorado_owner(_user_id uuid, _mentorado_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentorados
    WHERE id = _mentorado_id
    AND user_id = _user_id
  )
$$;

-- Drop the old policy
DROP POLICY IF EXISTS "Mentorados can manage their business profile" ON public.mentorado_business_profiles;

-- Create improved policy using SECURITY DEFINER function to avoid nested RLS
CREATE POLICY "Mentorados can manage their business profile"
ON public.mentorado_business_profiles
FOR ALL
USING (
  public.is_mentorado_owner(auth.uid(), mentorado_id)
  OR public.is_master_admin(auth.uid())
)
WITH CHECK (
  public.is_mentorado_owner(auth.uid(), mentorado_id)
  OR public.is_master_admin(auth.uid())
);
