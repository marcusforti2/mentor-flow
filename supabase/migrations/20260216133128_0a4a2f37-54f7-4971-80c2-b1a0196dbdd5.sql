-- Allow staff to UPDATE profiles of users in their tenant
CREATE POLICY "Staff can update profiles in tenant"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM memberships viewer
    JOIN memberships target ON target.user_id = profiles.user_id
    WHERE viewer.user_id = auth.uid()
      AND viewer.tenant_id = target.tenant_id
      AND viewer.status = 'active'
      AND viewer.role IN ('admin', 'ops', 'mentor')
  )
);

-- Allow staff to UPDATE mentee_profiles in their tenant
CREATE POLICY "Staff can update mentee profiles"
ON public.mentee_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM memberships viewer
    JOIN memberships mentee ON mentee.id = mentee_profiles.membership_id
    WHERE viewer.user_id = auth.uid()
      AND viewer.tenant_id = mentee.tenant_id
      AND viewer.status = 'active'
      AND viewer.role IN ('admin', 'ops', 'mentor')
  )
);