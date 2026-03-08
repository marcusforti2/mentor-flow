
-- =====================================================
-- SECURITY HARDENING: Fix all scan findings
-- =====================================================

-- 1. MEETING_RECORDINGS: Drop unscoped policies, add tenant-scoped
DROP POLICY IF EXISTS "Mentorados can view recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Mentors can manage recordings" ON public.meeting_recordings;

CREATE POLICY "recordings_tenant_view" ON public.meeting_recordings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_recordings.meeting_id
      AND m.tenant_id IN (SELECT get_user_tenant_ids())
  ));

CREATE POLICY "recordings_staff_manage" ON public.meeting_recordings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_recordings.meeting_id
      AND is_tenant_staff(auth.uid(), m.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_recordings.meeting_id
      AND is_tenant_staff(auth.uid(), m.tenant_id)
  ));

-- 2. SOS_REQUESTS: Drop unscoped mentor policy (tenant-scoped ones exist)
DROP POLICY IF EXISTS "Mentors can manage all SOS requests" ON public.sos_requests;

-- 3. SOS_RESPONSES: Drop unscoped mentor policy (tenant-scoped one exists)
DROP POLICY IF EXISTS "Mentors can manage all responses" ON public.sos_responses;

-- 4. MEETINGS: Drop unscoped mentor policy (tenant-scoped ones exist)
DROP POLICY IF EXISTS "Mentors can manage meetings" ON public.meetings;

-- 5. MEETING_ATTENDEES: Drop unscoped mentor policy, add tenant-scoped write
DROP POLICY IF EXISTS "Mentors can manage all attendance" ON public.meeting_attendees;

CREATE POLICY "attendees_staff_manage" ON public.meeting_attendees FOR ALL
  USING (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND is_tenant_staff(auth.uid(), m.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND is_tenant_staff(auth.uid(), m.tenant_id)
  ));

-- 6. TRAILS: Drop unscoped policies (tenant-scoped exist: trails_mentee_tenant_view, trails_manage)
DROP POLICY IF EXISTS "Mentorados can view published trails" ON public.trails;
DROP POLICY IF EXISTS "Mentors can manage trails" ON public.trails;

-- 7. TRAIL_MODULES: Drop unscoped policies (tenant-scoped exist)
DROP POLICY IF EXISTS "Mentorados can view modules" ON public.trail_modules;
DROP POLICY IF EXISTS "Mentors can manage modules" ON public.trail_modules;

-- 8. TRAIL_LESSONS: Drop unscoped policies (tenant-scoped exist)
DROP POLICY IF EXISTS "Mentorados can view lessons" ON public.trail_lessons;
DROP POLICY IF EXISTS "Mentors can manage lessons" ON public.trail_lessons;

-- 9. MENTOR_LIBRARY: Replace overly permissive ALL policy with role-scoped ones
DROP POLICY IF EXISTS "library_tenant_scope" ON public.mentor_library;

CREATE POLICY "library_tenant_read" ON public.mentor_library FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "library_staff_write" ON public.mentor_library FOR INSERT
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "library_staff_update" ON public.mentor_library FOR UPDATE
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "library_staff_delete" ON public.mentor_library FOR DELETE
  USING (is_tenant_staff(auth.uid(), tenant_id));

-- 10. REWARD_REDEMPTIONS: Split into proper role-based policies
DROP POLICY IF EXISTS "redemptions_own" ON public.reward_redemptions;

CREATE POLICY "redemptions_own_read" ON public.reward_redemptions FOR SELECT
  USING (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "redemptions_own_insert" ON public.reward_redemptions FOR INSERT
  WITH CHECK (membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "redemptions_staff_manage" ON public.reward_redemptions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = reward_redemptions.membership_id
      AND is_tenant_staff(auth.uid(), m.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = reward_redemptions.membership_id
      AND is_tenant_staff(auth.uid(), m.tenant_id)
  ));

-- 11. FORM_QUESTIONS: Scope read to active forms only
DROP POLICY IF EXISTS "anyone_read_questions" ON public.form_questions;

CREATE POLICY "form_questions_public_read" ON public.form_questions FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM tenant_forms tf
    WHERE tf.id = form_questions.form_id AND tf.is_active = true
  ));

CREATE POLICY "form_questions_auth_read" ON public.form_questions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tenant_forms tf
    WHERE tf.id = form_questions.form_id
      AND (tf.is_active = true OR is_tenant_staff(auth.uid(), tf.tenant_id))
  ));

-- 12. FORM_SUBMISSIONS: Fix membership_id spoofing
DROP POLICY IF EXISTS "anyone_insert_submission" ON public.form_submissions;

CREATE POLICY "anon_insert_submission" ON public.form_submissions FOR INSERT TO anon
  WITH CHECK (membership_id IS NULL);

CREATE POLICY "auth_insert_submission" ON public.form_submissions FOR INSERT TO authenticated
  WITH CHECK (
    membership_id IS NULL 
    OR membership_id IN (SELECT id FROM memberships WHERE user_id = auth.uid())
  );
