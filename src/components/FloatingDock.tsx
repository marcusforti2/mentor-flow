import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon, MoreHorizontal, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

interface DockItem {
  icon: LucideIcon;
  label: string;
  path: string;
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

  const visibleItems = isMobile ? items.slice(0, MOBILE_VISIBLE_COUNT) : items;
  const overflowItems = isMobile ? items.slice(MOBILE_VISIBLE_COUNT) : [];
  const hasOverflow = overflowItems.length > 0;

  // Check if active item is in overflow
  const activeInOverflow = overflowItems.some(
    (item) => location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  );

  return (
    <>
      <nav
        className={cn(
          'floating-dock',
          position === 'left' && 'floating-dock-vertical'
        )}
      >
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (location.pathname.startsWith(item.path + '/'));
          
          return (
            <Tooltip key={item.path} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path}
                  className={cn('dock-item', isActive && 'active')}
                  onClick={() => setMoreOpen(false)}
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
        })}

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
            {overflowItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (location.pathname.startsWith(item.path + '/'));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
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
