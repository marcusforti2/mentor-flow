
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempt_type text NOT NULL DEFAULT 'verify', -- 'verify' or 'send'
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_otp_rate_limits_email_type ON public.otp_rate_limits (email, attempt_type, created_at DESC);

-- Auto-cleanup: delete records older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_otp_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.otp_rate_limits WHERE created_at < now() - interval '1 hour';
END;
$$;

-- RLS: only service_role can access
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;
-- No public policies = only service_role can read/write
