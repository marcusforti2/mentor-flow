
ALTER TABLE public.email_flows ADD COLUMN IF NOT EXISTS audience_type text DEFAULT 'all';
ALTER TABLE public.email_flows ADD COLUMN IF NOT EXISTS audience_membership_ids uuid[] DEFAULT '{}';
