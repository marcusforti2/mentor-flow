-- Allow mentees to manage their OWN pipeline stages (where membership_id matches)
CREATE POLICY "Mentees can manage own pipeline stages"
  ON public.crm_pipeline_stages
  FOR ALL
  TO authenticated
  USING (
    membership_id IS NOT NULL
    AND membership_id IN (
      SELECT id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    membership_id IS NOT NULL
    AND membership_id IN (
      SELECT id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );