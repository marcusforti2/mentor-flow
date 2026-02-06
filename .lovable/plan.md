
# Correcao: Remover Fluxo de Aprovacao e Garantir Criacao Automatica Completa

## O Que Esta Acontecendo

O screenshot mostra a versao ANTIGA da pagina de Mentorados com o fluxo "Pendentes + Aprovar". Esse fluxo tenta buscar a mentora na tabela legada `mentors` (vazia), por isso da o erro **"Mentor nao encontrado"**.

A pagina ja foi migrada no codigo atual - nao tem mais abas de "Pendentes" nem botao "Aprovar". Porem o build estava falhando por erros de TypeScript (corrigidos agora), entao a versao antiga continuava sendo servida.

Com os erros corrigidos, a nova versao vai entrar em vigor automaticamente. Porem, existe uma lacuna importante:

## Problema Restante: Perfis Nao Sao Criados

Quando o mentor clica "Adicionar Mentorado", a Edge Function `create-membership` cria:
- Usuario no auth
- Profile basico
- Membership
- Vinculo mentor-mentee (`mentor_mentee_assignments`)

Mas **NAO cria** o registro em `mentee_profiles` (para mentorados) nem `mentor_profiles` (para mentores). A pagina de Mentorados depende de `mentee_profiles` para exibir dados como `onboarding_completed`, `joined_at` e `business_profile`.

## Plano de Correcao

### 1. Atualizar Edge Function `create-membership`

Adicionar criacao automatica de perfis especializados apos criar o membership:

- Para **mentee**: inserir registro em `mentee_profiles` com `membership_id`, `joined_at` e campos iniciais
- Para **mentor**: inserir registro em `mentor_profiles` com `membership_id`

Isso garante que qualquer mentorado adicionado por um mentor ja tera todos os dados estruturados no sistema.

### 2. Confirmar Que Pagina de Mentorados Esta Correta

A pagina ja foi migrada e esta correta no codigo:
- Sem abas "Pendentes" / "Aprovar"
- Botao "Adicionar Mentorado" que chama `create-membership`
- Lista diretamente os memberships ativos com dados de `mentee_profiles`
- Mentor e auto-atribuido como responsavel

### Resultado Esperado

1. A mentora abre a pagina de Mentorados
2. Clica em "Adicionar Mentorado"
3. Preenche nome, email e telefone
4. O sistema automaticamente cria: usuario, profile, membership, mentee_profile e vinculo mentor-mentee
5. O mentorado aparece imediatamente na lista
6. O mentorado recebe email de boas-vindas com link de acesso

## Detalhes Tecnicos

### Arquivo: `supabase/functions/create-membership/index.ts`

Apos a criacao do membership (linha ~505), adicionar:

```text
// Apos criar membership com sucesso:
if (role === 'mentee') {
  INSERT em mentee_profiles: {
    membership_id: membership.id,
    joined_at: effectiveJoinedAt,
    onboarding_completed: false,
    business_profile: { business_name: full_name_negocio_se_fornecido }
  }
}
if (role === 'mentor') {
  INSERT em mentor_profiles: {
    membership_id: membership.id,
    business_name: null
  }
}
```

Nenhuma outra alteracao de frontend e necessaria - a pagina ja esta migrada corretamente.
