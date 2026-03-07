/**
 * Route-level chunk prefetch registry.
 * Maps route paths to their lazy import loaders so we can
 * trigger downloads on hover/focus BEFORE the user clicks.
 */

type Loader = () => Promise<unknown>;

const routeLoaders: Record<string, Loader> = {
  // Master
  '/master': () => import('@/pages/master/MasterDashboard'),
  '/master/preview': () => import('@/pages/master/PreviewPage'),
  '/master/tenants': () => import('@/pages/master/TenantsPage'),
  '/master/users': () => import('@/pages/master/UsersPage'),
  '/master/config': () => import('@/pages/master/ConfigPage'),
  '/master/branding': () => import('@/pages/master/BrandingPage'),
  '/master/domains': () => import('@/pages/master/DomainsPage'),

  // Mentor / Admin
  '/mentor': () => import('@/pages/admin/AdminDashboard'),
  '/mentor/mentorados': () => import('@/pages/admin/Mentorados'),
  '/mentor/jornada-cs': () => import('@/pages/admin/JornadaCS'),
  '/mentor/crm': () => import('@/pages/admin/CRMMentorados'),
  '/mentor/trilhas': () => import('@/pages/admin/Trilhas'),
  '/mentor/calendario': () => import('@/pages/admin/Calendario'),
  '/mentor/sos': () => import('@/pages/admin/CentroSOS'),
  '/mentor/emails': () => import('@/pages/admin/EmailMarketing'),
  '/mentor/relatorios': () => import('@/pages/admin/Relatorios'),
  '/mentor/perfil': () => import('@/pages/admin/MentorPerfil'),
  '/mentor/devtools': () => import('@/pages/admin/DevTools'),
  '/mentor/propriedade-intelectual': () => import('@/pages/admin/PropriedadeIntelectual'),
  '/mentor/playbooks': () => import('@/pages/admin/PlaybooksHub'),
  '/mentor/automacoes': () => import('@/pages/admin/Automacoes'),
  '/mentor/popups': () => import('@/pages/admin/Popups'),
  '/mentor/whatsapp': () => import('@/pages/admin/WhatsAppCampaigns'),
  '/mentor/formularios': () => import('@/pages/admin/OnboardingBuilder'),

  // Mentorado / Member
  '/mentorado': () => import('@/pages/member/MemberDashboard'),
  '/mentorado/trilhas': () => import('@/pages/member/Trilhas'),
  '/mentorado/meu-crm': () => import('@/pages/member/MeuCRM'),
  '/mentorado/calendario': () => import('@/pages/member/Calendario'),
  '/mentorado/sos': () => import('@/pages/member/CentroSOS'),
  '/mentorado/perfil': () => import('@/pages/member/Perfil'),
  '/mentorado/ferramentas': () => import('@/pages/member/FerramentasIA'),
  '/mentorado/meus-arquivos': () => import('@/pages/member/MeusArquivos'),
  '/mentorado/tarefas': () => import('@/pages/member/MinhasTarefas'),
  '/mentorado/playbooks': () => import('@/pages/member/Playbooks'),
  '/mentorado/metricas': () => import('@/pages/member/Metricas'),
};

const prefetched = new Set<string>();

/**
 * Prefetch the JS chunk for a given route path.
 * Safe to call multiple times — each path only loads once.
 */
export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const loader = routeLoaders[path];
  if (loader) {
    prefetched.add(path);
    loader().catch(() => {
      // Allow retry on failure
      prefetched.delete(path);
    });
  }
}

/**
 * Returns onMouseEnter / onFocus handlers that trigger prefetch.
 * Attach to any <Link> or navigation element.
 */
export function getPrefetchHandlers(path: string) {
  const handler = () => prefetchRoute(path);
  return {
    onMouseEnter: handler,
    onFocus: handler,
  };
}
