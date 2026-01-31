
# Plano: Floating Dock Premium com Efeito Vidro

## Efeitos a Implementar

### 1. Glassmorphism Avancado
- Blur de fundo (backdrop-filter)
- Transparencia elegante
- Reflexo de luz no topo

### 2. Borda com Gradiente Animado
- Borda que brilha sutilmente
- Gradiente dourado/azul rotacionando

### 3. Glow Externo Sutil
- Sombra colorida ao redor
- Pulsa suavemente

### 4. Hover Magnetico nos Itens
- Itens crescem ao passar o mouse (efeito macOS Dock)
- Itens vizinhos tambem crescem um pouco

---

## Alteracoes no CSS

**Arquivo:** `src/index.css`

### Floating Dock Principal
```css
.floating-dock {
  /* Glassmorphism */
  background: hsl(240 10% 8% / 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  
  /* Borda com gradiente */
  border: 1px solid transparent;
  background-image: 
    linear-gradient(hsl(240 10% 8% / 0.7), hsl(240 10% 8% / 0.7)),
    linear-gradient(135deg, hsl(var(--primary) / 0.5), hsl(var(--accent) / 0.3), hsl(var(--primary) / 0.2));
  background-origin: border-box;
  background-clip: padding-box, border-box;
  
  /* Sombra com glow */
  box-shadow: 
    0 8px 32px hsl(0 0% 0% / 0.4),
    0 0 60px hsl(var(--primary) / 0.1),
    inset 0 1px 0 hsl(0 0% 100% / 0.1);
}
```

### Reflexo de Luz no Topo
```css
.floating-dock::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    hsl(0 0% 100% / 0.1) 0%,
    transparent 40%
  );
  pointer-events: none;
}
```

### Animacao de Glow Pulsante
```css
.floating-dock::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
  z-index: -1;
  opacity: 0.3;
  filter: blur(15px);
  animation: dock-glow 3s ease-in-out infinite;
}

@keyframes dock-glow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.02); }
}
```

### Efeito Hover Magnetico nos Itens
```css
.dock-item {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-item:hover {
  transform: scale(1.25);
  background: hsl(var(--primary) / 0.15);
}

/* Itens vizinhos tambem crescem */
.dock-item:hover + .dock-item,
.dock-item:has(+ .dock-item:hover) {
  transform: scale(1.1);
}
```

---

## Resultado Visual Esperado

| Efeito | Descricao |
|--------|-----------|
| Vidro fosco | Fundo semi-transparente com blur |
| Borda brilhante | Gradiente dourado/azul sutil |
| Reflexo superior | Linha de luz no topo |
| Glow pulsante | Brilho suave ao redor |
| Hover magnetico | Itens crescem estilo macOS |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | Reescrever secao `.floating-dock` com efeitos premium |
