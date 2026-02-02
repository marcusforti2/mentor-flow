import { cn } from '@/lib/utils';

interface DesktopIconProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  delay?: number;
}

export function DesktopIcon({
  id,
  label,
  icon: Icon,
  gradient,
  isSelected,
  onSelect,
  onDoubleClick,
  delay = 0,
}: DesktopIconProps) {
  return (
    <div
      className={cn(
        'group flex flex-col items-center gap-3',
        'cursor-pointer select-none',
        'transition-all duration-200 ease-out',
        'hover:scale-110 active:scale-95',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      {/* Large Icon Container - macOS style */}
      <div
        className={cn(
          'relative w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28',
          'rounded-[22px] md:rounded-[26px] lg:rounded-[28px]',
          'flex items-center justify-center overflow-hidden',
          'transition-all duration-200',
          'shadow-2xl',
          'group-hover:shadow-white/20',
          isSelected && 'ring-4 ring-white/50'
        )}
      >
        {/* Gradient background */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br',
          gradient
        )} />
        
        {/* macOS-style glass reflections */}
        <div className="absolute inset-0">
          {/* Top highlight - curved */}
          <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/50 via-white/20 to-transparent rounded-t-[22px] md:rounded-t-[26px] lg:rounded-t-[28px]" />
          
          {/* Inner glow */}
          <div className="absolute inset-[1px] rounded-[21px] md:rounded-[25px] lg:rounded-[27px] bg-gradient-to-br from-white/10 via-transparent to-black/10" />
          
          {/* Border effect */}
          <div className="absolute inset-0 rounded-[22px] md:rounded-[26px] lg:rounded-[28px] border border-white/20" />
        </div>
        
        {/* Icon */}
        <Icon className="relative z-10 h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 text-white drop-shadow-lg" />
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-xs md:text-sm font-medium text-center',
          'max-w-[100px] md:max-w-[120px] truncate',
          'text-white drop-shadow-lg',
          'transition-all duration-200',
          isSelected && 'bg-white/30 px-3 py-1 rounded-md'
        )}
      >
        {label}
      </span>
    </div>
  );
}
