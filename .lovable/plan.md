
# Otimizacao de Performance - Carregamento de Paginas

## Problema Identificado

O sistema carrega **todas as 30+ paginas de uma vez** quando o app inicia, mesmo que o usuario so visite uma. Alem disso, cada pagina faz varias consultas ao banco **em sequencia** (waterfall), e nao ha cache configurado — entao toda navegacao repete as mesmas queries do zero.

## Solucao em 3 Frentes

### 1. Lazy Loading de Paginas (impacto maior)

Atualmente todas as paginas sao importadas com `import` estatico no `App.tsx`. Isso significa que o bundle inicial inclui TODO o codigo de todas as paginas.

**Mudanca:** Trocar os imports estaticos por `React.lazy()` + `Suspense`, para que cada pagina so seja carregada quando o usuario navegar ate ela.

Exemplo da mudanca:
- Antes: `import AdminDashboard from "./pages/admin/AdminDashboard";`
- Depois: `const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));`

Isso sera aplicado a todas as ~25 paginas (exceto Auth e Index que sao as de entrada). Um componente `Suspense` com um spinner sera adicionado envolvendo as `Routes`.

### 2. Cache do React Query (impacto medio)

O `QueryClient` atual nao tem configuracao de cache. Cada vez que voce navega, os dados sao buscados novamente.

**Mudanca:** Configurar `staleTime` e `gcTime` no QueryClient para que dados recentes sejam reutilizados:
- `staleTime: 5 minutos` — dados sao considerados "frescos" por 5 min, evitando re-fetch ao voltar para uma pagina
- `gcTime: 10 minutos` — dados ficam em cache por 10 min antes de serem removidos

### 3. Paralelizar Queries do Dashboard (impacto medio)

O hook `useDashboardStats` faz varias rodadas de consultas sequenciais (busca memberships, depois trails, depois rankings, depois profiles...). Algumas dessas rodadas podem ser combinadas ou ja estao em `Promise.all`, mas ha consultas adicionais que rodam em sequencia apos o primeiro batch.

**Mudanca:** Reorganizar as queries dependentes para maximizar paralelismo e reduzir o tempo total de carregamento do dashboard.

---

## Resumo Tecnico

| Arquivo | Mudanca |
|---------|---------|
| `src/App.tsx` | Trocar ~25 imports estaticos por `React.lazy()`, adicionar `Suspense` com fallback de loading |
| `src/App.tsx` | Configurar `QueryClient` com `defaultOptions.queries.staleTime` e `gcTime` |
| `src/hooks/useDashboardStats.tsx` | Reorganizar queries sequenciais em blocos paralelos com `Promise.all` |

## Resultado Esperado

- Navegacao entre paginas sera praticamente instantanea para paginas ja visitadas (cache)
- Carregamento inicial do app sera mais rapido (menos codigo para baixar)
- Dashboard carregara mais rapido (menos tempo esperando queries sequenciais)
- O spinner de "Carregando..." aparecera brevemente apenas na primeira vez que uma pagina for acessada
