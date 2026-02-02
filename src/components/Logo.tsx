import lbvLogo from '@/assets/lbv-tech-logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeMap = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
};

export function Logo({ className = '', size = 'md', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={lbvLogo} 
        alt="LBV TECH" 
        className={`${sizeMap[size]} w-auto object-contain`}
      />
    </div>
  );
}

export function LogoIcon({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <span className="text-2xl font-bold bg-gradient-to-br from-primary via-primary to-[hsl(var(--gold-shine))] bg-clip-text text-transparent font-display">
          L
        </span>
      </div>
    </div>
  );
}
