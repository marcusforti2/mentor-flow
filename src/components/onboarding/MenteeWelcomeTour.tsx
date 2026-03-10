import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Sparkles, Briefcase, Rocket, Brain, Target, BookOpen, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface WelcomeStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string; // CSS selector to highlight (optional)
}

const WELCOME_STEPS: WelcomeStep[] = [
  {
    icon: <Rocket className="h-8 w-8 text-primary" />,
    title: 'Bem-vindo à sua plataforma! 🚀',
    description: 'Aqui você tem tudo para acelerar seus resultados em vendas. Vou te mostrar rapidinho como funciona — leva menos de 1 minuto!',
  },
  {
    icon: <BookOpen className="h-8 w-8 text-primary" />,
    title: 'Trilhas de Aprendizado',
    description: 'Aulas em vídeo, textos e exercícios práticos criados pelo seu mentor. Complete as trilhas para ganhar certificados e pontos!',
    highlight: '[data-tour="trail-progress"]',
  },
  {
    icon: <Target className="h-8 w-8 text-accent" />,
    title: 'Seu CRM de Prospecções',
    description: 'Registre cada contato, acompanhe o funil de vendas e ganhe pontos no ranking. Tudo organizado em um Kanban visual.',
    highlight: '[data-tour="quick-actions"]',
  },
  {
    icon: <Brain className="h-8 w-8 text-primary" />,
    title: 'Ferramentas de IA',
    description: 'Analise ligações, gere propostas, treine objeções e muito mais. A IA é sua aliada para vender mais e melhor.',
  },
  {
    icon: <Award className="h-8 w-8 text-amber-500" />,
    title: 'Gamificação & Conquistas',
    description: 'Ganhe badges, mantenha sua sequência de dias e suba no ranking. Quanto mais ativo, mais conquistas você desbloqueia!',
    highlight: '[data-tour="badges"]',
  },
  {
    icon: <Briefcase className="h-8 w-8 text-emerald-500" />,
    title: '⭐ Meu Negócio — O Mais Importante!',
    description: 'Essa é a CHAVE de tudo! Preencher o "Meu Negócio" no seu CRM permite que a IA entenda seu produto, sua empresa e seu público-alvo. Com isso, TODAS as ferramentas ficam personalizadas pra você: pitchs, propostas, qualificação de leads, simulações... Tudo sob medida.\n\nE o melhor: a IA te ajuda a preencher! É super rápido. 🚀',
  },
];

const TOUR_KEY = 'mentee_welcome_tour_done';

interface MenteeWelcomeTourProps {
  userId: string | undefined;
}

export function MenteeWelcomeTour({ userId }: MenteeWelcomeTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();

  const step = WELCOME_STEPS[currentStep];
  const isLast = currentStep === WELCOME_STEPS.length - 1;
  const isFirst = currentStep === 0;

  // Check if tour was already completed
  useEffect(() => {
    if (!userId) return;
    const done = localStorage.getItem(`${TOUR_KEY}_${userId}`);
    if (done !== 'true') {
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  // Measure highlighted element
  useEffect(() => {
    if (!isOpen || !step?.highlight) {
      setTargetRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(step.highlight!);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        requestAnimationFrame(() => setTargetRect(el.getBoundingClientRect()));
      } else {
        setTargetRect(null);
      }
    };
    const timeout = setTimeout(measure, 300);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', measure);
    };
  }, [isOpen, currentStep, step]);

  const completeTour = useCallback(() => {
    setIsOpen(false);
    if (userId) localStorage.setItem(`${TOUR_KEY}_${userId}`, 'true');
  }, [userId]);

  const next = () => {
    if (isLast) {
      completeTour();
      navigate('/mentorado/meu-crm');
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const prev = () => {
    if (!isFirst) setCurrentStep(s => s - 1);
  };

  const skip = () => completeTour();

  if (!isOpen) return null;

  const pad = 10;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Overlay */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="welcome-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - pad}
                y={targetRect.top - pad}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#welcome-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={skip}
        />
      </svg>

      {/* Highlight ring */}
      {targetRect && (
        <div
          className="absolute rounded-2xl border-2 border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.25)] transition-all duration-500 pointer-events-none"
          style={{
            top: targetRect.top - pad,
            left: targetRect.left - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
          }}
        />
      )}

      {/* Central card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto w-[420px] max-w-[90vw] bg-card border border-border rounded-3xl shadow-2xl shadow-black/40 p-7",
            "animate-in fade-in-0 zoom-in-95 duration-300"
          )}
        >
          {/* Close */}
          <button
            onClick={skip}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Pular tutorial"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon & Content */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              {step.icon}
            </div>

            <h2 className="text-xl font-bold text-foreground">{step.title}</h2>

            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line max-h-[200px] overflow-y-auto">
              {step.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground">{currentStep + 1} de {WELCOME_STEPS.length}</span>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={prev} className="h-9 px-3 text-xs">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              )}
              <Button size="sm" onClick={next} className={cn("h-9 px-5 text-xs", isLast && "bg-emerald-600 hover:bg-emerald-700")}>
                {isLast ? (
                  <>
                    <Briefcase className="h-4 w-4 mr-1" />
                    Preencher Meu Negócio
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {WELCOME_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === currentStep ? "w-5 bg-primary" : "w-2 bg-muted-foreground/30",
                  i === WELCOME_STEPS.length - 1 && i !== currentStep && "bg-emerald-500/40"
                )}
              />
            ))}
          </div>

          {/* Skip link */}
          {!isLast && (
            <button onClick={skip} className="w-full text-center text-xs text-muted-foreground/60 hover:text-muted-foreground mt-3 transition-colors">
              Pular tutorial
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
