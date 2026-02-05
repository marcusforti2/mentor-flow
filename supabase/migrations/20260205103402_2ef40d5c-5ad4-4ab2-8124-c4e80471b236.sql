-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "system_insert_audit_logs" ON public.audit_logs;

-- Create a more secure INSERT policy
-- Allows authenticated users to insert logs for themselves or system (service role)
CREATE POLICY "authenticated_insert_audit_logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (user_id = auth.uid() OR user_id IS NULL)
  );