import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchRoute } from '@/lib/routePrefetch';

type RouteGroup = 'master' | 'mentor' | 'mentorado';

// Prefetch ALL routes in the active group on idle
const groupRoutes: Record<RouteGroup, string[]> = {
  master: [
    '/master',
    '/master/tenants',
    '/master/users',
    '/master/config',
    '/master/branding',
    '/master/domains',
    '/master/preview',
  ],
  mentor: [
    '/mentor',
    '/mentor/mentorados',
    '/mentor/jornada-cs',
    '/mentor/crm',
    '/mentor/trilhas',
    '/mentor/calendario',
    '/mentor/sos',
    '/mentor/emails',
    '/mentor/relatorios',
    '/mentor/perfil',
    '/mentor/playbooks',
    '/mentor/automacoes',
    '/mentor/popups',
    '/mentor/whatsapp',
    '/mentor/formularios',
  ],
  mentorado: [
    '/mentorado',
    '/mentorado/trilhas',
    '/mentorado/meu-crm',
    '/mentorado/calendario',
    '/mentorado/sos',
    '/mentorado/perfil',
    '/mentorado/ferramentas',
    '/mentorado/meus-arquivos',
    '/mentorado/tarefas',
    '/mentorado/playbooks',
    '/mentorado/metricas',
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

    // Skip prefetch on slow connections
    const nav = navigator as any;
    if (nav.connection && (nav.connection.saveData || nav.connection.effectiveType === '2g')) return;

    const schedule = typeof requestIdleCallback === 'function' ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 300);
    const cancelSchedule = typeof cancelIdleCallback === 'function' ? cancelIdleCallback : clearTimeout;

    const handle = schedule(() => {
      prefetchedGroups.current.add(group);
      // Stagger prefetches to avoid network contention
      groupRoutes[group].forEach((path, i) => {
        setTimeout(() => prefetchRoute(path), i * 100);
      });
    });

    return () => cancelSchedule(handle as any);
  }, [pathname]);
}
