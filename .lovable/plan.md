
# Correção: Usuário Travado no Login sem Role

## Diagnóstico

A usuária **Mariana Chinarelli** (mariana@atlasalesinvest.com) está travada porque:

1. **Tentou se cadastrar como "Mentor"** - mas já existe um mentor no sistema (Marcus Forti)
2. **A atribuição de role falhou** - o banco retornou erro "Já existe um mentor cadastrado no sistema"
3. **O código continuou mesmo assim** - criou o usuário e gerou magic link, mas sem atribuir role
4. **Resultado:** Usuária autenticada mas sem role → tela de "Aguardando aprovação"

## Solução em 2 Partes

### Parte 1: Correção Imediata (Banco de Dados)

Executar migração para:
1. Atribuir role `mentorado` para a Mariana
2. Criar registro na tabela `mentorados` vinculando ao mentor existente

```sql
-- Atribuir role de mentorado
INSERT INTO user_roles (user_id, role)
VALUES ('1ffe23f6-386e-4e2c-986b-69ce665901fa', 'mentorado')
ON CONFLICT (user_id, role) DO NOTHING;

-- Criar registro de mentorado vinculado ao mentor
INSERT INTO mentorados (user_id, mentor_id, status, joined_at)
VALUES (
  '1ffe23f6-386e-4e2c-986b-69ce665901fa',
  'ea66854f-10ce-41c8-9609-b128d5a237f8',
  'active',
  now()
)
ON CONFLICT DO NOTHING;
```

### Parte 2: Prevenção (Edge Function)

Atualizar `verify-otp` para **impedir a criação de usuário** quando:
- O userType selecionado é `mentor`
- Já existe um mentor no sistema

**Lógica melhorada:**

```text
┌─────────────────────────────────────────────────────────────┐
│  ANTES de criar o usuário:                                  │
├─────────────────────────────────────────────────────────────┤
│  1. Se userType === 'mentor'                                │
│  2. Verificar se já existe mentor no sistema                │
│  3. Se existir → ERRO: "Já existe um mentor cadastrado"     │
│  4. NÃO criar o usuário sem role                            │
└─────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Corrigir dados da Mariana |
| `supabase/functions/verify-otp/index.ts` | Validar mentor antes de criar usuário |

## Resultado Esperado

1. **Mariana** poderá fazer login e será redirecionada para `/app` (portal do mentorado)
2. **Futuros usuários** que tentarem se cadastrar como Mentor receberão erro claro antes de criar a conta
