
-- Add installment and negotiation fields to program_investments
ALTER TABLE public.program_investments
  ADD COLUMN IF NOT EXISTS installments integer,
  ADD COLUMN IF NOT EXISTS monthly_amount_cents integer,
  ADD COLUMN IF NOT EXISTS negotiation_notes text;
