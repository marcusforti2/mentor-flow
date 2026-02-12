CREATE POLICY "Mentorados can insert own tasks"
  ON campan_tasks FOR INSERT
  WITH CHECK (
    mentorado_membership_id IN (
      SELECT id FROM memberships WHERE user_id = auth.uid()
    )
  );