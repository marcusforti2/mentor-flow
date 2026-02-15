import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { PLATFORM } from '@/lib/platform';
import { Button } from '@/components/ui/button';
import {
  Brain, Target, MessageSquare, BarChart3, Trophy, BookOpen,
  Zap, Shield, Users, ArrowRight, Sparkles, TrendingUp,
  Eye, Mic, FileText, Bot, Flame, ChevronDown, Star,
  Crosshair, Send, Swords, FileSignature, LineChart,
  UserCircle, PenTool, GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Intersection Observer hook for scroll reveal
   ───────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ─────────────────────────────────────────────
   Reusable section wrapper with reveal animation
   ───────────────────────────────────────────── */
function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, visible } = useReveal();
  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        'relative px-6 md:px-12 lg:px-20 py-20 md:py-28 transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12',
        className
      )}
    >
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────
   Feature Card Component
   ───────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, description, color, delay = 0 }: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div
      ref={ref}
      className={cn(
        'glass-card p-6 hover-lift group cursor-default transition-all duration-500',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI Tool Card (Arsenal)
   ───────────────────────────────────────────── */
function AIToolCard({ icon: Icon, name, description, delay = 0 }: {
  icon: React.ElementType;
  name: string;
  description: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal(0.08);
  return (
    <div
      ref={ref}
      className={cn(
        'relative group p-5 rounded-2xl border border-border/50 transition-all duration-500',
        'bg-card/40 hover:bg-card/80 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(45_100%_51%/0.08)]',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 className="font-display font-semibold text-foreground text-sm mb-1">{name}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Stat Counter
   ───────────────────────────────────────────── */
function StatBlock({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  const { ref, visible } = useReveal(0.2);
  return (
    <div
      ref={ref}
      className={cn(
        'text-center transition-all duration-700',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-4xl md:text-5xl font-display font-bold text-gradient-gold mb-2">{value}</div>
      <div className="text-sm text-muted-foreground tracking-wide uppercase">{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN SHOWCASE PAGE
   ═══════════════════════════════════════════════ */
export default function ShowcasePage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const aiTools = [
    { icon: Crosshair, name: 'Qualificador de Leads', description: 'Analisa perfis com IA e gera score, temperatura e estratégia personalizada de abordagem.' },
    { icon: Send, name: 'Cold Messages', description: 'Gera mensagens frias para WhatsApp, Instagram, LinkedIn e Email com tom adaptado ao perfil do lead.' },
    { icon: Swords, name: 'Simulador de Objeções', description: 'Treine respostas para as objeções mais comuns do seu nicho em cenários realistas com IA.' },
    { icon: FileSignature, name: 'Gerador de Propostas', description: 'Crie propostas comerciais profissionais com ancoragem de valor baseada no perfil do cliente.' },
    { icon: LineChart, name: 'Análise de Conversão', description: 'Envie transcrições de reuniões e receba feedback detalhado de performance com nota IA.' },
    { icon: UserCircle, name: 'Gerador de Bio', description: 'Bio otimizada para Instagram, LinkedIn e WhatsApp que comunica autoridade e gera conexão.' },
    { icon: PenTool, name: 'Gerador de Conteúdo', description: 'Crie posts, carrosséis e stories baseados na sua oferta, público e tom de comunicação.' },
    { icon: Bot, name: 'Mentor Virtual 24/7', description: 'Tire dúvidas estratégicas a qualquer hora. A IA conhece seu negócio e dá respostas práticas.' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Animated background ── */}
      <div className="animated-gradient-bg" />

      {/* ── Floating Nav ── */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-12',
          scrollY > 50
            ? 'py-3 bg-background/80 backdrop-blur-xl border-b border-border/50'
            : 'py-6 bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BrandLogo variant="full" size="sm" />
          <div className="hidden md:flex items-center gap-8">
            {[
              ['#arsenal', 'Arsenal IA'],
              ['#crm', 'CRM'],
              ['#trilhas', 'Trilhas'],
              ['#gamificacao', 'Gamificação'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
          <Button
            onClick={() => navigate('/auth')}
            className="btn-premium px-6 h-10 text-sm font-semibold"
          >
            <span>Acessar Plataforma</span>
          </Button>
        </div>
      </nav>

      {/* ═══════════════════════
         HERO SECTION
         ═══════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-6 md:px-12 pt-24 pb-12 overflow-hidden">
        {/* Ambient orbs */}
        <div
          className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.07] pointer-events-none blur-3xl"
          style={{ background: 'hsl(45 100% 51%)' }}
        />
        <div
          className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-[0.05] pointer-events-none blur-3xl"
          style={{ background: 'hsl(220 91% 65%)' }}
        />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary tracking-wider uppercase">
              Tecnologia que vende por você
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
            Seu{' '}
            <span className="text-gradient-gold">arsenal completo</span>
            <br />
            para vender mais.
          </h1>

          {/* Sub */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            8 inteligências artificiais treinadas no seu negócio, CRM inteligente,
            trilhas de capacitação e gamificação — tudo integrado em uma única plataforma.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              onClick={() => navigate('/auth')}
              className="btn-premium px-8 h-14 text-base font-bold"
              size="lg"
            >
              <span className="flex items-center gap-2">
                Começar Agora <ArrowRight className="w-5 h-5" />
              </span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 h-14 text-base border-border/50 text-muted-foreground hover:text-foreground hover:bg-card/50"
              onClick={() => document.getElementById('arsenal')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Ver Funcionalidades
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="animate-bounce">
            <ChevronDown className="w-6 h-6 text-muted-foreground mx-auto" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════
         STATS BAR
         ═══════════════════════ */}
      <Section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-8 md:p-12 rounded-3xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatBlock value="8" label="IAs Integradas" delay={0} />
              <StatBlock value="24/7" label="Mentor Virtual" delay={100} />
              <StatBlock value="∞" label="Leads Qualificados" delay={200} />
              <StatBlock value="100%" label="Personalizado" delay={300} />
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         PROBLEM → SOLUTION
         ═══════════════════════ */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              O problema que você <span className="text-gradient-gold">já conhece</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Prospectar sem processo é como atirar no escuro. Você sabe que pode mais — só faltava a ferramenta certa.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {/* Before */}
            <div className="glass-card p-8 rounded-2xl border-destructive/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="text-destructive text-lg">✕</span>
                </div>
                <h3 className="font-display text-xl font-semibold text-destructive">Sem a plataforma</h3>
              </div>
              <ul className="space-y-4">
                {[
                  'Prospectando no escuro, sem dados do lead',
                  'Mensagens genéricas que ninguém responde',
                  'Sem processo: cada venda é uma surpresa',
                  'Follow-up esquecido, lead esfriou',
                  'Depende de sorte, não de estratégia',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="text-destructive mt-0.5">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="glass-card-glow p-8 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-primary">Com a plataforma</h3>
              </div>
              <ul className="space-y-4">
                {[
                  'IA analisa o perfil e entrega a abordagem ideal',
                  'Mensagens personalizadas por canal e persona',
                  'CRM visual com pipeline e priorização automática',
                  'Follow-up inteligente — nunca mais perca um lead',
                  'Dados, gamificação e ranking pra manter o ritmo',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <Star className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         ARSENAL DE VENDAS (8 IAs)
         ═══════════════════════ */}
      <Section id="arsenal" className="relative">
        {/* Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] pointer-events-none blur-3xl"
          style={{ background: 'hsl(45 100% 51%)' }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Arsenal de Vendas</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="text-gradient-gold">8 IAs</span> trabalhando pelo seu resultado
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Cada ferramenta conhece seu produto, seu público e seu pitch. 
              É como ter uma equipe inteira de vendas, 24 horas por dia.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiTools.map((tool, i) => (
              <AIToolCard key={tool.name} {...tool} delay={i * 70} />
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         CRM INTELIGENTE
         ═══════════════════════ */}
      <Section id="crm">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 mb-6">
                <Target className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-accent tracking-wider uppercase">CRM com Vision IA</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Seu funil organizado com{' '}
                <span className="text-gradient-premium">inteligência visual</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Pipeline Kanban com arrastar e soltar, qualificação automática por IA 
                e a revolução: tire um print do perfil do lead e a IA extrai tudo pra você.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: Eye, text: 'Vision IA: print → lead qualificado em segundos' },
                  { icon: BarChart3, text: 'Pipeline visual com arraste entre fases' },
                  { icon: TrendingUp, text: 'Score e temperatura automáticos por lead' },
                  { icon: MessageSquare, text: 'Abordagem sugerida pela IA com base no perfil DISC' },
                ].map(({ icon: Ic, text }, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Ic className="w-4 h-4 text-accent" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual mockup */}
            <div className="relative">
              <div className="glass-card-glow p-6 rounded-2xl">
                <div className="space-y-3">
                  {['Novo', 'Contato', 'Negociação', 'Fechado'].map((stage, i) => (
                    <div
                      key={stage}
                      className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/30"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            background: ['hsl(45 100% 51%)', 'hsl(220 91% 65%)', 'hsl(270 91% 65%)', 'hsl(160 84% 45%)'][i],
                          }}
                        />
                        <span className="text-sm font-medium text-foreground">{stage}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{[12, 8, 5, 3][i]} leads</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">Score IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-card">
                      <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-primary to-accent" />
                    </div>
                    <span className="text-xs font-bold text-primary">85%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         TRILHAS DE CONTEÚDO
         ═══════════════════════ */}
      <Section id="trilhas">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-400/20 bg-purple-400/5 mb-6">
              <BookOpen className="w-3.5 h-3.5" style={{ color: 'hsl(270 91% 65%)' }} />
              <span className="text-xs font-medium tracking-wider uppercase" style={{ color: 'hsl(270 91% 65%)' }}>
                Trilhas de Capacitação
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Aprenda no ritmo certo,{' '}
              <span className="text-gradient-premium">como na Netflix</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Trilhas de conteúdo organizadas em módulos e aulas com vídeo player integrado, 
              acompanhamento de progresso e certificados de conclusão.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Prospecção Outbound', lessons: 12, duration: '4h 30min', progress: 75, color: 'hsl(45 100% 51%)' },
              { title: 'Fechamento High Ticket', lessons: 8, duration: '3h 15min', progress: 40, color: 'hsl(220 91% 65%)' },
              { title: 'Script de Vendas', lessons: 10, duration: '2h 45min', progress: 0, color: 'hsl(270 91% 65%)' },
            ].map((trail, i) => (
              <div key={i} className="glass-card hover-lift rounded-2xl overflow-hidden group">
                {/* Trail cover */}
                <div
                  className="h-36 relative"
                  style={{
                    background: `linear-gradient(135deg, ${trail.color}15 0%, ${trail.color}05 100%)`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GraduationCap className="w-12 h-12 opacity-20" style={{ color: trail.color }} />
                  </div>
                  {trail.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-card/50">
                      <div
                        className="h-full rounded-r-full"
                        style={{ width: `${trail.progress}%`, background: trail.color }}
                      />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-display font-semibold text-foreground mb-2">{trail.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{trail.lessons} aulas</span>
                    <span>·</span>
                    <span>{trail.duration}</span>
                  </div>
                  {trail.progress > 0 && (
                    <div className="mt-3 text-xs font-medium" style={{ color: trail.color }}>
                      {trail.progress}% concluído
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         GAMIFICAÇÃO
         ═══════════════════════ */}
      <Section id="gamificacao">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Visual */}
            <div className="order-2 lg:order-1 relative">
              <div className="glass-card-glow p-8 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-bold text-foreground">Seu Progresso</h3>
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10">
                    <Flame className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary">7 dias</span>
                  </div>
                </div>

                {/* XP bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Nível 12</span>
                    <span className="text-xs text-primary font-medium">2.450 / 3.000 XP</span>
                  </div>
                  <div className="h-3 rounded-full bg-card">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
                      style={{ width: '82%' }}
                    />
                  </div>
                </div>

                {/* Badges */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { emoji: '🎯', label: 'Sniper' },
                    { emoji: '🔥', label: 'Streak 7' },
                    { emoji: '💎', label: 'Top 10' },
                    { emoji: '🏆', label: 'Closer' },
                  ].map((badge, i) => (
                    <div
                      key={i}
                      className="glass-card p-3 rounded-xl text-center"
                    >
                      <div className="text-2xl mb-1">{badge.emoji}</div>
                      <div className="text-[10px] text-muted-foreground">{badge.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/20 bg-emerald-400/5 mb-6">
                <Trophy className="w-3.5 h-3.5" style={{ color: 'hsl(160 84% 45%)' }} />
                <span className="text-xs font-medium tracking-wider uppercase" style={{ color: 'hsl(160 84% 45%)' }}>
                  Gamificação
                </span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Transforme disciplina em{' '}
                <span className="text-gradient-gold">vício de vender</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Pontos por cada ação, badges de conquista, ofensivas diárias e ranking 
                entre mentorados. Gamificação que transforma rotina comercial em competição saudável.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Flame, label: 'Ofensivas diárias' },
                  { icon: Trophy, label: 'Ranking competitivo' },
                  { icon: Star, label: 'Badges de conquista' },
                  { icon: Zap, label: 'Loja de prêmios' },
                ].map(({ icon: Ic, label }, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Ic className="w-4 h-4 text-primary" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         MORE FEATURES GRID
         ═══════════════════════ */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              E tem <span className="text-gradient-gold">muito mais</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Cada detalhe pensado para potencializar sua performance comercial.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Shield}
              title="Centro SOS"
              description="Suporte urgente com triagem inteligente do Mentor Virtual. Seu mentor é notificado em tempo real."
              color="hsl(0 84% 60%)"
              delay={0}
            />
            <FeatureCard
              icon={Users}
              title="Comunidade"
              description="Troque experiências, compartilhe vitórias e aprenda com outros mentorados em tempo real."
              color="hsl(220 91% 65%)"
              delay={100}
            />
            <FeatureCard
              icon={Mic}
              title="Análise de Calls"
              description="Suba transcrições de reuniões e receba diagnóstico de performance com nota IA e pontos de melhoria."
              color="hsl(160 84% 45%)"
              delay={200}
            />
            <FeatureCard
              icon={FileText}
              title="Meus Arquivos"
              description="Central de materiais organizados pelo seu mentor: apresentações, scripts, planilhas e mais."
              color="hsl(270 91% 65%)"
              delay={300}
            />
            <FeatureCard
              icon={BarChart3}
              title="Calendário Integrado"
              description="Reuniões, eventos e encontros agendados pelo mentor com confirmação automática."
              color="hsl(190 95% 55%)"
              delay={400}
            />
            <FeatureCard
              icon={GraduationCap}
              title="Certificados"
              description="Ao concluir trilhas, ganhe certificados profissionais para fortalecer sua autoridade."
              color="hsl(45 100% 51%)"
              delay={500}
            />
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         FINAL CTA
         ═══════════════════════ */}
      <Section className="pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card-glow p-12 md:p-16 rounded-3xl relative overflow-hidden">
            {/* Background glow */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.08] pointer-events-none blur-3xl"
              style={{ background: 'hsl(45 100% 51%)' }}
            />

            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Pronto pra vender{' '}
                <span className="text-gradient-gold">diferente?</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
                A mesma tecnologia usada por mentores de alta performance, 
                agora no seu dia a dia. Entre e comece a prospectar com inteligência.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                className="btn-premium px-10 h-14 text-base font-bold"
                size="lg"
              >
                <span className="flex items-center gap-2">
                  Entrar na Plataforma <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <BrandLogo variant="full" size="sm" className="opacity-60" />
          <p className="text-xs text-muted-foreground">
            {PLATFORM.email.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}
