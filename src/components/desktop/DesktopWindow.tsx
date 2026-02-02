import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { WindowState } from '@/hooks/useWindowManager';

interface DesktopWindowProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  state: WindowState;
  children: React.ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
}

export function DesktopWindow({
  id,
  title,
  icon: Icon,
  state,
  children,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onPositionChange,
  onSizeChange,
}: DesktopWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);

  useEffect(() => {
    if (state.isOpen) {
      setIsOpening(true);
      const timer = setTimeout(() => setIsOpening(false), 200);
      return () => clearTimeout(timer);
    }
  }, [state.isOpen]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return;
    
    onFocus();
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  }, [onFocus]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && !state.isMaximized) {
      const newX = Math.max(0, e.clientX - dragOffset.x);
      const newY = Math.max(0, e.clientY - dragOffset.y);
      onPositionChange({ x: newX, y: newY });
    }
  }, [isDragging, dragOffset, state.isMaximized, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  if (!state.isOpen) return null;

  const windowStyle = state.isMaximized
    ? {
        left: 0,
        top: 40,
        width: '100%',
        height: 'calc(100% - 40px - 80px)',
        zIndex: state.zIndex,
      }
    : {
        left: state.position.x,
        top: state.position.y,
        width: state.size.width,
        height: state.size.height,
        zIndex: state.zIndex,
      };

  return (
    <div
      ref={windowRef}
      className={cn(
        'desktop-window fixed flex flex-col',
        'bg-card/95 backdrop-blur-xl rounded-xl overflow-hidden',
        'border border-border/50 shadow-2xl',
        state.isMinimized && 'scale-0 opacity-0 pointer-events-none',
        isOpening && 'animate-window-open',
        isClosing && 'animate-window-close',
        isDragging && 'cursor-grabbing select-none'
      )}
      style={windowStyle}
      onClick={onFocus}
    >
      {/* Title Bar */}
      <div
        className={cn(
          'window-titlebar h-10 flex items-center px-3 gap-3',
          'bg-gradient-to-b from-muted/80 to-muted/40',
          'border-b border-border/30 cursor-grab',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleMouseDown}
        onDoubleClick={onMaximize}
      >
        {/* Window Buttons */}
        <div className="window-controls flex items-center gap-2">
          <button
            onClick={handleClose}
            className="window-button w-3 h-3 rounded-full bg-destructive hover:bg-destructive/80 transition-colors group flex items-center justify-center"
            title="Fechar"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] text-destructive-foreground font-bold">×</span>
          </button>
          <button
            onClick={onMinimize}
            className="window-button w-3 h-3 rounded-full bg-primary hover:bg-primary/80 transition-colors group flex items-center justify-center"
            title="Minimizar"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] text-primary-foreground font-bold">−</span>
          </button>
          <button
            onClick={onMaximize}
            className="window-button w-3 h-3 rounded-full bg-accent hover:bg-accent/80 transition-colors group flex items-center justify-center"
            title="Maximizar"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] text-accent-foreground font-bold">+</span>
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>

        {/* Spacer for balance */}
        <div className="w-[52px]" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background/50">
        {children}
      </div>

      {/* Resize Handle */}
      {!state.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsResizing(true);
          }}
        />
      )}
    </div>
  );
}
