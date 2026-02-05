-- Sprint A & B Part 1: Add master_admin role and create sandbox tenant

-- Add the new value to the enum
ALTER TYPE public.membership_role ADD VALUE IF NOT EXISTS 'master_admin';

-- Create sandbox/preview tenant
INSERT INTO public.tenants (id, name, slug, settings, primary_color, secondary_color)
VALUES (
  'b0000000-0000-0000-0000-000000000002'::uuid,
  'LBV Preview Sandbox',
  'lbv-sandbox',
  '{"is_sandbox": true}'::jsonb,
  '#8B5CF6',
  '#A78BFA'
) ON CONFLICT (id) DO NOTHING;