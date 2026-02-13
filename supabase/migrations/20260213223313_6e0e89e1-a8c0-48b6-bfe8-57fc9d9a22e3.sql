
-- Fix 1: Lock down OTP codes table - only service role should access
DROP POLICY IF EXISTS "OTP codes are managed by system" ON public.otp_codes;
CREATE POLICY "No direct access to OTP codes"
  ON public.otp_codes FOR ALL
  USING (false);

-- Fix 2: Scope CRM prospections mentor access to same tenant
DROP POLICY IF EXISTS "Mentors can view all prospections" ON public.crm_prospections;
CREATE POLICY "Mentors can view tenant prospections"
  ON public.crm_prospections FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
    AND (
      public.is_tenant_staff(auth.uid(), tenant_id)
      OR membership_id IN (
        SELECT id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Fix 3: Tighten lead-screenshots storage policies
DROP POLICY IF EXISTS "Mentorados can upload their screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Mentorados can view their screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Mentorados can delete their screenshots" ON storage.objects;

CREATE POLICY "Users upload to own folder in lead-screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lead-screenshots'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users view own or staff view all in lead-screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lead-screenshots'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'ops', 'mentor', 'master_admin')
        AND status = 'active'
      )
    )
  );

CREATE POLICY "Users delete own screenshots only"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lead-screenshots'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
