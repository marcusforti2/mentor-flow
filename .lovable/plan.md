
Plano de análise e otimização completa de performance (troca de páginas lenta)

1) Diagnóstico principal (com base no código atual)

Os gargalos mais fortes hoje são:

- Prefetch agressivo demais de rotas:
  - `src/hooks/useRouteChunkPrefetch.ts` pré-carrega praticamente todas as subpáginas de cada área em lote.
  - Isso dispara download + parse de muitos chunks pesados logo após entrar em `/mentor` ou `/mentorado`.

- Páginas sem cache de dados (fetch manual com `useEffect`):
  - Ex.: `Mentorados.tsx`, `JornadaCS.tsx`, `CRMMentorados.tsx`, `Calendario.tsx`, `CentroSOS.tsx`, `EmailMarketing.tsx`, `WhatsAppCampaigns.tsx`.
  - Cada navegação remonta e refaz consultas, gerando “loading” recorrente.

- Waterfall e joins no cliente:
  - Várias telas fazem múltiplas consultas sequenciais (`memberships -> profiles -> outras tabelas`), aumentando latência.

- Bibliotecas pesadas carregadas cedo:
  - `@xyflow/react` (Flow/Automações), `@tiptap/*` (Playbooks), `jspdf` (ferramentas IA) entram no bundle de páginas importantes.
  - Mesmo quando o usuário não abre editor/mapa, parte do peso já entra.

- Importações pesadas em tabs/modais não abertas:
  - `Automacoes.tsx` importa `AutomationFlowView` direto.
  - `EmailMarketing.tsx` importa `FlowEditor` direto.
  - `member/Playbooks.tsx` importa `PlaybookReadOnly` direto.

- Custo visual constante:
  - `animated-gradient-bg` + `backdrop-filter: blur(...)` em várias camadas globais (`src/index.css`) aumentam custo de render/composição.

- Duplicidade de hook com realtime:
  - `useSmartAlerts()` é usado em `AlertsBell` e `AlertsPanel`, criando subscriptions duplicadas no layout mentor.

2) Estratégia de correção (prioridade)

Fase A — Ganho rápido imediato (alto impacto, baixo risco)
- Reduzir prefetch para “smart prefetch”:
  - Prefetch só de 2-3 rotas mais prováveis por área.
  - Usar `requestIdleCallback` + checagem de conexão lenta (`saveData`, `2g`) para pular prefetch pesado.
- Lazy load de componentes pesados por demanda:
  - `FlowEditor`, `AutomationFlowView`, `PlaybookReadOnly`, ferramentas IA (cada tool lazy quando clicada).
- Evitar hook duplicado de alertas:
  - Ler `useSmartAlerts()` 1x no layout e repassar props para Bell/Panel.

Fase B — Refatoração de dados para navegação fluida
- Migrar páginas críticas de `useEffect + setState` para React Query:
  - `Mentorados`, `JornadaCS`, `CRMMentorados`, `Calendario`, `CentroSOS`, `EmailMarketing`, `WhatsAppCampaigns`.
- Aplicar cache por tenant/membership com `staleTime` por tela.
- Usar `placeholderData`/`keepPreviousData` para evitar tela “vazia” a cada troca.
- Mostrar skeleton parcial (não travar página inteira com spinner global).

Fase C — Otimização de consultas backend
- Consolidar consultas repetidas em RPC/views para reduzir round-trips.
- Revisar índices compostos para filtros mais usados:
  - `memberships(tenant_id, role, status)`
  - `crm_prospections(tenant_id, membership_id, created_at desc)`
  - `activity_logs(tenant_id, membership_id, created_at desc)`
  - `calendar_events(tenant_id, event_date, event_time)`
  - `sos_requests(tenant_id, status, created_at desc)`
  - `smart_alerts(tenant_id, is_dismissed, created_at desc)`

Fase D — Render/UI performance
- Reduzir efeitos visuais custosos fora do dashboard (gradiente animado, blur alto).
- Manter estilo premium, mas com versão “light” em subpáginas para fluidez.

3) Plano de execução prático

Ordem sugerida:
1. `useRouteChunkPrefetch` (prefetch inteligente e limitado)
2. Lazy loading de módulos pesados (flow/tiptap/ai tools)
3. Refactor das 3 telas mais acessadas primeiro:
   - `Mentorados`, `CRMMentorados`, `Calendario`
4. Refactor das demais telas de mentor
5. Ajustes de backend (RPC/índices)
6. Polimento visual de CSS custoso

4) Critérios de sucesso (meta objetiva)

- Transição entre subpáginas com dados em cache: < 400ms percebido
- Primeira abertura de subpágina: queda de 30-50% no tempo atual
- Redução clara de spinners de tela cheia
- Menos requisições repetidas ao voltar para páginas já visitadas
- Menos travadinhas ao alternar abas/modais pesadas

5) Detalhes técnicos (seção dedicada)

Arquivos-alvo principais:
- Roteamento/prefetch:
  - `src/hooks/useRouteChunkPrefetch.ts`
  - `src/App.tsx`
- Telas com fetch manual (converter para React Query):
  - `src/pages/admin/Mentorados.tsx`
  - `src/pages/admin/JornadaCS.tsx`
  - `src/pages/admin/CRMMentorados.tsx`
  - `src/pages/admin/Calendario.tsx`
  - `src/pages/admin/CentroSOS.tsx`
  - `src/pages/admin/EmailMarketing.tsx`
  - `src/pages/admin/WhatsAppCampaigns.tsx`
- Carregamento pesado condicional:
  - `src/pages/admin/Automacoes.tsx`
  - `src/pages/admin/EmailMarketing.tsx`
  - `src/pages/member/Playbooks.tsx`
  - `src/pages/member/FerramentasIA.tsx`
- Realtime/duplicidade:
  - `src/hooks/useSmartAlerts.tsx`
  - `src/components/admin/AlertsBell.tsx`
  - `src/components/admin/AlertsPanel.tsx`
- Visual performance:
  - `src/index.css`

Resumo: o app não está “quebrado”; ele está sofrendo de combinação de prefetch excessivo + fetch sem cache em várias páginas + import antecipado de módulos pesados. Corrigindo esses três pilares primeiro, a troca de páginas deve ficar significativamente mais rápida.
