import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Brain, Target, Activity, MessageSquare, Zap, ArrowRight } from 'lucide-react';

/* ── Intersection Observer hook ── */
function useAnimateOnView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold, rootMargin: '50px' }
    );
    obs.observe(el);

    // Fallback: check after layout settles (handles #hash navigation)
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 50 && rect.bottom > -50) {
          setVisible(true);
        }
      }, 300);
    });

    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [threshold]);
  return { ref, visible };
}

/* ═══════════════════════════════════
   RADAR CHART — Scan Comportamental
   ═══════════════════════════════════ */
const radarAxes = [
  { label: 'Emocional', value: 88 },
  { label: 'Social', value: 75 },
  { label: 'Execução', value: 92 },
  { label: 'Comunicação', value: 68 },
  { label: 'Motivação', value: 85 },
];

function getRadarPoint(index: number, value: number, total: number, radius: number, cx: number, cy: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const r = (value / 100) * radius;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function BMIRadarChart() {
  const { ref, visible } = useAnimateOnView(0.2);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let frame: number;
    let start: number | null = null;
    const duration = 1800;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const p = Math.min(elapsed / duration, 1);
      // Ease out cubic
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  const cx = 150, cy = 150, radius = 110;
  const total = radarAxes.length;

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1];

  // Data points with animation
  const points = radarAxes.map((axis, i) => 
    getRadarPoint(i, axis.value * progress, total, radius, cx, cy)
  );
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      <div className="relative">
        {/* Glow behind */}
        <div className={cn(
          'absolute inset-0 rounded-full blur-3xl transition-opacity duration-1000',
          visible ? 'opacity-20' : 'opacity-0'
        )} style={{ background: 'hsl(var(--primary))' }} />
        
        <svg viewBox="0 0 300 300" className="w-[280px] h-[280px] md:w-[320px] md:h-[320px] relative z-10">
          {/* Grid rings */}
          {rings.map((r, i) => {
            const ringPoints = Array.from({ length: total }, (_, j) =>
              getRadarPoint(j, r * 100, total, radius, cx, cy)
            );
            const ringPath = ringPoints.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
            return (
              <path
                key={i}
                d={ringPath}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                opacity={0.4}
              />
            );
          })}

          {/* Axis lines */}
          {radarAxes.map((_, i) => {
            const end = getRadarPoint(i, 100, total, radius, cx, cy);
            return (
              <line
                key={i}
                x1={cx} y1={cy}
                x2={end.x} y2={end.y}
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                opacity={0.3}
              />
            );
          })}

          {/* Data fill */}
          <path
            d={pathD}
            fill="hsl(var(--primary) / 0.12)"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className={cn(
              'transition-all duration-300',
              visible ? 'opacity-100' : 'opacity-0'
            )}
            style={{
              filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))',
            }}
          />

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x} cy={p.y} r="4"
                fill="hsl(var(--primary))"
                stroke="hsl(var(--background))"
                strokeWidth="2"
                className={cn(
                  'transition-all duration-500',
                  visible ? 'opacity-100' : 'opacity-0'
                )}
                style={{ transitionDelay: `${i * 150}ms` }}
              />
              {/* Pulse effect */}
              <circle
                cx={p.x} cy={p.y} r="8"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                opacity={visible ? 0.3 : 0}
                className="animate-ping"
                style={{ animationDelay: `${i * 200}ms`, animationDuration: '2s' }}
              />
            </g>
          ))}

          {/* Labels */}
          {radarAxes.map((axis, i) => {
            const labelPos = getRadarPoint(i, 118, total, radius, cx, cy);
            return (
              <g key={`label-${i}`}>
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    'text-[10px] font-semibold fill-foreground transition-opacity duration-500',
                    visible ? 'opacity-100' : 'opacity-0'
                  )}
                  style={{ transitionDelay: `${800 + i * 100}ms` }}
                >
                  {axis.label}
                </text>
                <text
                  x={labelPos.x}
                  y={labelPos.y + 13}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    'text-[9px] font-bold transition-opacity duration-500',
                    visible ? 'opacity-100' : 'opacity-0'
                  )}
                  style={{ transitionDelay: `${900 + i * 100}ms` }}
                  fill="hsl(var(--primary))"
                >
                  {Math.round(axis.value * progress)}%
                </text>
              </g>
            );
          })}

          {/* Center label */}
          <text
            x={cx} y={cy - 8}
            textAnchor="middle"
            className="text-[11px] font-bold fill-foreground"
            opacity={visible ? 1 : 0}
          >
            BMI Score
          </text>
          <text
            x={cx} y={cy + 10}
            textAnchor="middle"
            className="text-[22px] font-bold"
            fill="hsl(var(--primary))"
            opacity={visible ? 1 : 0}
          >
            {Math.round(82 * progress)}
          </text>
        </svg>
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Scan comportamental em tempo real — 5 eixos emocionais
      </p>
    </div>
  );
}

/* ═══════════════════════════════════
   GAUGE BARS — Pilares Emocionais
   ═══════════════════════════════════ */
const gaugeItems = [
  { label: 'Mapa Emocional Profundo', value: 94, icon: Brain, color: 'hsl(var(--primary))' },
  { label: 'Sinais Preditivos', value: 87, icon: Activity, color: 'hsl(45 93% 48%)' },
  { label: 'Linguagem Ideal', value: 78, icon: MessageSquare, color: 'hsl(160 84% 39%)' },
  { label: 'Gatilhos de Motivação', value: 91, icon: Zap, color: 'hsl(270 91% 65%)' },
  { label: 'Lead Scoring Comportamental', value: 85, icon: Target, color: 'hsl(0 84% 55%)' },
];

