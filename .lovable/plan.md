
# Plano: Seletor de Modo Dev (Mentor/Mentorado)

## Objetivo
Criar um componente flutuante que permite alternar entre as visoes de Mentor e Mentorado sem precisar fazer logout. Util para desenvolvimento e testes internos.

---

## Componente a Criar

### DevModeSelector (`src/components/DevModeSelector.tsx`)

Caracteristicas:
- Botao flutuante no canto inferior direito
- Design premium com glassmorphism
- Mostra o modo atual (Mentor/Mentorado)
- Toggle para alternar instantaneamente
- Redireciona automaticamente para o painel correto

---

## Implementacao Tecnica

### 1. Criar Hook de Dev Mode

**Arquivo:** `src/hooks/useDevMode.tsx`

```typescript
// Armazena override de role no localStorage
// Permite simular qualquer role sem mudar DB
// Funciona apenas em desenvolvimento
```

### 2. Criar Componente Visual

**Arquivo:** `src/components/DevModeSelector.tsx`

Elementos:
- Icone de ferramenta/dev
- Label do modo atual
- Switch/Toggle para alternar
- Badge indicando "DEV MODE"

### 3. Modificar useAuth

Adicionar suporte a role override:
- Verificar se existe override no localStorage
- Usar override ao inves de role real do DB
- Manter funcionalidade normal quando nao ha override

### 4. Adicionar aos Layouts

Incluir o DevModeSelector em:
- `AdminLayout.tsx`
- `MemberLayout.tsx`

---

## Fluxo de Uso

```text
Usuario logado como Mentor
        |
        v
Clica no seletor "Mudar para Mentorado"
        |
        v
Override salvo no localStorage
        |
        v
Redirecionado para /app
        |
        v
Ve a interface de Mentorado
```

---

## Design do Componente

```text
+----------------------------------+
|  [Icone]  Modo: MENTOR     [X]  |
|  --------------------------------|
|  [o----] Mentor                  |
|  [----o] Mentorado               |
+----------------------------------+
```

- Botao minimizado: apenas icone com indicador
- Ao clicar: expande com opcoes
- Cores distintas para cada modo

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/hooks/useDevMode.tsx` | Criar |
| `src/components/DevModeSelector.tsx` | Criar |
| `src/hooks/useAuth.tsx` | Modificar (suporte a override) |
| `src/components/layouts/AdminLayout.tsx` | Modificar (adicionar componente) |
| `src/components/layouts/MemberLayout.tsx` | Modificar (adicionar componente) |
| `src/components/ProtectedRoute.tsx` | Modificar (respeitar override) |

---

## Seguranca

- Override funciona apenas no client-side (localStorage)
- Nao afeta dados reais do banco
- Pode ser facilmente desativado removendo o componente
- Recomendado remover antes de ir para producao

---

## Bonus: Indicador Visual

Quando o dev mode estiver ativo, mostrar uma barra sutil no topo:
```text
[DEV MODE] Visualizando como: Mentorado | Voltar ao normal
```

Isso evita confusao sobre qual modo esta ativo.
