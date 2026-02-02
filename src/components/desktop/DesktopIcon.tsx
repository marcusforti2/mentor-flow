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
        'group flex flex-col items-center gap-2 p-2 rounded-2xl',
        'cursor-pointer select-none',
        'transition-all duration-300 ease-out',
        'hover:scale-105 active:scale-95',
        isSelected && 'bg-white/[0.08]'
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
      {/* Icon Container */}
      <div
        className={cn(
          'relative w-14 h-14 md:w-16 md:h-16 rounded-[16px] md:rounded-[18px]',
          'flex items-center justify-center overflow-hidden',
          'transition-all duration-300',
          'group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-white/10',
          isSelected && 'ring-2 ring-white/30 ring-offset-2 ring-offset-transparent'
        )}
      >
        {/* Gradient background */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br',
          gradient
        )} />
        
        {/* Glass shine overlay */}
        <div className="absolute inset-0">
          {/* Top highlight */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" />
          {/* Inner shadow */}
          <div className="absolute inset-0 rounded-[16px] md:rounded-[18px] shadow-inner shadow-black/20" />
          {/* Bottom reflection */}
          <div className="absolute inset-x-2 bottom-1 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
        </div>
        
        {/* Icon */}
        <Icon className="relative z-10 h-7 w-7 md:h-8 md:w-8 text-white drop-shadow-lg" />
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-[10px] md:text-[11px] font-medium text-center',
          'max-w-[72px] truncate px-1.5 py-0.5 rounded',
          'text-white/80 drop-shadow-lg',
          'transition-all duration-200',
          isSelected && 'bg-white/20 text-white'
        )}
      >
        {label}
      </span>
    </div>
  );
}
