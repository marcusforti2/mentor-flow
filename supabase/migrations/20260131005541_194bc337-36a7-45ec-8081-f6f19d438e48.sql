
-- Corrigir Function Search Path nas funções
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

-- Corrigir RLS policies permissivas
DROP POLICY IF EXISTS "System can insert analyses" ON public.call_analyses;
CREATE POLICY "System can insert analyses"
ON public.call_analyses FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'mentor') OR
    EXISTS (
        SELECT 1 FROM public.call_transcripts ct
        JOIN public.mentorados m ON m.id = ct.mentorado_id
        WHERE ct.id = transcript_id AND m.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "System can manage reports" ON public.behavioral_reports;
CREATE POLICY "System can insert reports"
ON public.behavioral_reports FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'mentor') OR
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "System can update reports"
ON public.behavioral_reports FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'mentor') OR
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);
