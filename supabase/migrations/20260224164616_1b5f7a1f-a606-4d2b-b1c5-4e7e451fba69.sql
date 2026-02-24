
ALTER TABLE public.mentee_deals
  ADD COLUMN IF NOT EXISTS installments integer,
  ADD COLUMN IF NOT EXISTS monthly_value_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS negotiation_notes text;
