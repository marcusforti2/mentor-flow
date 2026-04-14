CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_lookup
  ON ai_rate_limits (user_id, action, created_at DESC);

-- Auto-cleanup records older than 24 hours (via pg_cron or manual purge)
-- RLS: service role only
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON ai_rate_limits
  USING (false) WITH CHECK (false);
