
# Plano: Pagina de Trilhas Estilo Netflix

## Objetivo

Criar uma experiencia visual premium para o mentorado consumir trilhas de conteudo sobre estruturacao de negocios de educacao high ticket (mentorias, conselhos, consultorias). Design inspirado na Netflix com carrosseis horizontais, capas atrativas e player de video integrado.

---

## Estrutura de Dados Existente

O banco ja possui as tabelas necessarias:

```text
trails (Trilhas)
  |-- id, title, description, thumbnail_url
  |
  +-- trail_modules (Modulos)
        |-- id, title, description, order_index
        |
        +-- trail_lessons (Aulas)
              |-- id, title, content_url (YouTube), duration_minutes
              |
              +-- trail_progress (Progresso do Mentorado)
                    |-- mentorado_id, lesson_id, completed, progress_percent
```

---

## Componentes a Criar

### 1. Pagina Principal - Trilhas.tsx

Layout estilo Netflix com:

- **Hero Banner**: Trilha em destaque com gradiente, titulo grande e botao "Continuar Assistindo"
- **Carrosseis Horizontais**: Uma linha para cada categoria
  - Continuar Assistindo (baseado no progresso)
  - Trilha em Destaque
  - Todas as Trilhas
- **Scroll horizontal suave** com setas de navegacao

### 2. TrailCard Component

Card de trilha com:
- Thumbnail (imagem de capa)
- Titulo e descricao curta
- Barra de progresso
- Badge de quantidade de aulas
- Efeito hover com scale e glow

### 3. LessonCard Component

Card de aula individual:
- Thumbnail do video YouTube (gerado automaticamente)
- Titulo e duracao
- Icone de play overlay
- Status (concluido/em andamento/novo)

### 4. VideoPlayerModal Component

Modal fullscreen para assistir videos:
- Player do YouTube embed responsivo
- Titulo da aula
- Botao de fechar
- Marcacao automatica de progresso

### 5. TrailDetailSheet Component

Sheet lateral (drawer) ao clicar em uma trilha:
- Header com capa e titulo
- Lista de modulos expansiveis
- Lista de aulas com status
- Botao "Continuar de onde parou"

---

## Dados Mock para Simulacao

Trilhas de exemplo sobre educacao high ticket:

| Trilha | Modulos | Aulas |
|--------|---------|-------|
| Fundamentos do High Ticket | 4 | 16 |
| Prospecao de Clientes Premium | 3 | 12 |
| Fechamento de Vendas Consultivas | 3 | 10 |
| Estruturando sua Mentoria | 4 | 14 |
| Posicionamento e Autoridade | 3 | 9 |

Videos simulados com thumbnails do YouTube (usando IDs reais de videos publicos sobre o tema).

---

## Estilizacao Premium

### CSS Novo (index.css)

```css
/* Netflix-style Trail Cards */
.trail-card {
  aspect-ratio: 16/9;
  border-radius: 0.5rem;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
}

.trail-card:hover {
  transform: scale(1.05);
  z-index: 10;
  box-shadow: 0 20px 40px hsl(0 0% 0% / 0.5);
}

/* Carousel */
.trail-carousel {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

/* Hero Banner */
.trail-hero {
  height: 60vh;
  background-size: cover;
  background-position: center;
  position: relative;
}

.trail-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    hsl(var(--background)) 0%,
    transparent 50%,
    hsl(var(--background) / 0.5) 100%
  );
}
```

---

## Estrutura de Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/member/Trilhas.tsx` | Pagina principal com hero e carrosseis |
| `src/components/trails/TrailCard.tsx` | Card de trilha com thumbnail |
| `src/components/trails/LessonCard.tsx` | Card de aula individual |
| `src/components/trails/TrailCarousel.tsx` | Carrossel horizontal |
| `src/components/trails/VideoPlayerModal.tsx` | Modal com player YouTube |
| `src/components/trails/TrailDetailSheet.tsx` | Sheet lateral com detalhes |
| `src/data/mockTrails.ts` | Dados mock das trilhas |
| `src/index.css` | Estilos Netflix adicionais |

---

## Fluxo do Usuario

1. Mentorado acessa `/app/trilhas`
2. Ve hero com trilha em destaque e botao "Continuar"
3. Navega pelos carrosseis horizontais
4. Clica em uma trilha -> abre Sheet com modulos/aulas
5. Clica em uma aula -> abre Modal com video YouTube
6. Ao assistir, progresso e atualizado automaticamente
7. Trilhas concluidas mostram badge de certificado

---

## Integracao com Banco

- Buscar trilhas publicadas via Supabase
- Salvar progresso do mentorado em `trail_progress`
- Calcular porcentagem de conclusao por trilha
- Listar "Continuar Assistindo" baseado no ultimo progresso

---

## Resultado Visual Esperado

Interface premium estilo streaming com:
- Fundo escuro com gradientes sutis
- Cards com efeito hover de elevacao
- Transicoes suaves entre estados
- Player de video integrado
- Progresso visual em cada card
- Layout totalmente responsivo
