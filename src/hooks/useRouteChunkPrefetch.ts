import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

type RouteGroup = 'master' | 'mentor' | 'mentorado';
type Loader = () => Promise<unknown>;

// Only prefetch the 3 most-visited routes per group
const routePrefetchLoaders: Record<RouteGroup, Loader[]> = {
  master: [
    () => import('../pages/master/TenantsPage'),
    () => import('../pages/master/UsersPage'),
  ],
  mentor: [
    () => import('../pages/admin/Mentorados'),
    () => import('../pages/admin/Calendario'),
    () => import('../pages/admin/CRMMentorados'),
  ],
  mentorado: [
    () => import('../pages/member/MeuCRM'),
    () => import('../pages/member/Trilhas'),
    () => import('../pages/member/FerramentasIA'),
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

    const schedule = typeof requestIdleCallback === 'function' ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 500);
    const cancelSchedule = typeof cancelIdleCallback === 'function' ? cancelIdleCallback : clearTimeout;

    const handle = schedule(() => {
      prefetchedGroups.current.add(group);
      routePrefetchLoaders[group].forEach((loader) => {
        void loader().catch(() => undefined);
      });
    });

    return () => cancelSchedule(handle as any);
  }, [pathname]);
}