export function BMIGaugeBars() {
  const ref = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={ref} className="space-y-5">
      {gaugeItems.map(({ label, value, icon: Icon, color }, i) => (
        <div
          key={i}
          style={{
            opacity: animate ? 1 : 0,
            transform: animate ? 'translateX(0)' : 'translateX(20px)',
            transition: `opacity 0.5s ease ${i * 120}ms, transform 0.5s ease ${i * 120}ms`,
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xs font-semibold text-foreground">{label}</span>
            </div>
            <span className="text-xs font-bold" style={{ color }}>
              {value}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden relative" style={{ backgroundColor: `${color}15` }}>
            <div
              className="h-full rounded-full relative"
              style={{
                width: animate ? `${value}%` : '0%',
                background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                boxShadow: `0 0 12px ${color}40`,
                transition: `width 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${300 + i * 150}ms`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                  animation: animate ? 'bmiShimmer 2s 1.8s infinite' : 'none',
                }}
              />
            </div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes bmiShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════
   FLOW CONNECTION — Mentor ↔ Mentorado
   ═══════════════════════════════════ */
const flowSteps = [
  { label: 'Scraping Social', side: 'mentor' as const },
  { label: 'Mapa Emocional', side: 'mentor' as const },
  { label: 'Diagnóstico IA', side: 'center' as const },
  { label: 'Lead Scoring', side: 'mentee' as const },
  { label: 'Scripts Calibrados', side: 'mentee' as const },
];

export function BMIConnectionFlow() {
  const { ref, visible } = useAnimateOnView(0.2);
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!visible) return;
    let step = 0;
    const timer = setInterval(() => {
      setActiveStep(step);
      step++;
      if (step > flowSteps.length) {
        step = 0;
        setActiveStep(-1);
      }
    }, 800);
    return () => clearInterval(timer);
  }, [visible]);

  return (
    <div ref={ref} className="relative py-8">
      {/* Central brain icon */}
      <div className="flex items-center justify-center mb-6">
        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 relative',
          visible
            ? 'bg-primary/15 shadow-[0_0_30px_hsl(var(--primary)/0.3)]'
            : 'bg-muted/30'
        )}>
          <Brain className={cn(
            'w-8 h-8 transition-all duration-500',
            visible ? 'text-primary' : 'text-muted-foreground'
          )} />
          {/* Pulse ring */}
          <div className={cn(
            'absolute inset-0 rounded-2xl border-2 border-primary/30 transition-all duration-500',
            visible ? 'opacity-100 animate-ping' : 'opacity-0'
          )} style={{ animationDuration: '2s' }} />
        </div>
      </div>

      {/* Flow nodes */}
      <div className="flex items-center justify-between gap-2 relative">
        {/* Connection line */}
        <div className="absolute top-1/2 left-[10%] right-[10%] h-px -translate-y-1/2 z-0">
          <div className={cn(
            'h-full transition-all duration-1000',
            visible ? 'opacity-100' : 'opacity-0'
          )} style={{
            background: 'linear-gradient(90deg, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.6), hsl(var(--primary) / 0.4))'
          }} />
          {/* Traveling pulse */}
          {visible && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-8 h-1 rounded-full"
              style={{
                background: 'hsl(var(--primary))',
                boxShadow: '0 0 12px hsl(var(--primary) / 0.6)',
                animation: 'travelPulse 3s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {flowSteps.map((step, i) => {
          const isActive = i <= activeStep;
          const isMentor = step.side === 'mentor';
          const isCenter = step.side === 'center';
          const color = isCenter ? 'primary' : isMentor ? 'primary' : 'accent';

          return (
            <div
              key={i}
              className={cn(
                'relative z-10 flex flex-col items-center gap-2 transition-all duration-500',
                isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-90'
              )}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className={cn(
                'w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-500 border',
                isActive
                  ? `bg-${color}/15 border-${color}/30 shadow-[0_0_15px_hsl(var(--${color})/0.3)]`
                  : 'bg-muted/20 border-border/30'
              )} style={isActive ? {
                backgroundColor: `hsl(var(--${color}) / 0.15)`,
                borderColor: `hsl(var(--${color}) / 0.3)`,
                boxShadow: `0 0 15px hsl(var(--${color}) / 0.3)`,
              } : {}}>
                {isCenter ? (
                  <Zap className="w-5 h-5" style={{ color: `hsl(var(--${color}))` }} />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full" style={{
                    backgroundColor: isActive ? `hsl(var(--${color}))` : 'hsl(var(--muted-foreground))',
                    boxShadow: isActive ? `0 0 8px hsl(var(--${color}) / 0.5)` : 'none',
                  }} />
                )}
              </div>
              <span className={cn(
                'text-[9px] md:text-[10px] font-semibold text-center max-w-[70px] leading-tight transition-colors duration-300',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {step.label}
              </span>
              {/* Side label */}
              <span className={cn(
                'text-[8px] uppercase tracking-widest font-bold transition-opacity duration-300',
                isActive ? 'opacity-80' : 'opacity-30'
              )} style={{ color: `hsl(var(--${color}))` }}>
                {isMentor ? 'Mentor' : isCenter ? 'IA' : 'Mentorado'}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes travelPulse {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: calc(100% - 32px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
