
# Plano: Corrigir Sobreposicao Visual do Floating Dock

## Problema Identificado

O Floating Dock (barra lateral de navegacao) usa efeito glassmorphism com:
- Background semi-transparente (`hsl(var(--glass-bg))` = 60% opacidade)
- Blur de fundo (`backdrop-filter: blur(24px)`)
- `z-index: 50`

Isso faz com que o conteudo por tras fique visivel atraves da barra, criando uma sobreposicao visual confusa.

---

## Solucao Proposta

Tornar o Floating Dock com background **solido** (sem transparencia), mantendo o visual premium.

---

## Alteracao Necessaria

**Arquivo:** `src/index.css`

Alterar a classe `.floating-dock` de:
```css
background: hsl(var(--glass-bg)); /* 60% transparente */
backdrop-filter: blur(24px) saturate(180%);
```

Para:
```css
background: hsl(var(--card)); /* Solido, cor do card */
/* Remover backdrop-filter */
```

---

## Codigo Atual vs Novo

| Propriedade | Atual | Novo |
|-------------|-------|------|
| Background | `hsl(240 10% 8% / 0.6)` | `hsl(240 10% 8%)` (100% opaco) |
| Backdrop Filter | `blur(24px) saturate(180%)` | Removido |
| Border | Mantido | Mantido |
| Shadow | Mantido | Mantido |

---

## Resultado Esperado

- Barra lateral totalmente opaca
- Conteudo atras nao sera mais visivel
- Visual ainda premium com sombra e borda sutil
- Melhor separacao visual entre navegacao e conteudo

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | Alterar `.floating-dock` para background solido |

