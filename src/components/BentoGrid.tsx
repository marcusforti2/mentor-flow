import { useTilt } from '@/hooks/useTilt';
import { cn } from '@/lib/utils';
import { ReactNode, HTMLAttributes, forwardRef } from 'react';

interface BentoCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'wide' | 'tall';
  glow?: boolean;
  tilt?: boolean;
}

export const BentoCard = forwardRef<HTMLDivElement, BentoCardProps>(function BentoCard({
  children,
  className,
  size = 'md',
  glow = false,
  tilt = false,
  ...rest
}, ref) {
  const [tiltRef, tiltState] = useTilt({ max: 8, scale: 1.01 });

  const sizeClasses = {
    sm: 'bento-sm',
    md: 'bento-md',
    lg: 'bento-lg',
    xl: 'bento-xl',
    wide: 'bento-wide',
    tall: 'bento-tall',
  };

  const cardContent = (
    <div
      className={cn(
        'relative h-full overflow-hidden rounded-2xl p-6',
        glow ? 'glass-card-glow' : 'glass-card',
        'transition-all duration-300',
        className
      )}
    >
      {/* Glare effect */}
      {tilt && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at ${tiltState.glareX}% ${tiltState.glareY}%, hsl(var(--primary) / 0.15) 0%, transparent 60%)`,
          }}
        />
      )}
      {children}
    </div>
  );

  if (tilt) {
    return (
      <div ref={tiltRef} className={cn('group', sizeClasses[size])} {...rest}>
        {cardContent}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn(sizeClasses[size])} {...rest}>
      {cardContent}
    </div>
  );
});

BentoCard.displayName = 'BentoCard';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn('bento-grid', className)}>
      {children}
    </div>
  );
}
