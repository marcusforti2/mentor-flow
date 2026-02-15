import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  /** CSS selector for the target element */
  target: string;
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
  /** Placement relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export function GuidedTour({ steps, isOpen, onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Small delay to let scroll finish
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    });
  }, [step]);

  // Compute tooltip position after targetRect updates
  useEffect(() => {
    if (!targetRect || !step) {
      setTooltipPos(null);
      return;
    }

    const padding = 16;
    const tooltipW = 340;
    const tooltipH = 180;
    const placement = step.placement || 'bottom';

    let top = 0;
    let left = 0;
    let finalPlacement = placement;

    switch (placement) {
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
        if (top + tooltipH > window.innerHeight) {
          top = targetRect.top - tooltipH - padding;
          finalPlacement = 'top';
        }
        break;
      case 'top':
        top = targetRect.top - tooltipH - padding;
        left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
        if (top < 0) {
          top = targetRect.bottom + padding;
          finalPlacement = 'bottom';
        }
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
        left = targetRect.right + padding;
        if (left + tooltipW > window.innerWidth) {
          left = targetRect.left - tooltipW - padding;
          finalPlacement = 'left';
        }
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
        left = targetRect.left - tooltipW - padding;
        if (left < 0) {
          left = targetRect.right + padding;
          finalPlacement = 'right';
        }
        break;
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipW - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - tooltipH - 12));

    setTooltipPos({ top, left, placement: finalPlacement });
  }, [targetRect, step]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Delay to let the DOM settle
    const timeout = setTimeout(measureTarget, 300);
    const handleResize = () => measureTarget();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, currentStep, measureTarget]);

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  if (!isOpen || !step) return null;

  const highlightPadding = 8;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - highlightPadding}
                y={targetRect.top - highlightPadding}
                width={targetRect.width + highlightPadding * 2}
                height={targetRect.height + highlightPadding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={onSkip}
        />
      </svg>

      {/* Highlight ring */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.2)] transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top - highlightPadding,
            left: targetRect.left - highlightPadding,
            width: targetRect.width + highlightPadding * 2,
            height: targetRect.height + highlightPadding * 2,
          }}
        />
      )}

      {/* Tooltip */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute w-[340px] bg-card border border-border rounded-2xl shadow-2xl shadow-black/30 p-5 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
          )}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          {/* Close */}
          <button
            onClick={onSkip}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="space-y-2 pr-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">{step.description}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} de {steps.length}
            </span>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={prev} className="h-8 px-3 text-xs">
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Anterior
                </Button>
              )}
              <Button size="sm" onClick={next} className="h-8 px-4 text-xs">
                {isLast ? 'Concluir' : 'Próximo'}
                {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentStep ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
