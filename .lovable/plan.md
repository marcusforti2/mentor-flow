

## Mapa de Conexoes Mentor-Mentorado: Status Atual e Correcoes

### Legenda
- OK = Funciona com a arquitetura moderna (tenant_id / membership_id)
- PARCIAL = Funciona mas depende de tabelas legadas como fallback
- QUEBRADO = Depende 100% de tabelas legadas (mentors/mentorados), falha para usuarios novos

---

### Status por Funcionalidade

| Funcionalidade | Mentor (admin) | Mentorado (mentee) | Status |
|---|---|---|---|
| **Arquivos** | Sobe via membership_id | Ve via owner_membership_id | OK (corrigido agora) |
| **Trilhas** | Cria com tenant_id | Ve por tenant_id | OK |
| **CRM (Meu CRM)** | N/A | Usa membership_id | OK |
| **CRM (Gestao)** | Ve todos do tenant | N/A | OK |
| **Calendario (admin)** | Depende de `mentors.id` para criar eventos; fallback usa membership_id como mentor_id (FK invalida) | N/A | QUEBRADO |
| **Calendario (mentee)** | N/A | Busca por tenant_id com fallback legado | PARCIAL |
| **Centro SOS** | Ve por tenant_id | Cria com mentorado_id legado; fallback membership_id | PARCIAL |
| **Comunidade** | N/A | 100% dependente de `mentorados` table (mentor_id, mentorado_id) | QUEBRADO |
| **Chat** | N/A | 100% dependente de `mentorados` table | QUEBRADO |
| **Gamificacao** | N/A | Dual-ID (funciona) | PARCIAL |
| **Ferramentas IA** | N/A | Depende de mentorado_id legado para business profile | PARCIAL |
| **Dashboard Mentee** | N/A | Usa membership corretamente | OK |

---

### Correcoes Necessarias (3 itens criticos)

#### 1. Calendario Admin -- Remover dependencia de `mentors.id`

**Problema**: O calendario admin (`src/pages/admin/Calendario.tsx`) busca `mentors.id` para gravar eventos. Se o admin nao tem registro na tabela `mentors`, usa `activeMembership.id` como `mentor_id`, o que viola a FK.

**Solucao**:
- Migration: Tornar `calendar_events.mentor_id` nullable e adicionar coluna `tenant_id` como filtro principal (ja existe)
- Codigo: Alterar `fetchData()` para buscar eventos por `tenant_id` primeiro, e so usar `mentor_id` como fallback
- Na criacao de eventos, gravar `tenant_id` obrigatoriamente e `mentor_id` apenas se existir registro legado

#### 2. Comunidade e Chat -- Migrar para tenant_id

**Problema**: Os hooks `useCommunityPosts` e `useCommunityChat` dependem 100% da tabela `mentorados` para obter `mentor_id`. As tabelas `community_posts` e `community_messages` filtram por `mentor_id`. Usuarios sem registro legado nao conseguem participar.

**Solucao**:
- Migration: Adicionar coluna `tenant_id` (UUID, nullable, FK para tenants) em `community_posts` e `community_messages`. Preencher dados existentes via `UPDATE ... SET tenant_id = (SELECT tenant_id FROM mentors WHERE id = mentor_id)`
- Codigo: Alterar `useCommunityPosts` e `useCommunityChat` para filtrar por `tenant_id` do `activeMembership` em vez de `mentor_id`. Usar `membership_id` em vez de `mentorado_id` para identificar o autor
- RLS: Adicionar policies baseadas em tenant_id

#### 3. Centro SOS -- Consolidar criacao com membership_id

**Problema**: O `fetchMentoradoId` no SOS ainda busca primeiro na tabela `mentorados`. O `mentorado_id` inserido pode ser um membership_id (UUID de formato diferente), causando problemas na FK.

**Solucao**:
- Migration: Tornar `sos_requests.mentorado_id` nullable (o `membership_id` ja esta sendo gravado)
- Codigo: Usar `activeMembership.id` diretamente no fetch e no insert, removendo a busca na tabela legada

---

### Detalhes Tecnicos

#### Migration SQL

```sql
-- 1. calendar_events: tornar mentor_id nullable
ALTER TABLE public.calendar_events ALTER COLUMN mentor_id DROP NOT NULL;

-- 2. community_posts: adicionar tenant_id e membership_id
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- Preencher tenant_id dos posts existentes
UPDATE public.community_posts cp
SET tenant_id = m.tenant_id
FROM public.mentors m
WHERE cp.mentor_id = m.id AND cp.tenant_id IS NULL;

-- 3. community_messages: adicionar tenant_id e membership_id
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- Preencher tenant_id das mensagens existentes
UPDATE public.community_messages cm
SET tenant_id = m.tenant_id
FROM public.mentors m
WHERE cm.mentor_id = m.id AND cm.tenant_id IS NULL;

-- 4. sos_requests: tornar mentorado_id nullable
ALTER TABLE public.sos_requests ALTER COLUMN mentorado_id DROP NOT NULL;

-- 5. RLS para community_posts por tenant
CREATE POLICY "community_posts_tenant_read"
ON public.community_posts FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- 6. RLS para community_messages por tenant
CREATE POLICY "community_messages_tenant_read"
ON public.community_messages FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- INSERT policies para community
CREATE POLICY "community_posts_tenant_insert"
ON public.community_posts FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "community_messages_tenant_insert"
ON public.community_messages FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

#### Arquivos a Alterar

1. **`src/pages/admin/Calendario.tsx`**: Refatorar `fetchData` para priorizar `tenant_id`; gravar eventos com `tenant_id` obrigatorio e `mentor_id` opcional
2. **`src/hooks/useCommunityPosts.tsx`**: Substituir `useMentorado()` por `useTenant()`, filtrar por `tenant_id`, identificar autor por `membership_id`
3. **`src/hooks/useCommunityChat.tsx`**: Mesma migracao: filtrar mensagens por `tenant_id`, usar `membership_id` como autor
4. **`src/pages/member/CentroSOS.tsx`**: Remover `fetchMentoradoId`, usar `activeMembership.id` diretamente

