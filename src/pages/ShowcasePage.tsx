import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { PLATFORM } from '@/lib/platform';
import { WelcomePopup } from '@/components/showcase/WelcomePopup';
import { Button } from '@/components/ui/button';
import {
  Brain, Target, MessageSquare, BarChart3, Trophy, BookOpen,
  Zap, Shield, Users, ArrowRight, ArrowLeft, Sparkles, TrendingUp,
  Eye, Bot, FileText, Flame, Star, Activity,
  Crosshair, Send, Swords, FileSignature, LineChart,
  UserCircle, PenTool, Calendar, AlertTriangle,
  Settings, LayoutDashboard, UserCheck, Bell, ClipboardList,
  Mail, Video, MonitorPlay, Award, Lock, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';


/* ── Scroll reveal ── */
function useReveal(threshold = 0.12) {
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

function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, visible } = useReveal();
  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        'relative px-6 md:px-12 lg:px-20 py-16 md:py-24 transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12',
        className
      )}
    >
      {children}
    </section>
  );
}

/* ── Animated Counter ── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !started) { setStarted(true); obs.unobserve(el); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Flow Card (modern) ── */
function GovernanceFlowCard({ step, index, total }: {
  step: { number: number; title: string; description: string; icon: React.ElementType; accent: string; details: React.ReactNode };
  index: number; total: number;
}) {
  const { ref, visible } = useReveal(0.15);
  const [isHovered, setIsHovered] = useState(false);
  const Icon = step.icon;

  return (
    <div
      ref={ref}
      className="relative"
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {/* Connector line */}
      {index < total - 1 && (
        <div className="hidden lg:block absolute top-1/2 -right-4 w-8 z-0">
          <div className={cn(
            'h-px transition-all duration-700',
            visible ? 'w-full opacity-100' : 'w-0 opacity-0'
          )} style={{
            background: `linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--accent) / 0.3))`,
            transitionDelay: `${(index + 1) * 200}ms`,
          }} />
          <div className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all duration-500',
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          )} style={{
            background: `hsl(var(--primary))`,
            boxShadow: `0 0 10px hsl(var(--primary) / 0.5)`,
            transitionDelay: `${(index + 1) * 250}ms`,
          }} />
        </div>
      )}

      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'relative h-full rounded-2xl p-6 transition-all duration-500 cursor-default overflow-hidden group',
          'border backdrop-blur-xl',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
          isHovered
            ? 'border-primary/40 bg-card/90 shadow-[0_0_40px_hsl(var(--primary)/0.12)] scale-[1.02]'
            : 'border-border/40 bg-card/50'
        )}
      >
        {/* Glow orb behind icon */}
        <div className={cn(
          'absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-opacity duration-500 pointer-events-none',
          isHovered ? 'opacity-30' : 'opacity-0'
        )} style={{ background: step.accent }} />

        {/* Step badge */}
        <div className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 transition-colors duration-300',
          isHovered ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground'
        )}>
          <span className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300',
            isHovered
              ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]'
              : 'bg-muted-foreground/20 text-muted-foreground'
          )}>
            {step.number}
          </span>
          Passo {step.number}
        </div>

        {/* Icon */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-500',
          isHovered
            ? 'bg-primary/15 shadow-[0_0_20px_hsl(var(--primary)/0.3)]'
            : 'bg-muted/50'
        )}>
          <Icon className={cn(
            'w-6 h-6 transition-all duration-300',
            isHovered ? 'text-primary scale-110' : 'text-muted-foreground'
          )} />
        </div>

        {/* Title */}
        <h3 className="font-display text-base font-bold text-foreground mb-2 leading-tight">
          {step.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Details - expandable on hover */}
        <div className={cn(
          'transition-all duration-500 overflow-hidden',
          isHovered ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        )}>
          {step.details}
        </div>

        {/* Bottom shine line */}
        <div className={cn(
          'absolute bottom-0 left-0 right-0 h-px transition-all duration-500',
          isHovered ? 'opacity-100' : 'opacity-0'
        )} style={{
          background: `linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)`
        }} />
      </div>
    </div>
  );
}

