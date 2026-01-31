
# Plano: Ajustar Espacamento do Conteudo para Nao Sobrepor a Sidebar

## Problema Identificado

Nas imagens, o conteudo "Ola, MARCUS" e os cards estao sendo cobertos pela sidebar porque:

- **Floating Dock ocupa**: left 24px + padding 16px + item 48px = ~88px
- **Conteudo tem**: ml-20 = 80px (margem insuficiente)
- **Resultado**: Sobreposicao de ~8-10px

---

## Solucao

Aumentar a margem esquerda do conteudo principal de `ml-20` (80px) para `ml-28` (112px), garantindo espaco entre o dock e o conteudo.

---

## Alteracoes Necessarias

### 1. AdminLayout - Aumentar margem do main

**Arquivo:** `src/components/layouts/AdminLayout.tsx`

Linha 90 - Alterar:
```tsx
<main className="ml-20 pt-20 pr-6 pb-6 min-h-screen">
```

Para:
```tsx
<main className="ml-28 pt-20 px-6 pb-6 min-h-screen">
```

### 2. MemberLayout - Mesma alteracao

**Arquivo:** `src/components/layouts/MemberLayout.tsx`

Linha 75 - Alterar:
```tsx
<main className="ml-20 pt-20 pr-6 pb-6 min-h-screen">
```

Para:
```tsx
<main className="ml-28 pt-20 px-6 pb-6 min-h-screen">
```

---

## Comparacao Visual

| Propriedade | Antes | Depois |
|-------------|-------|--------|
| Margem esquerda | ml-20 (80px) | ml-28 (112px) |
| Espaco livre | ~0px (sobreposto) | ~24px de respiro |
| Padding horizontal | pr-6 apenas | px-6 (ambos os lados) |

---

## Resultado Esperado

- Conteudo fica completamente a direita do Floating Dock
- Espaco de ~24px entre a sidebar e o conteudo
- Layout equilibrado e sem sobreposicao
- Aplica para ambos: Admin e Member

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layouts/AdminLayout.tsx` | Linha 90: ml-20 -> ml-28, pr-6 -> px-6 |
| `src/components/layouts/MemberLayout.tsx` | Linha 75: ml-20 -> ml-28, pr-6 -> px-6 |
