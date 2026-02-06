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
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideKey, setSlideKey] = useState(0);

  const goTo = useCallback((index: number) => {
    if (index === currentSlide || isAnimating || index < 0 || index >= TOTAL_SLIDES) return;
    setIsAnimating(true);
    setCurrentSlide(index);
    setSlideKey(prev => prev + 1);
    setTimeout(() => setIsAnimating(false), 500);
  }, [currentSlide, isAnimating]);

  const next = useCallback(() => goTo(currentSlide + 1), [goTo, currentSlide]);
  const prev = useCallback(() => goTo(currentSlide - 1), [goTo, currentSlide]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else containerRef.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      if (e.key === 'Escape' && isFullscreen) document.exitFullscreen?.();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [next, prev, isFullscreen, toggleFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const progress = ((currentSlide + 1) / TOTAL_SLIDES) * 100;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col overflow-hidden select-none',
        isFullscreen ? 'w-screen h-screen' : 'w-full rounded-2xl border border-slate-700/30'
      )}
      style={{
        height: isFullscreen ? '100vh' : 'calc(100vh - 7rem)',
        background: 'linear-gradient(145deg, hsl(222 47% 6%) 0%, hsl(222 47% 8%) 40%, hsl(222 47% 5%) 100%)',
      }}
    >
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.04] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(45 100% 51%), transparent 70%)' }} />

      {/* ── Header ── */}
      <header className="relative flex items-center justify-between px-6 md:px-10 py-4 shrink-0 z-10">
        <LBVLogo variant="full" size="sm" className="opacity-70" />
        <div className="flex items-center gap-4">
          <span className="text-slate-600 text-[11px] font-mono tracking-wider">
            {String(currentSlide + 1).padStart(2, '0')} / {String(TOTAL_SLIDES).padStart(2, '0')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8 text-slate-500 hover:text-white hover:bg-white/5"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-20">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, background: 'hsl(45 100% 51%)' }}
        />
      </div>

      {/* ── Slide Area ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Nav arrows — larger, more subtle */}
        {currentSlide > 0 && (
          <button
            onClick={prev}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all duration-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentSlide < TOTAL_SLIDES - 1 && (
          <button
            onClick={next}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all duration-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Slide content */}
        <div
          key={slideKey}
          className="absolute inset-0 px-8 md:px-20 lg:px-28 py-4 flex items-center"
          style={{
            animation: 'slideIn 0.5s ease-out forwards',
          }}
        >
          <div className="w-full max-w-6xl mx-auto">
            <SlideRenderer slideIndex={currentSlide} />
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="flex flex-col items-center gap-3 pb-5 pt-2 shrink-0 z-10">
        <div className="flex gap-2">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'rounded-full transition-all duration-500',
                i === currentSlide ? 'w-8 h-1.5' : 'w-1.5 h-1.5 hover:w-3'
              )}
              style={{
                background: i === currentSlide ? 'hsl(45 100% 51%)' : 'hsl(220 15% 25%)',
              }}
            />
          ))}
        </div>
        {currentSlide === 0 && (
          <p className="text-slate-700 text-[10px] tracking-widest uppercase">
            ← → Navegar · F Fullscreen · ESC Sair
          </p>
        )}
      </footer>

      {/* Keyframe animation */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
