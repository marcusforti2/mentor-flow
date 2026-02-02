import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DockApp {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  gradient: string;
}

interface DesktopDockProps {
  apps: DockApp[];
  onAppClick: (path: string) => void;
}

export function DesktopDock({ apps, onAppClick }: DesktopDockProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 1.7;
    if (distance === 1) return 1.35;
    if (distance === 2) return 1.15;
    return 1;
  };

  const getTranslateY = (index: number) => {
    if (hoveredIndex === null) return 0;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return -24;
    if (distance === 1) return -14;
    if (distance === 2) return -6;
    return 0;
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
      {/* Dock reflection on surface */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[90%] h-6 bg-white/5 blur-xl rounded-full" />
      
      {/* Dock Container - Frosted glass */}
      <div 
        className={cn(
          'relative flex items-end gap-1 px-3 py-2',
          'bg-white/20 backdrop-blur-2xl',
          'rounded-2xl',
          'border border-white/40',
          'shadow-2xl shadow-black/30'
        )}
      >
        {/* Top reflection line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-t-2xl" />
        
        {/* Inner glass gradient */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        
        {apps.map((app, index) => {
          const Icon = app.icon;
          const scale = getScale(index);
          const translateY = getTranslateY(index);
          
          return (
            <div
              key={app.id}
              className="relative flex flex-col items-center"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip */}
              <div 
                className={cn(
                  'absolute -top-12 px-3 py-1.5 rounded-lg z-20',
                  'bg-gray-800/95 backdrop-blur-md',
                  'text-xs font-medium text-white whitespace-nowrap',
                  'transition-all duration-150 pointer-events-none',
                  'shadow-xl border border-white/10',
                  hoveredIndex === index 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-2'
                )}
              >
                {app.label}
                {/* Tooltip arrow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800/95 rotate-45 border-r border-b border-white/10" />
              </div>
              
              {/* Icon Button */}
              <button
                onClick={() => onAppClick(app.path)}
                className={cn(
                  'relative w-14 h-14 rounded-xl overflow-hidden',
                  'transition-all duration-150 ease-out',
                  'active:scale-90'
                )}
                style={{
                  transform: `scale(${scale}) translateY(${translateY}px)`,
                }}
              >
                {/* Gradient background */}
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-br',
                  app.gradient
                )} />
                
                {/* Glass effect */}
                <div className="absolute inset-0">
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" />
                  <div className="absolute inset-0 border border-white/20 rounded-xl" />
                </div>
                
                <Icon className="relative z-10 h-7 w-7 text-white mx-auto mt-3.5 drop-shadow-md" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
