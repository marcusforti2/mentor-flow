
# Preview Completo para Apresentacao

## Problema Atual

O sistema de Preview tem 3 bloqueios criticos que impedem o funcionamento:

1. **Permissao bloqueada**: A funcao `start_impersonation` no banco so permite role `admin`, nao `master_admin`
2. **Contexto isolado**: O `TenantContext.switchMembership` so procura memberships do proprio usuario - nao encontra memberships de outros usuarios do sandbox
3. **Flag `canImpersonate` errada**: Esta hardcoded para `role === 'admin'`, ignorando `master_admin`

```text
Fluxo Atual (QUEBRADO):
Master Admin clica "Entrar como Mentor"
  -> switchMembership(sandbox_mentor_id)
    -> memberships.find(id) = undefined (nao esta na lista do Marcus)
    -> return (nada acontece)
```

## Solucao em 4 Frentes

### 1. Correcao no Banco de Dados (Migration SQL)

Atualizar a funcao `start_impersonation` para permitir `master_admin`:

```sql
-- Linha atual:
IF v_admin_role != 'admin' AND NOT v_can_impersonate THEN

-- Corrigido para:
IF v_admin_role NOT IN ('admin', 'master_admin') AND NOT v_can_impersonate THEN
```

Tambem remover a restricao de "mesmo tenant" para `master_admin`, ja que ele precisa acessar qualquer tenant.

### 2. Correcao do TenantContext (Frontend Core)

No arquivo `src/contexts/TenantContext.tsx`:

- **`can_impersonate` mapping**: Incluir `master_admin` alem de `admin`
- **`canImpersonate` computed**: Incluir `master_admin` na verificacao
- **`switchMembership`**: Quando o membership alvo nao estiver na lista do usuario, buscar no banco (apenas para `master_admin`). Isso permite que o Marcus "entre" em qualquer membership do sandbox
- **Permissao**: Permitir `master_admin` na checagem de permissao de impersonation

```text
Fluxo Corrigido:
Master Admin clica "Entrar como Mentor"
  -> switchMembership(sandbox_mentor_id)
    -> memberships.find(id) = undefined
    -> (NOVO) fetchMembershipById(id) do banco
    -> start_impersonation(master_id, sandbox_mentor_id)
    -> setActiveMembership(sandbox_mentor)
    -> navigate('/mentor')
```

### 3. Nova UX de Preview (Pagina Redesenhada)

Redesenhar `src/pages/master/PreviewPage.tsx` com uma experiencia mais direta:

- **Botao de Seed automatico**: Se o sandbox estiver vazio, seedar automaticamente ao entrar na pagina (sem precisar clicar)
- **Dois cards grandes e claros**: MENTOR e MENTORADO, cada um com descricao do que vai ver
- **Card Mentor**: Clique unico para entrar como a mentora Erika (Demo) - sem selecao
- **Card Mentorado**: Lista de 10 mentorados com indicadores visuais de atividade (alta/media/baixa/inativa), temperatura e pontos. Clique em qualquer um para entrar
- **Indicador visual**: Badge de status mostrando quantos dados estao populados (leads, trilhas, reunioes)

### 4. Garantia de Dados Completos

O `seed-sandbox` ja cria dados bem completos, mas verificar e garantir:

- 1 mentor com perfil completo
- 10 mentorados com personas variadas (diferentes niveis de atividade)
- 3 trilhas com modulos e aulas + progresso individual
- 220+ leads de CRM distribuidos
- 15 reunioes (passadas e futuras)
- Logs de atividade, uso de IA, posts de comunidade
- 2 pedidos SOS
- Perfis de negocio com dados estrategicos

(Ja esta implementado na edge function atual - apenas garantir que o seed roda com sucesso)

## Arquivos que Serao Modificados

| Arquivo | Tipo de Mudanca |
|---------|----------------|
| Nova migration SQL | Corrigir `start_impersonation` para `master_admin` |
| `src/contexts/TenantContext.tsx` | Permitir switch para memberships externas (master_admin) |
| `src/pages/master/PreviewPage.tsx` | Redesenhar UX com cards diretos e auto-seed |

## Resultado Esperado

Apos implementacao, o Master Admin podera:

1. Ir em `/master/preview`
2. O ambiente de sandbox sera preparado automaticamente (se necessario)
3. Clicar em "Entrar como Mentor" para ver o dashboard completo com 10 mentorados, CRM, trilhas, calendario
4. Clicar em qualquer mentorado para ver a experiencia individual com trilhas, CRM pessoal, ferramentas de IA
5. Botao de retorno discreto (ambar) no canto para voltar ao Master a qualquer momento
6. Todas as ferramentas funcionando com dados reais do banco de dados

## Detalhes Tecnicos

### Seguranca

- O `master_admin` e o unico papel com privilegio de preview cross-tenant
- Todas as sessoes de impersonation sao registradas em `impersonation_logs`
- O retorno ao contexto real limpa o estado e registra o fim da sessao

### RLS

- O Marcus (master_admin) tem acesso a todos os dados via politicas RLS existentes que checam `is_master_admin()`
- Os dados do sandbox estao no tenant `b0000000-0000-0000-0000-000000000002`
- Nenhuma mudanca de RLS necessaria - as politicas existentes ja cobrem o acesso
