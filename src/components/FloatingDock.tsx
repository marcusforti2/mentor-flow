import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DockItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface FloatingDockProps {
  items: DockItem[];
  position?: 'left' | 'bottom';
}

export function FloatingDock({ items, position = 'left' }: FloatingDockProps) {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'floating-dock',
        position === 'left' && 'floating-dock-vertical'
      )}
    >
      {items.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path !== '/admin' && item.path !== '/app' && location.pathname.startsWith(item.path));
        
        return (
          <Tooltip key={item.path} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to={item.path}
                className={cn('dock-item', isActive && 'active')}
              >
                <item.icon className="h-5 w-5" />
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
    </nav>
  );
}
