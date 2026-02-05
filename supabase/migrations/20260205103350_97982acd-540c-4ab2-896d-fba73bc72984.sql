-- Create audit_logs table for tracking system activities
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Master admins can read all logs
CREATE POLICY "master_admin_read_all_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (is_master_admin());

-- Policy: Admins can read logs from their tenant
CREATE POLICY "admin_read_tenant_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'ops')
      AND status = 'active'
    )
  );

-- Policy: Users can read their own logs
CREATE POLICY "users_read_own_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: System can insert logs (via service role or authenticated users)
CREATE POLICY "system_insert_audit_logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Stores audit trail of system activities including logins, user actions, and important events';