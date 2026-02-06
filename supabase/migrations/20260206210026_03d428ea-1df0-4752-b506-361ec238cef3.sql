-- Passo 1: Permitir master_admin ler registros da tabela mentorados
CREATE POLICY "master_admin_view_mentorados"
ON public.mentorados FOR SELECT
USING (is_master_admin(auth.uid()));

-- Passo 2: Permitir master_admin ler perfis de negócio
CREATE POLICY "master_admin_view_business_profiles"
ON public.mentorado_business_profiles FOR SELECT
USING (is_master_admin(auth.uid()));