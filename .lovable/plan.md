
# Plano: Corrigir Sincronizacao do Dev Mode Selector

## Problema Identificado

O sistema tem dois contextos desconectados:

1. **DevModeContext** - Gerencia o `overrideRole` no estado React
2. **AuthContext** - Le o localStorage diretamente (uma vez so, nao reativo)

Quando voce alterna no seletor:
- O `DevModeContext` atualiza o estado E o localStorage
- O `AuthContext` continua usando o valor antigo (leu na inicializacao)
- O `ProtectedRoute` usa o valor desatualizado do `AuthContext`
- Resultado: navegacao acontece mas a rota bloqueia baseado na role errada

---

## Solucao: Unificar os Contextos

Fazer o `useAuth` consumir o `overrideRole` diretamente do `DevModeContext`, ao inves de ler do localStorage.

---

## Mudancas Necessarias

### 1. Remover leitura de localStorage do AuthProvider

**Arquivo:** `src/hooks/useAuth.tsx`

Remover:
```typescript
const DEV_MODE_KEY = 'dev_mode_role_override';
const overrideRole = typeof window !== 'undefined' 
  ? localStorage.getItem(DEV_MODE_KEY) as AppRole | null 
  : null;
```

### 2. Criar hook combinado useEffectiveAuth

**Arquivo:** `src/hooks/useEffectiveAuth.tsx` (novo)

```typescript
// Combina useAuth + useDevMode
// Retorna role efetiva considerando override
// Usado pelo ProtectedRoute
```

### 3. Atualizar ProtectedRoute

**Arquivo:** `src/components/ProtectedRoute.tsx`

Usar o novo hook `useEffectiveAuth` que considera o override do DevMode.

### 4. Reorganizar Providers (se necessario)

O `DevModeProvider` precisa estar **dentro** do `AuthProvider` para que o useAuth tenha acesso ao usuario real primeiro.

---

## Fluxo Corrigido

```text
Usuario clica "Alternar para Mentorado"
        |
        v
DevModeContext atualiza overrideRole (estado React)
        |
        v
useEffectiveAuth retorna nova role
        |
        v
ProtectedRoute re-renderiza com role atualizada
        |
        v
Navigate para /app funciona sem bloqueio
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/hooks/useEffectiveAuth.tsx` | Criar (hook que combina auth + devmode) |
| `src/hooks/useAuth.tsx` | Modificar (remover leitura de localStorage) |
| `src/components/ProtectedRoute.tsx` | Modificar (usar useEffectiveAuth) |

---

## Alternativa Mais Simples

Ao inves de criar um novo hook, podemos fazer o ProtectedRoute usar ambos os hooks diretamente:

```typescript
// ProtectedRoute.tsx
const { user, role: realRole, isLoading } = useAuth();
const { overrideRole } = useDevMode();
const effectiveRole = overrideRole || realRole;
```

Esta e a opcao mais rapida e menos invasiva.

---

## Resumo

A raiz do problema e que os contextos nao estao sincronizados. A solucao mais simples e fazer o `ProtectedRoute` consultar **ambos** os contextos e calcular a role efetiva na hora, garantindo que mudancas no DevMode sejam refletidas imediatamente.
