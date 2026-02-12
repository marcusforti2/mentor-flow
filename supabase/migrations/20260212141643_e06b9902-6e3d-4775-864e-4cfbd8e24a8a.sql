
-- Drop restrictive policies on meeting_transcripts
DROP POLICY IF EXISTS "Mentors can manage transcripts for their mentorados" ON meeting_transcripts;

-- Drop restrictive policies on extracted_task_drafts
DROP POLICY IF EXISTS "Mentors can manage task drafts" ON extracted_task_drafts;

-- Drop restrictive policies on campan_tasks
DROP POLICY IF EXISTS "Mentors can manage tasks" ON campan_tasks;

-- New staff-based policies using is_tenant_staff
CREATE POLICY "Staff can manage transcripts"
  ON meeting_transcripts FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can manage task drafts"
  ON extracted_task_drafts FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can manage tasks"
  ON campan_tasks FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));
