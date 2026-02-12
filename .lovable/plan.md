

## Ocultar Comunidade, Loja de Premios e Ranking

### O que sera removido

**Mentorado (dock + dashboard + rotas):**
- Comunidade (`/mentorado/comunidade`)
- Loja de Premios (`/mentorado/loja`)
- Ranking (`/mentorado/ranking`)

**Mentor (dock + dashboard):**
- Rankings (`/mentor/ranking`) -- e uma pagina placeholder, sem funcionalidade

**Dashboard do Mentorado -- cards removidos:**
- Card "Posicao no Ranking" (BentoCard sm com Trophy)
- Quick Action "Ver Ranking" (terceira coluna do card wide)
- Link "Loja" no card de Conquistas (badges)

**Dashboard do Mentor -- cards removidos:**
- Card "Top Ranking" (BentoCard md com Trophy)

---

### Arquivos alterados

1. **`src/components/layouts/MentoradoLayout.tsx`** (linhas 36, 39, 41)
   - Remover do array `menuItems`: Comunidade, Loja de Premios, Ranking
   - Remover imports nao utilizados: `Users`, `Gift`, `Trophy`

2. **`src/components/layouts/MentorLayout.tsx`** (linha 37)
   - Remover do array `menuItems`: Rankings
   - Remover import: `Trophy`

3. **`src/pages/member/MemberDashboard.tsx`**
   - Remover card de Ranking (linhas 162-173)
   - Substituir quick action "Ver Ranking" por outro util (ex: "Meus Arquivos" ou "Centro SOS")
   - Remover link "/app/loja" do card de badges, manter apenas a contagem de pontos sem link
   - Remover import `Gift`

4. **`src/pages/admin/AdminDashboard.tsx`**
   - Remover card "Top Ranking" (linhas 270-313)
   - Remover `RankingItem` component
   - Remover link `/mentor/ranking` references

5. **`src/App.tsx`**
   - Remover rotas: `/mentorado/comunidade`, `/mentorado/loja`, `/mentorado/ranking`, `/mentor/ranking`
   - Remover imports: `Comunidade`, `LojaPremios`

As rotas serao removidas para que nao sejam acessiveis nem por URL direta. Os componentes de pagina (`Comunidade.tsx`, `LojaPremios.tsx`) serao mantidos no codigo para reativacao futura.

