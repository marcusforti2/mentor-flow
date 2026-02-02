
# Desktop iMac para Mentorados

## Visão Geral

Transformar a área do mentorado em uma experiência de desktop imersiva estilo macOS, onde o usuário vê uma "mesa" com ícones de aplicativos e pode abrir janelas para cada funcionalidade.

## Fluxo de Navegação

```text
/app (Desktop)
  ├── Ícones na Mesa (Desktop Icons Grid)
  │   ├── Dashboard
  │   ├── Trilhas
  │   ├── Meu CRM
  │   ├── Calendário
  │   ├── Treinamento
  │   ├── Ranking
  │   ├── Centro SOS
  │   └── Meu Perfil
  │
  ├── Dock (barra inferior estilo macOS)
  │   └── Mesmos apps com acesso rápido
  │
  └── Janelas (Windows)
      └── Cada app abre em uma janela arrastável/redimensionável
```

## Componentes a Criar

### 1. DesktopWindow (Janela estilo macOS)
- Barra de título com gradiente sutil
- 3 botões: fechar (vermelho), minimizar (amarelo), maximizar (verde)
- Arraste pela barra de título
- Redimensionamento nas bordas
- Animação de abertura/fechamento (zoom + fade)
- Efeito de glassmorphism no conteúdo

### 2. DesktopIcon (Ícone de aplicativo)
- Ícone grande com gradiente de fundo
- Label abaixo do ícone
- Efeito hover com bounce
- Duplo clique para abrir
- Glow no ícone ativo

### 3. Desktop (Mesa principal)
- Background com wallpaper animado (gradientes atuais)
- Grid de ícones organizável
- Hora e data no canto superior direito
- Avatar do usuário com menu

### 4. DesktopDock (Dock inferior)
- Dock centralizado na parte inferior
- Efeito magnético ao passar o mouse (estilo macOS)
- Indicador de janela aberta (pontinho)
- Separador entre apps e lixeira/configurações

## Estrutura de Arquivos

```text
src/
├── components/
│   └── desktop/
│       ├── Desktop.tsx           # Container principal
│       ├── DesktopIcon.tsx       # Ícone de app
│       ├── DesktopDock.tsx       # Dock inferior
│       ├── DesktopWindow.tsx     # Janela draggable
│       ├── DesktopTopBar.tsx     # Barra superior (hora, wifi, bateria)
│       └── WindowManager.tsx     # Gerenciador de estado das janelas
│
├── hooks/
│   └── useWindowManager.tsx      # Hook para controle de janelas
│
├── pages/member/
│   └── MemberDesktop.tsx         # Nova página principal
```

## Estados das Janelas

Cada janela terá estados controlados:
- `isOpen`: janela está aberta
- `isMinimized`: janela está no dock
- `isMaximized`: janela está em tela cheia
- `position`: coordenadas {x, y}
- `size`: dimensões {width, height}
- `zIndex`: ordem de empilhamento

## Interações

| Ação | Comportamento |
|------|--------------|
| Clique simples no ícone | Seleciona o ícone (borda highlight) |
| Duplo clique no ícone | Abre a janela do app |
| Clique no Dock | Abre ou traz janela para frente |
| Arrastar janela | Move pela tela |
| Botão vermelho | Fecha a janela |
| Botão amarelo | Minimiza para o dock |
| Botão verde | Maximiza/restaura |
| Clique fora | Deseleciona janela |

## Animações

- **Abertura de janela**: Scale de 0.8 para 1 + fade in (200ms)
- **Fechamento**: Scale para 0.8 + fade out (150ms)
- **Minimizar**: Encolhe em direção ao dock (300ms ease-out)
- **Maximizar**: Expande suavemente (200ms)
- **Ícone hover**: Scale 1.1 + bounce

## Integração com Conteúdo Existente

As páginas atuais serão renderizadas DENTRO das janelas:

| App | Componente Interno |
|-----|-------------------|
| Dashboard | `<MemberDashboard />` (atual) |
| Trilhas | `<Trilhas />` |
| Meu CRM | `<MeuCRM />` |
| Treinamento | `<Treinamento />` |
| Centro SOS | `<CentroSOS />` |
| Perfil | `<Perfil />` |

## Detalhes Técnicos

### Persistência de Estado
- Posição das janelas salva em localStorage
- Última configuração de desktop restaurada ao logar

### Performance
- Lazy loading das janelas (só renderiza quando aberta)
- Virtualização do conteúdo em janelas minimizadas

### Responsividade
- Em mobile: manter layout atual (sem desktop)
- Em tablet: desktop simplificado (janelas em fullscreen)
- Em desktop: experiência completa

### CSS Necessário
Adicionar ao `index.css`:
- `.desktop-wallpaper` - fundo animado
- `.desktop-icon` - estilo do ícone
- `.desktop-window` - janela glass
- `.desktop-dock` - dock inferior
- `.window-titlebar` - barra de título
- `.window-button` - botões da janela

## Ordem de Implementação

1. Hook `useWindowManager` - gerenciamento de estado
2. Componente `DesktopWindow` - janela arrastável
3. Componente `DesktopIcon` - ícones da mesa
4. Componente `DesktopDock` - dock inferior
5. Componente `DesktopTopBar` - barra superior
6. Página `MemberDesktop` - composição final
7. Atualizar `MemberLayout` para nova estrutura
8. Estilos CSS para toda a experiência
9. Transições e animações finais
