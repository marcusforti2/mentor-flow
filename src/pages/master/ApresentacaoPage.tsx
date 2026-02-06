import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize, ChevronLeft, ChevronRight } from 'lucide-react';
import { LBVLogo } from '@/components/LBVLogo';
import { SlideRenderer } from '@/components/presentation/SlideRenderer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOTAL_SLIDES = 8;

export default function ApresentacaoPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isAnimating, setIsAnimating] = useState(false);

  const nextSlide = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1 && !isAnimating) {
      setDirection('right');
      setIsAnimating(true);
      setCurrentSlide(prev => prev + 1);
      setTimeout(() => setIsAnimating(false), 350);
    }
  }, [currentSlide, isAnimating]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0 && !isAnimating) {
      setDirection('left');
      setIsAnimating(true);
      setCurrentSlide(prev => prev - 1);
      setTimeout(() => setIsAnimating(false), 350);
    }
  }, [currentSlide, isAnimating]);

  const goToSlide = useCallback((index: number) => {
    if (index !== currentSlide && !isAnimating) {
      setDirection(index > currentSlide ? 'right' : 'left');
      setIsAnimating(true);
      setCurrentSlide(index);
      setTimeout(() => setIsAnimating(false), 350);
    }
  }, [currentSlide, isAnimating]);

  const enterFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen?.();
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, isFullscreen, exitFullscreen, toggleFullscreen]);

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden select-none',
        isFullscreen ? 'w-screen h-screen' : 'w-full rounded-2xl border border-slate-700/50'
      )}
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 7rem)' }}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0 z-10">
        <LBVLogo variant="full" size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-xs font-mono">
            {currentSlide + 1} / {TOTAL_SLIDES}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* ── Slide Area ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Navigation arrows */}
        {currentSlide > 0 && (
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentSlide < TOTAL_SLIDES - 1 && (
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Slide content with transition */}
        <div
          className="absolute inset-0 px-6 md:px-12 py-4 transition-all duration-300 ease-out"
          style={{
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating
              ? `translateX(${direction === 'right' ? '30px' : '-30px'})`
              : 'translateX(0)',
          }}
        >
          <SlideRenderer slideIndex={currentSlide} />
        </div>
      </div>

      {/* ── Footer: Dots + Hint ── */}
      <footer className="flex flex-col items-center gap-2 pb-4 pt-2 shrink-0 z-10">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                i === currentSlide
                  ? 'w-6 h-2'
                  : 'w-2 h-2 hover:opacity-80'
              )}
              style={{
                background: i === currentSlide ? 'hsl(45 100% 51%)' : 'hsl(215 20% 35%)',
              }}
            />
          ))}
        </div>
        {currentSlide === 0 && (
          <p className="text-slate-600 text-[10px]">
            ← → Navegar • F Fullscreen • ESC Sair
          </p>
        )}
      </footer>
    </div>
  );
}
