import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon, MoreHorizontal, X, ChevronRight } from 'lucide-react';
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
}

const MOBILE_VISIBLE_COUNT = 5;

export function FloatingDock({ items, position = 'left' }: FloatingDockProps) {
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
                {isMobile && (
                  <span className="text-[10px] leading-none mt-0.5 text-muted-foreground group-[.active]:text-primary truncate max-w-[56px]">
                    {item.label.split(' ')[0]}
                  </span>
                )}
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

          {/* Mobile sub-menu as overlay */}
          {isExpanded && isMobile && (
            <>
              <div
                className="fixed inset-0 z-[59] bg-black/20 backdrop-blur-sm"
                onClick={() => setExpandedGroup(null)}
              />
              <div className="fixed bottom-20 left-2 right-2 z-[60] bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-3 shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
                <div className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-1.5 font-semibold">
                  {item.label}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {item.children!.map(child => {
                    const childActive = child.path && (location.pathname === child.path || location.pathname.startsWith(child.path + '/'));
                    return (
                      <Link
                        key={child.path}
                        to={child.path!}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                          childActive
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <child.icon className="h-5 w-5" />
                        <span className="text-[10px] leading-tight text-center line-clamp-2">
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
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
            isActive
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px] leading-tight text-center line-clamp-2">
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
            {isMobile && (
              <span className="text-[10px] leading-none mt-0.5 text-muted-foreground group-[.active]:text-primary truncate max-w-[56px]">
                {item.label.split(' ')[0]}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent
          side={position === 'left' ? 'right' : 'top'}
          className="bg-card border-border"
        >
          <p className="font-medium">{item.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <>
      <nav
        className={cn(
          'floating-dock',
          position === 'left' && 'floating-dock-vertical'
        )}
      >
        {visibleItems.map(item => renderDockItem(item))}

        {/* More button for mobile overflow */}
        {hasOverflow && (
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn('dock-item', (moreOpen || activeInOverflow) && 'active')}
          >
            {moreOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
            {isMobile && (
              <span className="text-[10px] leading-none mt-0.5 text-muted-foreground truncate">
                Mais
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Mobile overflow panel */}
      {moreOpen && hasOverflow && (
        <div className="fixed bottom-20 left-2 right-2 z-[60] bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-3 shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
          <div className="grid grid-cols-4 gap-2">
            {overflowItems.map(item => {
              if (item.children) {
                // Render group in overflow as individual children
                return item.children.map(child => renderDockItem(child, true));
              }
              return renderDockItem(item, true);
            })}
          </div>
        </div>
      )}

      {/* Backdrop to close more panel */}
      {moreOpen && hasOverflow && (
        <div
          className="fixed inset-0 z-[59] bg-black/20 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}
    </>
  );
}
