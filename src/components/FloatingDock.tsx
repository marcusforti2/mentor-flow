import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon, MoreHorizontal, X } from 'lucide-react';
import { getPrefetchHandlers } from '@/lib/routePrefetch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

export interface DockItem {
  icon: LucideIcon;
  label: string;
  path?: string;
  children?: DockItem[];
}

interface FloatingDockProps {
  items: DockItem[];
  position?: 'left' | 'bottom';
  collapsed?: boolean;
}

const MOBILE_VISIBLE_COUNT = 4;

export function FloatingDock({ items, position = 'left', collapsed = false }: FloatingDockProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  
  const panelRef = useRef<HTMLDivElement>(null);
  

  // Close expanded group on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpandedGroup(null);
      }
    };
    if (expandedGroup) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expandedGroup]);

  // Close group on route change
  useEffect(() => {
    setExpandedGroup(null);
    setMoreOpen(false);
  }, [location.pathname]);

  const isItemActive = (item: DockItem): boolean => {
    if (item.path) {
      return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    }
    if (item.children) {
      return item.children.some(c => c.path && (location.pathname === c.path || location.pathname.startsWith(c.path + '/')));
    }
    return false;
  };

  const flatItems = items;
  const visibleItems = isMobile ? flatItems.slice(0, MOBILE_VISIBLE_COUNT) : flatItems;
  const overflowItems = isMobile ? flatItems.slice(MOBILE_VISIBLE_COUNT) : [];
  const hasOverflow = overflowItems.length > 0;
  const activeInOverflow = overflowItems.some(item => isItemActive(item));

  const renderMobileLabel = (label: string, isActive: boolean) => (
    <span className={cn(
      "text-[9px] leading-none font-medium truncate max-w-[52px] transition-colors",
      isActive ? "text-primary-foreground" : "text-muted-foreground"
    )}>
      {label.split(' ')[0]}
    </span>
  );

  const renderDockItem = (item: DockItem, inOverflow = false) => {
    const isActive = isItemActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroup === item.label;

    if (hasChildren) {
      return (
        <div key={item.label} className="relative" ref={isExpanded ? panelRef : undefined}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : item.label)}
                className={cn('dock-item', isActive && 'active')}
              >
                <item.icon className="h-5 w-5" />
                {isMobile && renderMobileLabel(item.label, isActive)}
              </button>
            </TooltipTrigger>
            {!isMobile && (
              <TooltipContent side={position === 'left' ? 'right' : 'top'} className="bg-card border-border">
                <p className="font-medium">{item.label}</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Desktop sub-menu panel */}
          {isExpanded && !isMobile && (
            <div className="absolute left-full top-0 ml-3 z-[70] min-w-[180px] bg-card/95 backdrop-blur-xl border border-border rounded-xl p-2 shadow-2xl shadow-black/40 animate-in slide-in-from-left-2 fade-in-0 duration-200">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1.5 font-semibold">
                {item.label}
              </div>
              {item.children!.map(child => {
                const childActive = child.path && (location.pathname === child.path || location.pathname.startsWith(child.path + '/'));
                return (
                  <Link
                    key={child.path}
                    to={child.path!}
                    {...getPrefetchHandlers(child.path!)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                      childActive
                        ? "bg-primary/20 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <child.icon className="h-4 w-4 shrink-0" />
                    <span>{child.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Mobile sub-menu as bottom sheet */}
          {isExpanded && isMobile && (
            <>
              <div
                className="fixed inset-0 z-[59] bg-black/40 backdrop-blur-sm"
                onClick={() => setExpandedGroup(null)}
              />
              <div className="fixed bottom-0 left-0 right-0 z-[60] bg-card/98 backdrop-blur-2xl border-t border-border rounded-t-3xl shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-6 fade-in-0 duration-300">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
                <div className="px-4 pt-3 pb-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {item.label}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 px-3 pb-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
                  {item.children!.map(child => {
                    const childActive = child.path && (location.pathname === child.path || location.pathname.startsWith(child.path + '/'));
                    return (
                      <Link
                        key={child.path}
                        to={child.path!}
                        {...getPrefetchHandlers(child.path!)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95",
                          childActive
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground active:bg-muted/50"
                        )}
                      >
                        <child.icon className="h-5 w-5" />
                        <span className="text-[10px] leading-tight text-center line-clamp-2 font-medium">
                          {child.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    // Regular item (no children)
    if (inOverflow) {
      return (
        <Link
          key={item.path}
          to={item.path!}
          onClick={() => setMoreOpen(false)}
          {...getPrefetchHandlers(item.path!)}
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95",
            isActive
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground active:bg-muted/50"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px] leading-tight text-center line-clamp-2 font-medium">
            {item.label}
          </span>
        </Link>
      );
    }

    return (
      <Tooltip key={item.path} delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            to={item.path!}
            className={cn('dock-item', isActive && 'active')}
            onClick={() => { setMoreOpen(false); setExpandedGroup(null); }}
          >
            <item.icon className="h-5 w-5" />
            {isMobile && renderMobileLabel(item.label, isActive)}
          </Link>
        </TooltipTrigger>
        {!isMobile && (
          <TooltipContent
            side={position === 'left' ? 'right' : 'top'}
            className="bg-card border-border"
          >
            <p className="font-medium">{item.label}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  };


  const dockNav = (
    <nav
      className={cn(
        'floating-dock',
        position === 'left' && 'floating-dock-vertical',
        collapsed && !isMobile && 'floating-dock-collapsed'
      )}
    >
      {visibleItems.map(item => renderDockItem(item))}

      {/* More button for mobile overflow */}
      {hasOverflow && (
        <button
          onClick={() => { setMoreOpen(!moreOpen); setExpandedGroup(null); }}
          className={cn('dock-item', (moreOpen || activeInOverflow) && 'active')}
        >
          {moreOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          {isMobile && renderMobileLabel('Mais', moreOpen || activeInOverflow)}
        </button>
      )}
    </nav>
  );

  return (
    <>
      {/* Hide dock entirely on subpages (desktop) — only show on dashboard */}
      {!(collapsed && !isMobile) && dockNav}

      {/* Mobile overflow bottom sheet */}
      {moreOpen && hasOverflow && (
        <>
          <div
            className="fixed inset-0 z-[59] bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-card/98 backdrop-blur-2xl border-t border-border rounded-t-3xl shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-6 fade-in-0 duration-300">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
            <div className="px-4 pt-3 pb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Mais opções
              </p>
            </div>
            <div className="grid grid-cols-4 gap-1.5 px-3 pb-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
              {overflowItems.map(item => {
                if (item.children) {
                  return item.children.map(child => renderDockItem(child, true));
                }
                return renderDockItem(item, true);
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
