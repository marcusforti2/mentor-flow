import { cn } from '@/lib/utils';

interface DesktopIconProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isSelected: boolean;
  isOpen: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

export function DesktopIcon({
  id,
  label,
  icon: Icon,
  isSelected,
  isOpen,
  onSelect,
  onDoubleClick,
}: DesktopIconProps) {
  return (
    <div
      className={cn(
        'desktop-icon flex flex-col items-center gap-2 p-3 rounded-xl',
        'cursor-pointer select-none transition-all duration-200',
        'hover:bg-white/5',
        isSelected && 'bg-white/10 ring-1 ring-primary/50'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          'relative w-16 h-16 rounded-2xl flex items-center justify-center',
          'bg-gradient-to-br from-muted/80 to-muted/40',
          'border border-border/50 shadow-lg',
          'transition-all duration-200 hover:scale-110',
          isOpen && 'ring-2 ring-primary/50 shadow-primary/20'
        )}
      >
        <Icon className="h-8 w-8 text-foreground" />
        
        {/* Glow effect when open */}
        {isOpen && (
          <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse" />
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-xs font-medium text-foreground text-center max-w-20 truncate',
          'px-2 py-0.5 rounded',
          isSelected && 'bg-primary text-primary-foreground'
        )}
      >
        {label}
      </span>
    </div>
  );
}
