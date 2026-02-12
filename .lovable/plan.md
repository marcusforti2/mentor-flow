

## Corrigir Upload de Arquivos de Mentorado (Solucao Definitiva)

O problema tem 3 camadas que precisam ser resolvidas juntas:

### Problema 1: Politica RLS da tabela `mentorado_files`
A politica "Mentors can manage files" verifica se o `mentor_id` do registro pertence ao usuario logado. Quando a Mariana (admin) tenta subir arquivo para um mentorado que pertence a outro mentor legado, a FK `mentor_id` aponta para o mentor original, nao para ela -- e a policy falha.

A policy de staff (`mentorado_files_staff_manage`) deveria cobrir isso, mas depende de `tenant_id` estar preenchido no INSERT. Se for `null`, a policy nao bate.

**Solucao**: Tornar o `mentor_id` nullable (ja que temos `owner_membership_id` e `tenant_id` como substitutos modernos) e garantir que `tenant_id` seja sempre preenchido.

### Problema 2: Politica de Storage do bucket `mentorado-files`
As policies do bucket so permitem upload/delete para quem tem registro na tabela `mentors`. Nao existe policy de staff para admin/ops.

**Solucao**: Adicionar policies de storage para staff do tenant.

### Problema 3: O componente esconde o file manager quando nao tem dados legados
A correcao anterior adicionou um guard que exige `legacy_mentorado_id` E `legacy_mentor_id`. Mentorados sem registro legado nao conseguem usar arquivos.

**Solucao**: Permitir que o file manager funcione sem dados legados, usando `membership_id` e `tenant_id` como identificadores primarios.

---

### Detalhes Tecnicos

#### Migration SQL

1. Tornar `mentor_id` e `mentorado_id` nullable na tabela `mentorado_files`
2. Adicionar policies de storage para staff
3. Atualizar a policy RLS de staff para cobrir inserts sem `mentorado_id` legado

```sql
-- 1. Tornar FKs legadas nullable
ALTER TABLE public.mentorado_files ALTER COLUMN mentor_id DROP NOT NULL;
ALTER TABLE public.mentorado_files ALTER COLUMN mentorado_id DROP NOT NULL;

-- 2. Storage: policy de upload para staff
CREATE POLICY "Staff can upload mentorado files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mentorado-files'
  AND is_tenant_staff(auth.uid(), (
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
  ))
);

-- 3. Storage: policy de leitura para staff
CREATE POLICY "Staff can view mentorado files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mentorado-files'
  AND is_tenant_staff(auth.uid(), (
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
  ))
);

-- 4. Storage: policy de delete para staff
CREATE POLICY "Staff can delete mentorado files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mentorado-files'
  AND is_tenant_staff(auth.uid(), (
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
  ))
);
```

#### Alteracoes no Codigo

**`MentoradoFilesManager.tsx`**:
- Tornar `mentoradoId` e `mentorId` opcionais nas props
- Usar `owner_membership_id` como identificador principal para fetch (com fallback para `mentorado_id`)
- No insert, passar `mentorado_id` e `mentor_id` apenas se disponíveis (ambos agora nullable)
- Organizar path de storage usando `owner_membership_id` em vez de `mentorado_id`

**`Mentorados.tsx`**:
- Remover o guard condicional que esconde o file manager
- Sempre renderizar o `MentoradoFilesManager`, passando os IDs legados como opcionais
- Garantir que `tenantId` sempre venha do `activeMembership`

### Resultado
- Admin/Ops/Mentor poderao subir arquivos para qualquer mentorado do tenant
- Funciona tanto para mentorados legados quanto novos (sem registro na tabela `mentorados`)
- Storage e DB com policies alinhadas