export default function ShowcasePage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const aiTools = [
    { icon: Crosshair, name: 'Qualificador de Leads', color: 'hsl(45 93% 48%)', desc: 'Score 0-100, temperatura e estratégia de abordagem.', expanded: { subtitle: 'Perfis sociais → oportunidades qualificadas', details: 'Scraping automático de Instagram e LinkedIn, cruzado com o Pitch do mentorado.', features: ['Score de 0 a 100 com justificativa', 'Temperatura: quente, morno ou frio', 'Abordagem personalizada', 'Detecção de dores', 'Script sugerido', 'Integração com CRM'], impact: 'Foco em quem tem maior probabilidade de fechar.' } },
    { icon: Send, name: 'Cold Messages', color: 'hsl(220 91% 65%)', desc: 'WhatsApp, IG, LinkedIn, Email com tom DISC.', expanded: { subtitle: 'Mensagens que abrem portas — em qualquer canal', details: 'Prospecção adaptada ao perfil DISC do lead e canal escolhido.', features: ['4 canais de comunicação', 'Tom DISC adaptado', 'Variações A/B', 'Follow-up sequencial', 'Personalização contextual', 'Gatilhos mentais calibrados'], impact: 'Taxa de resposta superior por mensagem cirurgicamente adaptada.' } },
    { icon: Swords, name: 'Simulador de Objeções', color: 'hsl(0 84% 55%)', desc: '9 fases de negociação High Ticket.', expanded: { subtitle: 'Treine antes de entrar na call', details: 'Role-play com IA em 9 fases de negociação High Ticket com objeções calibradas.', features: ['9 fases especializadas', 'Objeções por nicho', 'Feedback em tempo real', 'Score por sessão', 'Rebates sugeridos', 'Dificuldade progressiva'], impact: 'Confiança e repertório para calls reais.' } },
    { icon: FileSignature, name: 'Gerador de Propostas', color: 'hsl(270 91% 65%)', desc: 'Ancoragem de valor personalizada por lead.', expanded: { subtitle: 'Propostas profissionais em segundos', details: 'Propostas com ancoragem de valor, usando contexto do negócio e dados do lead.', features: ['Ancoragem de preço', 'Personalização por lead', 'Entregáveis detalhados', 'Gatilhos de urgência', 'Formato email/PDF', 'Tom configurável'], impact: 'Percepção elevada da oferta do mentorado.' } },
    { icon: LineChart, name: 'Análise de Conversão', color: 'hsl(160 84% 39%)', desc: 'Nota IA, objeções perdidas, evolução entre calls.', expanded: { subtitle: 'Diagnóstico IA de cada call', details: 'Transcrição → análise de performance, argumentação e oportunidades perdidas.', features: ['Nota 0-100', 'Pontos fortes', 'Objeções perdidas', 'Melhorias concretas', 'Análise de tom', 'Evolução entre calls'], impact: 'Cada call vira oportunidade de aprendizado.' } },
    { icon: UserCircle, name: 'Gerador de Bio', color: 'hsl(190 95% 45%)', desc: 'Bio otimizada para cada rede social.', expanded: { subtitle: 'Primeira impressão que converte', details: 'Bios que comunicam autoridade e proposta de valor por plataforma.', features: ['Instagram, LinkedIn, WhatsApp', 'Autoridade + CTA', 'Variações de tom', 'Palavras-chave', 'Emojis estratégicos', 'Posicionamento alinhado'], impact: 'Credibilidade antes do primeiro contato.' } },
    { icon: PenTool, name: 'Gerador de Conteúdo', color: 'hsl(45 100% 51%)', desc: 'Posts, carrosséis, stories alinhados à oferta.', expanded: { subtitle: 'Conteúdo estratégico sem bloqueio criativo', details: 'Conteúdos alinhados com oferta, público e estilo do mentorado.', features: ['Todos os formatos', 'Calendário editorial', 'Tom personalizado', 'CTAs estratégicos', 'Prova social', 'Hashtags otimizadas'], impact: 'Leads orgânicos qualificados para o pipeline.' } },
    { icon: Bot, name: 'Mentor Virtual 24/7', color: 'hsl(270 91% 55%)', desc: 'Chat contextual com histórico completo.', expanded: { subtitle: 'Um mentor que nunca dorme', details: 'IA com acesso a todo o contexto do mentorado: perfil, trilhas, CRM, tarefas.', features: ['Dados reais do aluno', 'Histórico completo', 'Orientação prática', 'Conversas salvas', 'Markdown formatado', '24/7 sem fila'], impact: 'Nunca fica travado — complementando o mentor real.' } },
  ];

  

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden theme-light">
      <WelcomePopup />
      <div className="animated-gradient-bg" />

      {/* ── Nav ── */}
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-12',
        scrollY > 50
          ? 'py-3 bg-background/80 backdrop-blur-xl border-b border-border/50'
          : 'py-5 bg-transparent'
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/60 hover:bg-muted border border-border/50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <BrandLogo variant="full" size="sm" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#fluxo" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Fluxo Governado</a>
            <a href="#arsenal" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Arsenal IA</a>
            <a href="#bmi" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">BMI</a>
            <a href="#metricas" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Métricas</a>
          </div>
          <Button onClick={() => navigate('/auth')} className="btn-premium px-6 h-10 text-sm font-semibold">
            <span>Acessar Plataforma</span>
          </Button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════
         HERO — A Pergunta que a Demo responde
         ═══════════════════════════════════════ */}
      <section id="showcase-hero" className="relative min-h-[90vh] flex items-center justify-center px-6 md:px-12 pt-24 pb-12 overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.06] pointer-events-none blur-3xl bg-primary" />
        <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-[0.04] pointer-events-none blur-3xl bg-accent" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary tracking-wider uppercase">
              Demonstração do Fluxo Governado
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] mb-8">
            "Como eu sei, <span className="text-gradient-gold">hoje,</span>
            <br />
            quem está vencendo e quem
            <br />
            está travando?"
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            Esta é a pergunta que o {PLATFORM.name} responde. Não com features soltas. Com{' '}
            <strong className="text-foreground">fluxo governado.</strong>
          </p>

          <Button
            onClick={() => document.getElementById('fluxo')?.scrollIntoView({ behavior: 'smooth' })}
            size="lg"
            className="btn-premium px-10 h-14 text-base"
          >
            <span className="flex items-center gap-2">
              Ver o Fluxo <ChevronDown className="w-5 h-5" />
            </span>
          </Button>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         FLUXO GOVERNADO — Modern Grid
         ═══════════════════════════════════════ */}
      <Section id="fluxo">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Governance Engine</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              O <span className="text-gradient-gold">Fluxo Governado</span> em ação
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base">
              Do onboarding ao resultado previsível — cada passo é governado pelo sistema.
            </p>
          </div>

          {/* Flow Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                number: 1, title: 'Mentorado entra → Governo começa', icon: UserCheck,
                accent: 'hsl(var(--primary))',
                description: 'Onboarding + Governo do Negócio + atribuição automática à Jornada CS.',
                details: (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {['Perfil', 'Jornada', 'Score'].map((item, i) => (
                      <div key={i} className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                        <span className="text-[10px] text-primary font-semibold">{item}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                number: 2, title: 'Arsenal IA ativado', icon: Brain,
                accent: 'hsl(var(--accent))',
                description: '8 IAs calibradas no negócio. CRM, qualificação, cold messages, objeções.',
                details: (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {aiTools.slice(0, 4).map((t, i) => (
                      <span key={i}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium">
                        <t.icon className="w-3 h-3" /> {t.name}
                      </span>
                    ))}
                    <span className="text-[10px] text-muted-foreground self-center">+4 mais</span>
                  </div>
                ),
              },
              {
                number: 3, title: 'Execução rastreada', icon: Activity,
                accent: 'hsl(var(--primary))',
                description: 'Cada ação alimenta o Score IA ponderado. Consistência > volume.',
                details: (
                  <div className="grid grid-cols-5 gap-1 pt-2">
                    {[
                      { l: 'Leads', w: 30 }, { l: 'Tarefas', w: 20 }, { l: 'Trilhas', w: 20 },
                      { l: 'Ativid.', w: 20 }, { l: 'Streak', w: 10 },
                    ].map((m, i) => (
                      <div key={i} className="text-center">
                        <div className="text-sm font-display font-bold text-primary"><AnimatedCounter target={m.w} suffix="%" /></div>
                        <div className="text-[9px] text-muted-foreground">{m.l}</div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                number: 4, title: 'Alertas de desvio', icon: Bell,
                accent: 'hsl(var(--destructive))',
                description: 'Inatividade, tarefas atrasadas e SOS disparam alertas automáticos.',
                details: (
                  <div className="space-y-1.5 pt-2">
                    {[
                      { t: 'Inatividade', c: 'destructive' },
                      { t: 'Tarefa atrasada', c: 'accent' },
                      { t: 'SOS urgência', c: 'destructive' },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-destructive/5 border border-destructive/15">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        <span className="text-[10px] text-foreground font-medium">{a.t}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                number: 5, title: 'Mentor intervém com dados', icon: Shield,
                accent: 'hsl(var(--primary))',
                description: 'Score, ranking, jornada CS, análise comportamental — decisão cirúrgica.',
                details: (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {[
                      { l: 'Score IA', v: 78 }, { l: 'Leads', v: 42 },
                      { l: 'Streak', v: 12 }, { l: 'Dia', v: 47 },
                    ].map((kpi, i) => (
                      <div key={i} className="text-center p-2 rounded-lg bg-primary/5 border border-primary/15">
                        <div className="text-base font-display font-bold text-primary"><AnimatedCounter target={kpi.v} /></div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{kpi.l}</div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                number: 6, title: 'Resultado governado', icon: TrendingUp,
                accent: 'hsl(var(--accent))',
                description: 'Resultados previsíveis. Quem executa sobe. Quem trava é resgatado.',
                details: (
                  <div className="pt-2">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 text-center">
                      <p className="text-xs font-display font-bold text-foreground">
                        "Governado para{' '}
                        <span className="text-gradient-gold">vencer.</span>"
                      </p>
                    </div>
                  </div>
                ),
              },
            ].map((step, i, arr) => (
              <GovernanceFlowCard key={i} step={step} index={i} total={arr.length} />
            ))}
          </div>

          {/* Bottom anchor quote */}
          <div className="mt-12 text-center">
            <div className="inline-block glass-card-glow px-8 py-5 rounded-2xl">
              <p className="text-lg font-display font-bold text-foreground">
                No {PLATFORM.name}, o mentorado é{' '}
                <span className="text-gradient-gold">governado para vencer.</span>
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         ARSENAL IA DETALHADO
         ═══════════════════════════════════════ */}
      <Section id="arsenal" className="relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] pointer-events-none blur-3xl bg-accent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Arsenal de Vendas IA</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="text-gradient-gold">8 IAs</span> calibradas no negócio do mentorado
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Passe o mouse em qualquer ferramenta para ver exatamente o que ela faz e qual o impacto no resultado.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiTools.map((t) => (
              <div
                key={t.name}
                className="relative group p-5 rounded-2xl border border-border/50 transition-all duration-300 bg-card/40 hover:bg-card/80 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--primary)/0.08)]"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)] transition-all duration-300">
                    <t.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <h4 className="font-display font-semibold text-foreground text-sm mb-1">{t.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>

                {/* Hover expand */}
                <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-72 group-hover:opacity-100 transition-all duration-500 ease-out">
                  <div className="pt-3 mt-3 border-t border-border/30 space-y-2.5">
                    <p className="text-[11px] text-primary font-semibold uppercase tracking-wider">Experiência</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{t.expanded.details}</p>
                    <div className="flex flex-wrap gap-1">
                      {t.expanded.features.slice(0, 3).map((f, fi) => (
                        <span key={fi} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] text-primary font-medium">
                          <Star className="w-2.5 h-2.5" /> {f}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-primary font-semibold uppercase tracking-wider pt-1">Resultado</p>
                    <p className="text-xs text-foreground/80 font-medium">{t.expanded.impact}</p>
                  </div>
                  {/* Bottom glow line */}
                  <div className="absolute bottom-0 left-[10%] right-[10%] h-[1px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.4),transparent)]" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-5 rounded-2xl bg-primary/5 border border-primary/15 text-center">
            <p className="text-sm text-foreground">
              <Activity className="w-4 h-4 inline-block mr-1.5 text-primary" />
              <strong>Telemetria completa:</strong> O mentor sabe quem está usando, com que frequência e para quais leads.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         MÉTRICAS E VISIBILIDADE
         ═══════════════════════════════════════ */}
      <Section id="metricas">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              O que o mentor vê <span className="text-gradient-gold">em tempo real</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Governo significa visibilidade total. Cada métrica responde uma pergunta operacional.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: 'Score IA por Mentorado', desc: 'Performance ponderada de 0 a 100 atualizada em tempo real.', experience: 'O mentor abre o painel e vê, em um número, quem está performando e quem precisa de atenção imediata.', result: 'Decisões cirúrgicas em segundos — sem achismo.' },
              { icon: Trophy, title: 'Ranking Competitivo', desc: 'Posição relativa entre mentorados — gamificação por resultado.', experience: 'Tabela de classificação que atualiza em tempo real conforme a execução. Mentorados se comparam entre si.', result: 'Competição saudável que acelera a execução da turma.' },
              { icon: TrendingUp, title: 'Evolução Temporal', desc: 'Gráficos de progresso por semana, mês e jornada.', experience: 'Curvas de evolução que mostram se o mentorado está acelerando, estagnando ou regredindo.', result: 'Antecipar problemas antes que virem desistência.' },
              { icon: AlertTriangle, title: 'Alertas Inteligentes', desc: 'Inatividade, tarefas atrasadas e SOS — antes que vire problema.', experience: 'Notificações automáticas no sino: quem sumiu, quem atrasou, quem pediu socorro.', result: 'Nenhum aluno fica invisível — o sistema não permite.' },
              { icon: Brain, title: 'Análise Comportamental', desc: 'DISC, medos ocultos, bloqueios e linguagem ideal — automático.', experience: 'Perfil psicológico gerado por IA com gatilhos de motivação e erros a evitar.', result: 'Comunicação calibrada para cada personalidade.' },
              { icon: Target, title: 'Jornada CS', desc: 'Progresso por etapa configurável com Kanban visual.', experience: 'Kanban visual onde cada mentorado aparece na etapa exata da sua jornada de evolução.', result: 'Visibilidade total do pipeline de sucesso do cliente.' },
              { icon: Users, title: 'Gestão 360°', desc: 'Perfil completo, KPIs, resumo IA, timeline e contato direto.', experience: 'Um clique abre tudo: KPIs, governo do negócio, atividades, contato via WhatsApp.', result: 'Monitoramento estratégico sem impersonation.' },
              { icon: Flame, title: 'Distribuição por Faixas', desc: 'Excelente, Bom, Regular, Atenção — visão da turma inteira.', experience: 'Gráfico que segmenta a turma por performance: quantos estão voando e quantos estão travados.', result: 'Visão macro para decisões de escala.' },
              { icon: Activity, title: 'Logs de Atividade', desc: 'Registro de cada ação do mentorado — transparência total.', experience: 'Feed em tempo real com cada lead criado, tarefa concluída e login registrado.', result: 'Prova concreta de execução — ou de ausência.' },
            ].map(({ icon: Icon, title, desc, experience, result }, i) => (
              <div key={i} className="glass-card rounded-2xl border border-border/30 hover:border-primary/30 transition-all duration-500 group relative overflow-hidden">
                <div className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-all duration-300 group-hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                    <Icon className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground mb-1.5">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
                {/* Expandable on hover */}
                <div className="max-h-0 group-hover:max-h-48 overflow-hidden transition-all duration-500 ease-out">
                  <div className="px-6 pb-5 space-y-3 border-t border-border/20 pt-4">
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Experiência</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{experience}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Resultado</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{result}</p>
                    </div>
                  </div>
                </div>
                {/* Bottom glow line */}
                <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)' }} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         BMI — BEHAVIORAL MENTORING INTELLIGENCE
         ═══════════════════════════════════════ */}
      <Section id="bmi">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/20 bg-accent/5 mb-6">
              <Brain className="w-4 h-4 text-accent animate-pulse" />
              <span className="text-xs font-medium text-accent tracking-wider uppercase">O Diferencial Invisível</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              <span className="text-gradient-gold">Behavioral Mentoring Intelligence</span>
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto text-base mb-2">
              O {PLATFORM.name} não analisa métricas genéricas. Ele lê <strong className="text-foreground">comportamento humano real</strong> — dos dois lados da mentoria.
            </p>
            <p className="text-sm text-muted-foreground/70 max-w-2xl mx-auto">
              Engenharia psicológica social, diagnóstico personalizado e análise de redes sociais. Sem teorias. Sem achismo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* Mentor Side */}
            <div className="glass-card-glow p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.05] pointer-events-none blur-3xl bg-primary group-hover:opacity-[0.1] transition-opacity duration-500" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">O Mentor Governa Comportamento</h3>
                  <p className="text-[11px] text-primary font-medium tracking-wide">Gestão de Sucesso Comportamental</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {[
                  { icon: Eye, title: 'Scraping Social Automatizado', desc: 'Instagram e LinkedIn do mentorado são lidos e analisados pela IA.' },
                  { icon: Brain, title: 'Mapa Emocional Profundo', desc: 'Medos ocultos, vícios emocionais, padrões de autossabotagem.' },
                  { icon: MessageSquare, title: 'Linguagem Ideal por Perfil', desc: 'A IA indica exatamente como se comunicar com cada aluno.' },
                  { icon: AlertTriangle, title: 'Sinais Preditivos', desc: 'Detecta risco de desengajamento antes que o mentorado perceba.' },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
                <p className="text-xs text-center font-medium text-foreground">
                  Resultado: O mentor sabe <strong className="text-primary">o que o aluno sente</strong> — não apenas o que faz.
                </p>
              </div>
            </div>

            {/* Mentorado Side */}
            <div className="glass-card p-8 rounded-2xl border border-accent/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.05] pointer-events-none blur-3xl bg-accent group-hover:opacity-[0.1] transition-opacity duration-500" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 group-hover:shadow-[0_0_20px_hsl(var(--accent)/0.3)] transition-all duration-300">
                  <Crosshair className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">O Mentorado Vende com Inteligência</h3>
                  <p className="text-[11px] text-accent font-medium tracking-wide">Inteligência de Vendas Comportamental</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {[
                  { icon: Crosshair, title: 'Lead Scoring Comportamental', desc: 'Score baseado no perfil real do lead, não em dados superficiais.' },
                  { icon: Brain, title: 'Análise de Personalidade do Lead', desc: 'A IA mapeia padrões de decisão, objeções prováveis e gatilhos.' },
                  { icon: Send, title: 'Scripts Calibrados por Emoção', desc: 'Abordagens personalizadas por perfil comportamental — não templates.' },
                  { icon: Swords, title: 'Objeções Previstas', desc: 'Sabe as objeções antes da call — preparado para cada cenário.' },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-accent/5 border border-accent/15">
                <p className="text-xs text-center font-medium text-foreground">
                  Resultado: O mentorado sabe <strong className="text-accent">como o lead pensa</strong> — antes de ligar.
                </p>
              </div>
            </div>
          </div>

          {/* BMI Bottom Anchor */}
          <div className="glass-card-glow p-8 md:p-10 rounded-3xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full opacity-[0.05] pointer-events-none blur-3xl bg-accent" />
            <div className="relative z-10">
              <p className="text-sm text-muted-foreground mb-3">Isso não existe em nenhuma plataforma do mercado.</p>
              <p className="text-xl md:text-2xl font-display font-bold text-foreground">
                <span className="text-gradient-gold">Inteligência comportamental real</span>
                <br />
                aplicada dos dois lados da mentoria.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         O QUE O MENTORADO VÊ
         ═══════════════════════════════════════ */}
      <Section id="visao-mentorado">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              O que o mentorado vê <span className="text-gradient-gold">no seu painel</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              O mentorado não é passivo. Ele opera um negócio — com ferramentas, metas e visibilidade.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: LayoutDashboard, title: 'Dashboard Pessoal', desc: 'Score IA, metas, streak e progresso da jornada em tempo real.', experience: 'Tela inicial com visão completa: onde está, o que falta e quanto já evoluiu.', result: 'Clareza total sobre o próprio progresso.' },
              { icon: Target, title: 'CRM Kanban', desc: 'Pipeline de vendas pessoal com estágios customizáveis e histórico.', experience: 'Arrasta leads entre colunas, registra interações e acompanha cada negociação.', result: 'Prospecção organizada — sem planilha, sem esquecimento.' },
              { icon: Brain, title: '8 Ferramentas IA', desc: 'Qualificação, cold messages, objeções, propostas — tudo contextualizado.', experience: 'Clica na ferramenta, a IA já sabe o negócio, o público e o pitch. Resultado em segundos.', result: 'Arsenal de vendas pessoal calibrado no seu negócio.' },
              { icon: BookOpen, title: 'Trilhas de Conteúdo', desc: 'Vídeos, textos e materiais com progresso dinâmico e certificados.', experience: 'Interface estilo Netflix com progresso automático e certificado ao concluir.', result: 'Aprendizado estruturado que gera certificação.' },
              { icon: ClipboardList, title: 'Tarefas com Kanban', desc: 'Criação autônoma e tarefas extraídas de reuniões com prioridade.', experience: 'Kanban pessoal: cria tarefas, prioriza e move entre colunas. Tarefas de reunião aparecem automaticamente.', result: 'Execução visível e rastreável.' },
              { icon: Trophy, title: 'Gamificação & Badges', desc: 'Pontos por execução real, badges de conquista e streak contínuo.', experience: 'Cada ação gera pontos. Streaks recompensam consistência. Badges celebram conquistas.', result: 'Motivação intrínseca atrelada a resultado.' },
              { icon: Bot, title: 'Mentor Virtual 24/7', desc: 'Chat IA contextual com histórico, dados e orientação personalizada.', experience: 'Conversa com uma IA que conhece seu negócio, suas tarefas, seus leads e seu progresso.', result: 'Nunca fica travado — orientação instantânea.' },
              { icon: Video, title: 'Arquivos & Reuniões', desc: 'Histórico de reuniões, gravações, documentos e materiais do mentor.', experience: 'Hub centralizado com todas as gravações, transcrições e materiais organizados por data.', result: 'Nada se perde — tudo acessível.' },
              { icon: Calendar, title: 'Agendamento', desc: 'Marcação direta de sessões com o mentor integrada ao calendário.', experience: 'Escolhe horário disponível e agenda direto — sem mensagem, sem espera.', result: 'Acesso ao mentor sem fricção.' },
              { icon: Award, title: 'Certificados', desc: 'Micro-certificações automáticas por trilha concluída, compartilháveis.', experience: 'Ao completar uma trilha, o certificado é gerado e pode ser compartilhado no LinkedIn.', result: 'Prova social de evolução profissional.' },
              { icon: AlertTriangle, title: 'Centro SOS', desc: 'Canal direto de urgência para momentos críticos da operação.', experience: 'Botão de emergência que notifica o mentor imediatamente com contexto do problema.', result: 'Resgate antes da desistência.' },
              { icon: Settings, title: 'Governo do Negócio', desc: 'Perfil estratégico: faturamento, gargalos, público e maturidade.', experience: 'Formulário estratégico que calibra toda a IA e alimenta o diagnóstico do mentor.', result: 'Contexto profundo desde o primeiro dia.' },
            ].map(({ icon: Icon, title, desc, experience, result }, i) => (
              <div key={i} className="glass-card rounded-2xl border border-accent/10 hover:border-accent/30 transition-all duration-500 group relative overflow-hidden">
                <div className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center mb-4 transition-all duration-300 group-hover:shadow-[0_0_15px_hsl(var(--accent)/0.3)]">
                    <Icon className="w-5 h-5 text-accent transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground mb-1.5">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
                {/* Expandable on hover */}
                <div className="max-h-0 group-hover:max-h-48 overflow-hidden transition-all duration-500 ease-out">
                  <div className="px-6 pb-5 space-y-3 border-t border-border/20 pt-4">
                    <div>
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Experiência</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{experience}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Resultado</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{result}</p>
                    </div>
                  </div>
                </div>
                {/* Bottom glow line */}
                <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--accent) / 0.5), transparent)' }} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         MÓDULOS COMPLETOS
         ═══════════════════════════════════════ */}
      <Section id="modulos-completos">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Tudo que está <span className="text-gradient-gold">incluído</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Duas experiências em uma plataforma: o Mentor governa, o Mentorado executa.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Mentor */}
            <div className="glass-card-glow p-8 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Painel do Mentor</h3>
                  <p className="text-xs text-muted-foreground">Governo total da operação</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Dashboard com KPIs e Score IA',
                  'Gestão individual com perfil 360°',
                  'Análise comportamental automática',
                  'Jornada CS configurável',
                  'Trilhas, gamificação e tarefas',
                  'Relatórios e ranking',
                  'Alertas inteligentes + Centro SOS',
                  'Reuniões com extração IA de tarefas',
                  'Email marketing automatizado',
                  'Branding White-Label completo',
                  'CRM consolidado da turma',
                  'Agendamento integrado',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mentorado */}
            <div className="glass-card p-8 rounded-2xl border border-accent/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Painel do Mentorado</h3>
                  <p className="text-xs text-muted-foreground">Arsenal completo de execução</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Dashboard pessoal com Score e metas',
                  'CRM Kanban com pipeline de vendas',
                  '8 ferramentas IA contextualizadas',
                  'Trilhas com vídeo e certificados',
                  'Gamificação, ranking e badges',
                  'Tarefas com Kanban e prioridade',
                  'Comunidade e networking',
                  'Agendamento com o mentor',
                  'Centro SOS para urgências',
                  'Meus arquivos e materiais',
                  'Perfil + Governo do Negócio',
                  'Certificados profissionais',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Star className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* White-Label */}
          <div className="glass-card-glow p-8 md:p-10 rounded-3xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.05] pointer-events-none blur-3xl bg-primary" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Lock className="w-4 h-4" />
                White-Label Completo
              </div>
              <h3 className="font-display text-2xl font-bold mb-3">
                Sua <span className="text-gradient-gold">marca</span>, sua plataforma
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6">
                O mentorado nunca vê o nome da nossa tecnologia. Logo, cores, fontes, landing page — tudo com a sua identidade.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
                {[
                  { icon: Eye, label: 'Logo' },
                  { icon: Sparkles, label: 'Cores + Fontes' },
                  { icon: MonitorPlay, label: 'Landing Page' },
                  { icon: Brain, label: 'IA Branding' },
                ].map(({ icon: Ic, label }, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/60 border border-border/30">
                    <Ic className="w-4 h-4 text-primary" />
                    <span className="text-[11px] text-foreground font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         CTA FINAL
         ═══════════════════════════════════════ */}
      <Section id="cta-final" className="pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card-glow p-12 md:p-16 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.06] pointer-events-none blur-3xl bg-accent" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                {PLATFORM.name} é <span className="text-gradient-gold">gestão estrutural</span>
                <br />
                para escala de mentorias high ticket.
              </h2>
              <p className="text-xl text-muted-foreground mb-2">
                O resto é ferramenta.
              </p>
              <p className="text-sm text-muted-foreground mb-10 max-w-xl mx-auto">
                Se você quer saber como isso funciona na prática para a sua operação, fale com a equipe.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={() => navigate('/auth?mode=signup')}
                  className="btn-premium px-10 h-14 text-base font-bold"
                  size="lg"
                >
                  <span className="flex items-center gap-2">
                    Solicitar Acesso <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 h-14 text-base border-primary/30 text-foreground hover:bg-primary/5"
                  onClick={() => {
                    navigate('/');
                    setTimeout(() => {
                      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }}
                >
                  Ver Investimento
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <BrandLogo variant="full" size="sm" className="opacity-70" />
          <p className="text-xs text-muted-foreground">
            {PLATFORM.email.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}
