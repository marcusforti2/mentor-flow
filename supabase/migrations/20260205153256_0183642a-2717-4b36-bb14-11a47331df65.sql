-- Adicionar campo created_by_membership_id na tabela mentor_mentee_assignments
-- Este campo registra QUEM executou a ação de cadastro (mentor ou master admin)

ALTER TABLE public.mentor_mentee_assignments 
ADD COLUMN IF NOT EXISTS created_by_membership_id uuid REFERENCES public.memberships(id);

-- Comentário para documentação
COMMENT ON COLUMN public.mentor_mentee_assignments.created_by_membership_id IS 
'Membership ID de quem executou a criação do vínculo (mentor ou master_admin)';

COMMENT ON COLUMN public.mentor_mentee_assignments.mentor_membership_id IS 
'Mentor responsável pelo mentorado (autoria)';

COMMENT ON COLUMN public.mentor_mentee_assignments.assigned_at IS 
'Data real de entrada do mentorado (pode ser diferente de created_at em importações)';