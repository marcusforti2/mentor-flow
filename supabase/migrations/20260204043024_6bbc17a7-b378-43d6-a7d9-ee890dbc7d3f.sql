-- Add strategic business profile fields for governance system
ALTER TABLE public.mentorado_business_profiles 
ADD COLUMN IF NOT EXISTS monthly_revenue text,
ADD COLUMN IF NOT EXISTS team_size text,
ADD COLUMN IF NOT EXISTS time_in_market text,
ADD COLUMN IF NOT EXISTS maturity_level text,
ADD COLUMN IF NOT EXISTS main_chaos_points text[],
ADD COLUMN IF NOT EXISTS has_commercial_process boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sales_predictability text,
ADD COLUMN IF NOT EXISTS main_bottleneck text,
ADD COLUMN IF NOT EXISTS owner_dependency_level text,
ADD COLUMN IF NOT EXISTS current_sales_channels text[],
ADD COLUMN IF NOT EXISTS average_ticket text,
ADD COLUMN IF NOT EXISTS sales_cycle_days integer,
ADD COLUMN IF NOT EXISTS monthly_leads_volume text,
ADD COLUMN IF NOT EXISTS conversion_rate text;