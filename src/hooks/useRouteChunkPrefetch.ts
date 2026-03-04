import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

type RouteGroup = 'master' | 'mentor' | 'mentorado';
type Loader = () => Promise<unknown>;

const routePrefetchLoaders: Record<RouteGroup, Loader[]> = {
  master: [
    () => import('../pages/master/PreviewPage'),
    () => import('../pages/master/TenantsPage'),
    () => import('../pages/master/UsersPage'),
    () => import('../pages/master/ConfigPage'),
    () => import('../pages/master/BrandingPage'),
  ],
  mentor: [
    () => import('../pages/admin/Mentorados'),
    () => import('../pages/admin/JornadaCS'),
    () => import('../pages/admin/CRMMentorados'),
    () => import('../pages/admin/Trilhas'),
    () => import('../pages/admin/Calendario'),
    () => import('../pages/admin/CentroSOS'),
    () => import('../pages/admin/EmailMarketing'),
    () => import('../pages/admin/Relatorios'),
    () => import('../pages/admin/MentorPerfil'),
    () => import('../pages/admin/PlaybooksHub'),
    () => import('../pages/admin/Automacoes'),
    () => import('../pages/admin/Popups'),
    () => import('../pages/admin/WhatsAppCampaigns'),
  ],
  mentorado: [
    () => import('../pages/member/Trilhas'),
    () => import('../pages/member/MeuCRM'),
    () => import('../pages/member/Calendario'),
    () => import('../pages/member/CentroSOS'),
    () => import('../pages/member/Perfil'),
    () => import('../pages/member/FerramentasIA'),
    () => import('../pages/member/MeusArquivos'),
    () => import('../pages/member/MinhasTarefas'),
    () => import('../pages/member/Playbooks'),
    () => import('../pages/member/Metricas'),
  ],
};

export function useRouteChunkPrefetch() {
  const { pathname } = useLocation();
  const prefetchedGroups = useRef<Set<RouteGroup>>(new Set());

  useEffect(() => {
    const group: RouteGroup | null = pathname.startsWith('/mentor')
      ? 'mentor'
      : pathname.startsWith('/mentorado')
        ? 'mentorado'
        : pathname.startsWith('/master')
          ? 'master'
          : null;

    if (!group || prefetchedGroups.current.has(group)) return;

    const timeoutId = window.setTimeout(() => {
      prefetchedGroups.current.add(group);
      routePrefetchLoaders[group].forEach((loader) => {
        void loader().catch(() => undefined);
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [pathname]);
}
