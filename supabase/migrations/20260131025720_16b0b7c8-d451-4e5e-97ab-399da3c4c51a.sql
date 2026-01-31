-- Fix: Postgres doesn't support CREATE POLICY IF NOT EXISTS

DROP POLICY IF EXISTS "Mentorados can delete their own analyses" ON public.training_analyses;
DROP POLICY IF EXISTS "Mentors can delete mentorado analyses" ON public.training_analyses;

CREATE POLICY "Mentorados can delete their own analyses"
ON public.training_analyses
FOR DELETE
USING (
  mentorado_id IN (
    SELECT id FROM public.mentorados WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Mentors can delete mentorado analyses"
ON public.training_analyses
FOR DELETE
USING (
  mentorado_id IN (
    SELECT m.id
    FROM public.mentorados m
    JOIN public.mentors mt ON m.mentor_id = mt.id
    WHERE mt.user_id = auth.uid()
  )
);