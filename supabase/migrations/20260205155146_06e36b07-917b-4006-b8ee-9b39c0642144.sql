-- Make mentor_id nullable since we're using tenant_id now
ALTER TABLE public.trails ALTER COLUMN mentor_id DROP NOT NULL;