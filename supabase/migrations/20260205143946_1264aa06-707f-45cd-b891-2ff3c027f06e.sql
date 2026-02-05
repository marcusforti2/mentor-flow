-- Corrigir políticas RLS da tabela profiles para funcionar com memberships

-- Remover política antiga que usa user_roles legado
DROP POLICY IF EXISTS "Mentors can view all profiles" ON public.profiles;

-- Criar política para master_admin ver todos os profiles
CREATE POLICY "Master admin can view all profiles"
ON public.profiles
FOR SELECT
USING (is_master_admin(auth.uid()));

-- Criar política para admin/ops/mentor ver profiles dos usuários do mesmo tenant
CREATE POLICY "Tenant members can view profiles in same tenant"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memberships viewer
    JOIN memberships target ON target.user_id = profiles.user_id
    WHERE viewer.user_id = auth.uid()
    AND viewer.tenant_id = target.tenant_id
    AND viewer.status = 'active'
    AND viewer.role IN ('admin', 'ops', 'mentor')
  )
);