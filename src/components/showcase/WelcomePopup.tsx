import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, MousePointerClick, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'showcase_welcome_seen';

export function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={close}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-300" />

      {/* card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/10',
          'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500'
        )}
      >
        {/* close btn */}
        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* glow accent */}
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="p-6 pt-8 space-y-5">
          {/* icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center">
                <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* text */}
          <div className="text-center space-y-3">
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              Antes de falar com um especialista...
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Explore cada detalhe da plataforma que vai transformar sua mentoria.{' '}
              <span className="text-foreground font-medium">Passe o mouse sobre os cards</span> — eles são interativos e revelam informações estratégicas sobre cada módulo.
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Quanto mais você explorar, mais preparado estará para entender o potencial real da ferramenta. Depois, um especialista estará pronto para te atender.
            </p>
          </div>

          {/* cta */}
          <Button onClick={close} className="w-full btn-premium h-11 text-sm font-semibold">
            Explorar a Plataforma
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
