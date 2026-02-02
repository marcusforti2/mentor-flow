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
    if (distance === 0) return 1.6;
    if (distance === 1) return 1.3;
    if (distance === 2) return 1.1;
    return 1;
  };

  const getTranslateY = (index: number) => {
    if (hoveredIndex === null) return 0;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return -20;
    if (distance === 1) return -12;
    if (distance === 2) return -4;
    return 0;
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      {/* Dock reflection (bottom glow) */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-white/5 blur-xl rounded-full" />
      
      {/* Dock Container */}
      <div 
        className={cn(
          'relative flex items-end gap-2 px-4 py-3',
          'bg-white/[0.08] backdrop-blur-2xl',
          'rounded-2xl',
          'border border-white/[0.15]',
          'shadow-2xl shadow-black/40'
        )}
      >
        {/* Top shine line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-2xl" />
        
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-white/[0.02] to-white/[0.05]" />
        
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
                  'absolute -top-12 px-3 py-1.5 rounded-lg z-10',
                  'bg-gray-900/95 backdrop-blur-md',
                  'border border-white/10',
                  'text-xs font-medium text-white whitespace-nowrap',
                  'transition-all duration-200 pointer-events-none',
                  'shadow-xl',
                  hoveredIndex === index 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-2'
                )}
              >
                {app.label}
                {/* Tooltip arrow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45 border-r border-b border-white/10" />
              </div>
              
              {/* Icon Button */}
              <button
                onClick={() => onAppClick(app.path)}
                className={cn(
                  'relative w-12 h-12 rounded-xl overflow-hidden',
                  'transition-all duration-200 ease-out',
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
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
                  <div className="absolute inset-0 shadow-inner shadow-black/20 rounded-xl" />
                </div>
                
                <Icon className="relative z-10 h-6 w-6 text-white mx-auto mt-3 drop-shadow-md" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
