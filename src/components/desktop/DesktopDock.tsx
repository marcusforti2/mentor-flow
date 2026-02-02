import { cn } from '@/lib/utils';
import { AppConfig } from '@/hooks/useWindowManager';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DesktopDockProps {
  apps: AppConfig[];
  openWindows: string[];
  onAppClick: (id: string) => void;
}

export function DesktopDock({ apps, openWindows, onAppClick }: DesktopDockProps) {
  return (
    <div className="desktop-dock fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          'flex items-end gap-1 px-3 py-2 rounded-2xl',
          'bg-card/70 backdrop-blur-xl',
          'border border-border/30 shadow-2xl',
          'before:absolute before:inset-0 before:rounded-2xl',
          'before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none'
        )}
      >
        {apps.map((app) => {
          const isOpen = openWindows.includes(app.id);
          const Icon = app.icon;
          
          return (
            <Tooltip key={app.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onAppClick(app.id)}
                  className={cn(
                    'dock-app relative p-2 rounded-xl',
                    'transition-all duration-200',
                    'hover:bg-white/10 hover:scale-125',
                    '[&:hover+button]:scale-110',
                    '[&:has(+button:hover)]:scale-110'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      'bg-gradient-to-br from-muted to-muted/50',
                      'border border-border/50',
                      'transition-all duration-200',
                      isOpen && 'ring-1 ring-primary/50'
                    )}
                  >
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  
                  {/* Open indicator dot */}
                  {isOpen && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card/90 backdrop-blur-md">
                {app.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
