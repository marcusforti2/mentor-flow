import { cn } from '@/lib/utils';
import vhfLogo from '@/assets/vhf-logo.png';

interface BrandLogoProps {
  variant?: 'full' | 'compact' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Override with tenant logo URL when in tenant context */
  logoUrl?: string;
}

export function BrandLogo({ variant = 'full', size = 'md', className, logoUrl }: BrandLogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', techText: 'text-sm' },
    md: { icon: 'w-10 h-10', text: 'text-xl', techText: 'text-base' },
    lg: { icon: 'w-14 h-14', text: 'text-3xl', techText: 'text-xl' },
    xl: { icon: 'w-20 h-20', text: 'text-5xl', techText: 'text-3xl' },
  };

  const currentSize = sizes[size];
  const logoSrc = logoUrl || vhfLogo;

  const LogoIcon = () => (
    <div className={cn(currentSize.icon, 'relative flex items-center justify-center')}>
      <img src={logoSrc} alt="MentorFlow Logo" className="w-full h-full object-contain" />
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center', className)}>
        <LogoIcon />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <span className={cn(currentSize.text, 'font-bold tracking-tight text-primary')}>Mentor</span>
        <span className={cn(currentSize.techText, 'font-semibold tracking-wider text-accent')}>Flow.io</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoIcon />
      <div className="flex items-baseline gap-1">
        <span className={cn(currentSize.text, 'font-bold tracking-tight text-primary')}>Mentor</span>
        <span className={cn(currentSize.techText, 'font-semibold tracking-wider text-accent')}>Flow.io</span>
      </div>
    </div>
  );
}

// Backward compatibility alias
// Backward compatibility aliases
export const LBVLogo = BrandLogo;
export const VHFLogo = BrandLogo;
