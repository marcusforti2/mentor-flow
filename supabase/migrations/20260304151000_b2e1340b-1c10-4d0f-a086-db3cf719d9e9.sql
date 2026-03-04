-- Allow staff to insert mentee profiles
CREATE POLICY "Staff can insert mentee profiles"
ON public.mentee_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships viewer
    JOIN memberships mentee ON mentee.id = mentee_profiles.membership_id
    WHERE viewer.user_id = auth.uid()
      AND viewer.tenant_id = mentee.tenant_id
      AND viewer.status = 'active'
      AND viewer.role IN ('admin', 'ops', 'mentor')
  )
);

-- Also allow mentees to insert their own profile
CREATE POLICY "Mentees can insert own profile"
ON public.mentee_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  membership_id IN (
    SELECT id FROM memberships WHERE user_id = auth.uid()
  )
);