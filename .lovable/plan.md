
# Plano: Setup Inicial de Mentor e Aprovacao de Mentorados

## Status: ✅ IMPLEMENTADO

---

## O Que Foi Implementado

### 1. Funções RPC no Banco de Dados
- `is_first_mentor()` - Verifica se existe mentor no sistema
- `assign_role(_user_id, _role)` - Atribui role com validação
- `approve_mentorado(_user_id, _mentor_id)` - Aprova mentorado e cria registro
- `get_pending_users()` - Lista usuários aguardando aprovação

### 2. Página de Setup Inicial (`/setup`)
- Verifica automaticamente se já existe mentor
- Redireciona para `/auth` se mentor existir
- Formulário premium com campos: Nome da Mentoria, Nome, Email, Senha
- Atribui role `mentor` automaticamente após signup

### 3. Página de Gestão de Mentorados (`/admin/mentorados`)
- Lista usuários pendentes de aprovação
- Lista mentorados ativos
- Cards com avatar, email, data de cadastro
- Botão de aprovação com feedback visual
- Estatísticas: Pendentes, Ativos, Total

### 4. Hook useAuth Atualizado
- Nova função `assignRole(role)` para atribuir roles
- Integração com RPC functions

### 5. Rotas Atualizadas
- `/setup` - Rota pública para setup inicial
- `/admin/mentorados` - Página real (não mais placeholder)

---

## Fluxo de Uso

### Primeiro Acesso (Mentor):
1. Acesse `/setup`
2. Preencha os dados
3. Confirme email
4. Faça login em `/auth`
5. Será redirecionado para `/admin`

### Novos Mentorados:
1. Acessam `/auth` e criam conta
2. Após confirmar email e fazer login, veem "Aguardando aprovação"
3. Mentor acessa `/admin/mentorados`
4. Mentor clica em "Aprovar"
5. Mentorado pode acessar `/app`

---

## Arquivos Criados/Modificados

| Arquivo | Status |
|---------|--------|
| `src/pages/Setup.tsx` | ✅ Criado |
| `src/pages/admin/Mentorados.tsx` | ✅ Criado |
| `src/hooks/useAuth.tsx` | ✅ Modificado |
| `src/App.tsx` | ✅ Modificado |
| Migração SQL | ✅ Executada |
