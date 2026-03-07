import { useRef, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteTransitionProps {
  children: ReactNode;
}

/**
 * Lightweight CSS-only route transition.
 * Fades new content in (~150ms) without blocking navigation.
 */
export function RouteTransition({ children }: RouteTransitionProps) {
  const { pathname } = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setIsTransitioning(true);
      // Let the browser paint the opacity-0 frame, then fade in
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsTransitioning(false));
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [pathname]);

  return (
    <div
      className="transition-opacity duration-150 ease-out"
      style={{ opacity: isTransitioning ? 0 : 1 }}
    >
      {children}
    </div>
  );
}
