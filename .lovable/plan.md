
## Plano: Apresentacao Fullscreen Premium no Master Admin

### Objetivo

Criar uma pagina de apresentacao (slideshow) dentro da area Master Admin, acessivel pelo menu lateral (Floating Dock). A apresentacao sera fullscreen com navegacao por teclado (setas e ESC), branding premium escuro da LBV TECH, e representacoes visuais das telas do sistema como "prints".

### Arquitetura da Solucao

A apresentacao sera um componente React standalone com:
- **Fullscreen API** nativa do browser (document.requestFullscreen)
- **Navegacao por teclado**: setas esquerda/direita para slides, ESC para sair do fullscreen
- **Transicoes suaves** entre slides com animacao de fade/slide
- **8 slides** com todo o conteudo do relatorio
- **Mini-mockups visuais** das telas do sistema (feitos em CSS/componentes) no lugar de screenshots reais, prontos para substituir por imagens reais no futuro

### Estrutura dos Slides

1. **Capa** - Logo LBV TECH grande, titulo "Sistema Operacional de Governo para Mentorias", gradiente premium
2. **Visao Geral** - O que e a plataforma, proposta de valor em 4 pilares
3. **Area do Aluno - Dashboard e Arsenal IA** - Bento Grid, 8 ferramentas de IA, mini-mockup do dashboard
4. **Area do Aluno - CRM, Trilhas e Comunidade** - CRM Vision AI, Trilhas Netflix, Comunidade, SOS, mini-mockups
5. **Painel do Mentor - Dashboard e Gestao** - KPIs, gestao de mentorados, CRM unificado, mini-mockup
6. **Painel do Mentor - Automacao e Relatorios** - Email Marketing, Jornada CS, Relatorios, Rankings
7. **Diferenciais Tecnologicos e Seguranca** - Tabela de diferenciais, arquitetura de seguranca, hierarquia de papeis
8. **Jornada do Mentorado e Metricas de Valor** - Fluxo de 14 passos, valor para mentor vs mentorado

### Navegacao Visual

Cada slide tera:
- Indicador de progresso (dots) no rodape
- Numero do slide (ex: "3 / 8") discreto no canto
- Logo LBV TECH pequeno no canto superior esquerdo
- Botao de fullscreen no canto superior direito
- Hint "Use as setas para navegar | ESC para sair" no primeiro slide

### Representacao Visual das Telas

Em vez de screenshots estaticos (que podem ficar desatualizados), vou criar **mini-mockups estilizados** usando CSS que representam visualmente cada tela principal:
- Dashboard do Aluno (bento grid simplificado com cards coloridos)
- CRM Kanban (colunas com cards de lead)
- Arsenal de IA (grid de 8 icones com labels)
- Dashboard do Mentor (KPIs + graficos simplificados)
- Trilhas Netflix (carrossel com thumbnails)

Esses mockups serao componentes React embutidos, mantendo o branding consistente.

### Secao Tecnica

**Arquivos a criar:**
- `src/pages/master/ApresentacaoPage.tsx` - Componente principal com logica de slides, fullscreen e teclado
- `src/components/presentation/SlideRenderer.tsx` - Renderizador individual de cada slide com mini-mockups

**Arquivos a modificar:**
- `src/App.tsx` - Adicionar rota `/master/apresentacao`
- `src/components/layouts/MasterLayout.tsx` - Adicionar item "Apresentacao" no menuItems do Floating Dock (icone: Presentation/Monitor)

**Logica do componente principal:**

```text
Estado:
  - currentSlide: number (0 a 7)
  - isFullscreen: boolean

Efeitos:
  - useEffect para KeyboardEvent listener (ArrowLeft, ArrowRight, Escape)
  - useEffect para fullscreenchange event

Funcoes:
  - enterFullscreen() -> containerRef.requestFullscreen()
  - exitFullscreen() -> document.exitFullscreen()
  - nextSlide() / prevSlide() com limites

Render:
  - Container ref com bg escuro absoluto
  - Header: logo + numero do slide + botao fullscreen
  - Area do slide: conteudo renderizado com transicao CSS
  - Footer: dots de navegacao + hint de teclado
```

**Estilo visual dos slides:**
- Fundo: gradiente from-slate-950 via-slate-900 to-slate-950 (mesmo do MasterLayout)
- Textos: Space Grotesk para titulos, Inter para corpo
- Destaques: cor dourada (hsl(45 100% 51%)) para titulos e acentos
- Cards internos: glassmorphism (glass-card) com borda sutil
- Transicao entre slides: opacity + translateX com 300ms ease

**Dependencias:** Nenhuma nova - apenas React, Lucide icons e CSS existentes.
