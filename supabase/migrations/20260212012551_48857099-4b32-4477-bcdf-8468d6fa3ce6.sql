
-- Drop problematic policies on mentorado_files that query memberships directly
DROP POLICY IF EXISTS "mentorado_files_mentee_own" ON public.mentorado_files;
DROP POLICY IF EXISTS "mentorado_files_staff_view" ON public.mentorado_files;

-- Recreate mentee own policy using mentorados table (no recursion)
CREATE POLICY "mentorado_files_mentee_own"
ON public.mentorado_files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = mentorado_files.mentorado_id
      AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = mentorado_files.mentorado_id
      AND m.user_id = auth.uid()
  )
);

-- Recreate staff view policy using security definer function
CREATE POLICY "mentorado_files_staff_view"
ON public.mentorado_files
FOR SELECT
USING (
  public.is_tenant_staff(auth.uid(), tenant_id)
);
