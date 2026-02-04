-- Add is_required field to behavioral_questions
ALTER TABLE public.behavioral_questions 
ADD COLUMN IF NOT EXISTS is_required boolean DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.behavioral_questions.is_required IS 'Whether this question is required to be answered';