import { cn } from '@/lib/utils';

interface LBVLogoProps {
  variant?: 'full' | 'compact' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LBVLogo({ variant = 'full', size = 'md', className }: LBVLogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', techText: 'text-sm' },
    md: { icon: 'w-10 h-10', text: 'text-xl', techText: 'text-base' },
    lg: { icon: 'w-14 h-14', text: 'text-3xl', techText: 'text-xl' },
    xl: { icon: 'w-20 h-20', text: 'text-5xl', techText: 'text-3xl' },
  };

  const currentSize = sizes[size];

  // Hexagon SVG Icon with gradient
  const HexagonIcon = () => (
    <div className={cn(
      currentSize.icon,
      'relative flex items-center justify-center'
    )}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(45 100% 60%)" />
            <stop offset="50%" stopColor="hsl(45 100% 51%)" />
            <stop offset="100%" stopColor="hsl(40 100% 45%)" />
          </linearGradient>
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(220 91% 45%)" />
            <stop offset="100%" stopColor="hsl(220 91% 35%)" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Outer hexagon - gold */}
        <polygon
          points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
          fill="url(#goldGradient)"
          filter="url(#glow)"
        />
        
        {/* Inner hexagon - dark blue */}
        <polygon
          points="50,18 78,35 78,65 50,82 22,65 22,35"
          fill="url(#blueGradient)"
        />
        
        {/* L letter stylized */}
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fill="hsl(45 100% 51%)"
          fontSize="36"
          fontWeight="bold"
          fontFamily="Space Grotesk, sans-serif"
        >
          L
        </text>
      </svg>
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center', className)}>
        <HexagonIcon />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <span className={cn(
          currentSize.text,
          'font-bold tracking-tight text-primary'
        )}>
          LBV
        </span>
        <span className={cn(
          currentSize.techText,
          'font-semibold tracking-wider'
        )}
        style={{ color: 'hsl(220 91% 55%)' }}
        >
          TECH
        </span>
      </div>
    );
  }

  // Full variant (default)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <HexagonIcon />
      <div className="flex items-baseline gap-1">
        <span className={cn(
          currentSize.text,
          'font-bold tracking-tight text-primary'
        )}>
          LBV
        </span>
        <span className={cn(
          currentSize.techText,
          'font-semibold tracking-wider'
        )}
        style={{ color: 'hsl(220 91% 55%)' }}
        >
          TECH
        </span>
      </div>
    </div>
  );
}
