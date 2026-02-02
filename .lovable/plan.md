
# Plano de Rebranding: LBV TECH

## Resumo
Transformar a identidade visual e textual da plataforma de "MentorHub Pro" para **LBV TECH**, criando um logo personalizado com as cores azul escuro, cinza escuro e dourado, e atualizando todos os pontos de contato da marca.

---

## O Que Será Feito

### 1. Criação do Logo LBV TECH
- Novo componente `LBVLogo.tsx` com design premium
- Texto estilizado "LBV" em dourado + "TECH" em azul escuro
- Ícone geométrico moderno (hexágono ou triângulo com gradiente)
- Versões: completa (com texto) e compacta (só ícone)

### 2. Página de Vendas (Landing Page)
- Header: Logo LBV TECH no lugar de "MentorHub"
- Hero: Novo título focado em mentores ("Escale sua mentoria com a LBV TECH")
- Footer: Copyright e marca atualizados
- Manter funcionalidades e features atuais

### 3. Dashboards
- **Admin Layout**: Adicionar logo LBV TECH no header (canto superior esquerdo)
- **Member Layout**: Logo compacto no header junto ao menu
- Floating Dock: Pequeno badge "LBV" no topo da dock

### 4. Meta Tags e SEO
- Atualizar `index.html` com título "LBV TECH - Plataforma para Mentores"
- Meta descriptions otimizadas
- Open Graph tags atualizados

---

## Detalhes Técnicos

### Arquivos a Criar
```text
src/components/LBVLogo.tsx - Componente do logo com variantes
```

### Arquivos a Modificar
```text
src/pages/Index.tsx - Landing page com novo branding
src/components/layouts/AdminLayout.tsx - Logo no painel admin
src/components/layouts/MemberLayout.tsx - Logo na área de membros
index.html - Meta tags e título
```

### Estrutura do Logo (LBVLogo.tsx)
```tsx
// Variantes disponíveis:
<LBVLogo variant="full" />    // Ícone + LBV TECH
<LBVLogo variant="compact" /> // Apenas ícone
<LBVLogo variant="text" />    // Apenas texto

// Tamanhos:
<LBVLogo size="sm" />  // Para headers
<LBVLogo size="md" />  // Padrão
<LBVLogo size="lg" />  // Para landing page
```

### Paleta de Cores (Já Existente)
- **Dourado**: `hsl(45 100% 51%)` - já definido como `--primary`
- **Azul Escuro**: `hsl(220 91% 35%)` - novo tom para acentos
- **Cinza Escuro**: `hsl(240 10% 4%)` - já definido como `--background`

---

## Resultado Visual Esperado

### Landing Page
- Logo LBV TECH no canto superior esquerdo com ícone hexagonal dourado
- Headline: "Escale sua **Mentoria** com **LBV TECH**"
- Footer: "© 2024 LBV TECH. Todos os direitos reservados."

### Dashboards
- Header com logo compacto LBV no canto esquerdo
- Mantém toda a estrutura atual de navegação
- Badge discreto "Powered by LBV TECH" opcional no footer

---

## Observações
- O sistema de cores premium (dourado + azul + cinza escuro) já está configurado
- A estrutura glassmorphism e bento grid será mantida
- Não há mudanças no banco de dados - apenas visual/frontend
