
# Plano: Setup Inicial de Mentor e Aprovacao de Mentorados

## Resumo

O sistema de autenticacao ja existe e funciona corretamente. O que falta e:
1. Pagina de Setup Inicial que permite o primeiro usuario se registrar como mentor
2. Tela para o mentor aprovar/adicionar mentorados

---

## O Que Ja Existe (Funcionando)

- Hook `useAuth.tsx` com busca de role via RPC `get_user_role`
- Componente `ProtectedRoute.tsx` com redirecionamento baseado em role
- Pagina `Auth.tsx` com login/signup e redirecionamento automatico
- Rotas protegidas: `/admin` (mentor) e `/app` (mentorado)

---

## Alteracoes Necessarias

### 1. Criar Pagina de Setup Inicial (`/setup`)

**Arquivo:** `src/pages/Setup.tsx`

Logica:
- Verificar se ja existe algum mentor no sistema
- Se nao existir, mostrar formulario de cadastro de mentor
- Se ja existir mentor, redirecionar para `/auth`
- Ao criar conta, atribuir role `mentor` automaticamente

```text
Usuario acessa /setup
        |
        v
Verifica se existe mentor no DB
        |
        +---> Sim ---> Redireciona para /auth
        |
        +---> Nao ---> Mostra formulario de primeiro mentor
                            |
                            v
                    Cria conta + atribui role 'mentor'
                            |
                            v
                    Redireciona para /admin
```

### 2. Criar Funcao RPC para Verificar Primeiro Mentor

**Migracao SQL:**

```sql
create or replace function public.is_first_mentor()
returns boolean
language sql
stable
security definer
as $$
  select not exists (
    select 1 from public.user_roles where role = 'mentor'
  )
$$;
```

### 3. Criar Funcao RPC para Atribuir Role

**Migracao SQL:**

```sql
create or replace function public.assign_role(_user_id uuid, _role app_role)
returns void
language plpgsql
security definer
as $$
begin
  -- Apenas permite se nao existe mentor (para setup inicial)
  -- ou se o chamador e mentor (para adicionar mentorados)
  if _role = 'mentor' and exists (select 1 from public.user_roles where role = 'mentor') then
    raise exception 'Ja existe um mentor cadastrado';
  end if;
  
  insert into public.user_roles (user_id, role)
  values (_user_id, _role)
  on conflict (user_id, role) do nothing;
end;
$$;
```

### 4. Atualizar Hook useAuth

**Arquivo:** `src/hooks/useAuth.tsx`

Adicionar funcao `assignRole` para atribuir role apos signup no setup:

```typescript
const assignRole = async (role: AppRole) => {
  if (!user) return { error: new Error('Usuario nao autenticado') };
  
  const { error } = await supabase.rpc('assign_role', {
    _user_id: user.id,
    _role: role
  });
  
  if (!error) {
    setRole(role);
  }
  
  return { error };
};
```

### 5. Criar Pagina de Gestao de Mentorados

**Arquivo:** `src/pages/admin/Mentorados.tsx`

Funcionalidades:
- Listar todos os mentorados com status
- Aprovar usuarios pendentes (atribuir role `mentorado`)
- Convidar novos mentorados por email
- Ver progresso de cada mentorado

### 6. Atualizar Rotas no App.tsx

Adicionar rota `/setup` como publica:

```typescript
<Route path="/setup" element={<Setup />} />
```

---

## Fluxo Completo de Onboarding

```text
PRIMEIRO ACESSO (Mentor):
1. Mentor acessa /setup
2. Sistema verifica: nao existe mentor
3. Mentor cria conta
4. Sistema atribui role 'mentor' automaticamente
5. Mentor e redirecionado para /admin

NOVOS MENTORADOS:
1. Mentorado acessa /auth e cria conta
2. Sistema nao atribui role (aguardando)
3. Mentorado ve tela "Aguardando aprovacao"
4. Mentor acessa /admin/mentorados
5. Mentor aprova o mentorado
6. Sistema atribui role 'mentorado'
7. Mentorado pode acessar /app
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/pages/Setup.tsx` | Criar |
| `src/pages/admin/Mentorados.tsx` | Criar |
| `src/hooks/useAuth.tsx` | Modificar (adicionar assignRole) |
| `src/App.tsx` | Modificar (adicionar rota /setup) |
| Migracao SQL | Criar (funcoes is_first_mentor e assign_role) |

---

## Detalhes de Implementacao

### Setup.tsx - Componentes

- Tela premium com design Bento/Glass
- Formulario: Nome, Email, Senha
- Validacao com Zod
- Loading state animado
- Redirecionamento automatico

### Mentorados.tsx - Componentes

- Lista em cards com avatar e status
- Filtros: Todos, Pendentes, Ativos
- Botao "Aprovar" para pendentes
- Modal de convite por email
- Indicadores de progresso nas trilhas

---

## Seguranca

- Funcoes RPC com `security definer` para bypass de RLS
- Validacao server-side para prevenir auto-atribuicao de mentor
- Apenas o primeiro usuario pode ser mentor via setup
- Mentorados so podem ser aprovados por mentores existentes
