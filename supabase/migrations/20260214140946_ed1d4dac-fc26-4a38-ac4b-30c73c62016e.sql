-- Fix: restrict mentorado_invites SELECT to mentors who own them
-- The token-based lookup is done via edge function with service_role, not client-side
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.mentorado_invites;

CREATE POLICY "Mentors can read their own invites"
ON public.mentorado_invites
FOR SELECT
TO authenticated
USING (
  mentor_id IN (
    SELECT id FROM mentors WHERE user_id = auth.uid()
  )
);