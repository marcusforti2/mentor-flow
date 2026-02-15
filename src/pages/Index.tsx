import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, Shield, Zap, Target, BarChart3, CheckCircle2, X,
  Brain, Trophy, Users, AlertTriangle, BookOpen, Calendar,
  Mail, Video, Settings, Eye, Bot, Crosshair, Send, Swords,
  FileSignature, LineChart, UserCircle, PenTool, Activity,
  ChevronDown, Flame, Lock, MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { PLATFORM } from "@/lib/platform";
import { cn } from "@/lib/utils";

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

/* ── Counter animation ── */
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(0);
  const { ref: wrapRef, visible } = useReveal(0.3);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1500;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplayed(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, value]);

  return (
    <span ref={wrapRef as any}>
      <span ref={ref}>{displayed}</span>{suffix}
    </span>
  );
}

const Index = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const problemPoints = [
    'Plataformas feitas para curso gravado — não para mentoria ativa.',
    'CRMs que o aluno nunca abre.',
    'Ferramentas de IA isoladas, sem contexto.',
    'Acompanhamento subjetivo e baseado em achismo.',
    'Zero visibilidade real sobre execução.',
  ];

  const consequencePoints = [
    { icon: Users, text: 'Alunos perdidos sem saber o que fazer.' },
    { icon: BarChart3, text: 'Resultados inconsistentes e imprevisíveis.' },
    { icon: AlertTriangle, text: 'Sobrecarga operacional no mentor.' },
    { icon: Lock, text: 'Impossibilidade de escalar sem virar refém.' },
  ];

  const governanceFeatures = [
    { icon: Activity, title: 'Mede execução real', desc: 'Score IA ponderado por leads, tarefas, trilhas, atividades e consistência.' },
    { icon: BarChart3, title: 'Monitora consistência', desc: 'Streaks, logs de atividade e alertas de desvio em tempo real.' },
    { icon: AlertTriangle, title: 'Ativa alertas de desvio', desc: 'Sistema inteligente detecta inatividade, tarefas atrasadas e chamados SOS.' },
    { icon: BookOpen, title: 'Estrutura jornadas', desc: 'Jornadas CS configuráveis com etapas, prazos e progresso visual.' },
    { icon: Target, title: 'Força decisão baseada em dados', desc: 'Relatórios de performance, ranking e análise comportamental IA.' },
  ];

  const allModules = [
    { icon: Shield, title: 'Governance Engine', desc: 'Score IA, alertas de desvio, jornadas CS e monitoramento de execução real.' },
    { icon: Target, title: 'CRM para o Mentorado', desc: 'Pipeline Kanban com Vision IA, score, temperatura e abordagem sugerida.' },
    { icon: Brain, title: '8 IAs Contextuais', desc: 'Qualificador, Cold Messages, Objeções, Propostas, Bio, Conteúdo, Conversão, Mentor Virtual.' },
    { icon: Eye, title: 'Análise Comportamental', desc: 'DISC, Eneagrama, medos ocultos, bloqueios e linguagem ideal — tudo automático.' },
    { icon: BarChart3, title: 'Score IA Ponderado', desc: 'Fórmula: Leads 30% + Tarefas 20% + Trilhas 20% + Atividades 20% + Streak 10%.' },
    { icon: Trophy, title: 'Gamificação por Resultado', desc: 'Pontos, badges, streaks e ranking conectados a execução real — não a cliques.' },
    { icon: Users, title: 'Arquitetura Multi-Tenant', desc: 'Master → Mentor → Mentorado com isolamento total de dados por organização.' },
    { icon: Settings, title: 'White-Label Real', desc: 'Logo, cores, fontes, landing page e branding IA. O aluno vê SUA marca.' },
    { icon: BookOpen, title: 'Trilhas de Capacitação', desc: 'Vídeos, materiais, certificados automáticos e progresso rastreado.' },
    { icon: Calendar, title: 'Agendamento Integrado', desc: 'Disponibilidade, booking pelo mentorado e integração com reuniões.' },
    { icon: Video, title: 'Reuniões & Tarefas IA', desc: 'Transcrições, extração automática de tarefas e Kanban por mentorado.' },
    { icon: Mail, title: 'Email Marketing', desc: 'Fluxos visuais, templates e automações por gatilho segmentadas.' },
    { icon: AlertTriangle, title: 'Centro SOS + Alertas', desc: 'Triagem IA, notificação instantânea e histórico de ocorrências.' },
    { icon: MessageSquare, title: 'Comunidade', desc: 'Feed social, chat em tempo real e networking entre mentorados.' },
    { icon: Flame, title: 'Relatórios & Analytics', desc: 'Evolução temporal, distribuição por faixas e exportação de dados.' },
  ];

  const aiTools = [
    { icon: Crosshair, name: 'Qualificador de Leads', desc: 'Score 0-100, temperatura e estratégia de abordagem personalizada.' },
    { icon: Send, name: 'Cold Messages', desc: 'WhatsApp, Instagram, LinkedIn, Email — tom adaptado ao perfil DISC.' },
    { icon: Swords, name: 'Simulador de Objeções', desc: '9 fases de negociação High Ticket com cenários desafiadores.' },
    { icon: FileSignature, name: 'Gerador de Propostas', desc: 'Ancoragem de valor, personalização por lead e formato profissional.' },
    { icon: LineChart, name: 'Análise de Conversão', desc: 'Nota IA, pontos fortes, objeções perdidas e evolução entre calls.' },
    { icon: UserCircle, name: 'Gerador de Bio', desc: 'Bio otimizada para cada rede social com autoridade e CTA.' },
    { icon: PenTool, name: 'Gerador de Conteúdo', desc: 'Posts, carrosséis, stories com tom alinhado ao posicionamento.' },
    { icon: Bot, name: 'Mentor Virtual 24/7', desc: 'Chat contextual com histórico completo do negócio do aluno.' },
  ];

  const plans = [
    {
      name: 'Starter',
      price: 'R$ 30.000',
      monthly: 'R$ 2.497/mês',
      description: 'Para operações que precisam de estrutura imediata',
      features: ['Até 30 mentorados', 'Governance Engine completo', 'CRM com pipeline visual', '3 ferramentas IA', 'Trilhas ilimitadas', 'Dashboard + relatórios'],
      highlighted: false,
    },
    {
      name: 'Professional',
      price: 'R$ 60.000',
      monthly: 'R$ 4.997/mês',
      description: 'O arsenal completo para escala governada',
      features: ['Até 100 mentorados', '8 IAs com contexto unificado', 'Análise comportamental automática', 'Score IA + Gamificação', 'Alertas inteligentes + SOS', 'Branding personalizado', 'Agendamento + reuniões', 'Email marketing'],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'R$ 120.000',
      monthly: 'R$ 9.997/mês',
      description: 'Infraestrutura para operações de alto volume',
      features: ['Mentorados ilimitados', 'Tudo do Professional', 'Multi-mentor (equipe)', 'API + integrações avançadas', 'White-label completo', 'Análise comportamental avançada', 'Onboarding dedicado', 'SLA prioritário'],
      highlighted: false,
    },
  ];

  const comparisons = [
    { label: 'Plataforma de curso', has: false },
    { label: 'CRM genérico', has: false },
    { label: 'Ferramenta de IA isolada', has: false },
    { label: 'Planilha de acompanhamento', has: false },
    { label: 'Governo contínuo da execução', has: true },
    { label: 'Score IA baseado em dados reais', has: true },
    { label: '8 IAs com contexto unificado', has: true },
    { label: 'Arquitetura multi-tenant real', has: true },
  ];

  return (
    <div className="min-h-screen bg-background theme-light text-foreground overflow-x-hidden">
      <div className="animated-gradient-bg" />

      {/* ── Header ── */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-12",
        scrollY > 50
          ? 'py-3 bg-background/80 backdrop-blur-xl border-b border-border/50'
          : 'py-5 bg-transparent'
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <BrandLogo variant="full" size="md" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#problema" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">O Problema</a>
            <a href="#governance" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Governance Engine</a>
            <a href="#arsenal" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Arsenal IA</a>
            <a href="#infraestrutura" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Infraestrutura</a>
            <Link to="/showcase" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-foreground/70 hover:text-foreground font-medium hidden sm:flex">Entrar</Button>
            </Link>
            <Link to="/showcase">
              <Button className="btn-premium px-6">
                <span>Ver Demonstração</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
         1. HERO — Abertura com problema estrutural
         ═══════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-6 md:px-12 pt-24 pb-16 overflow-hidden">
        <div className="absolute top-[15%] left-[5%] w-[600px] h-[600px] rounded-full opacity-[0.06] pointer-events-none blur-3xl bg-primary" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-[0.04] pointer-events-none blur-3xl bg-accent" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8 animate-fade-in">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Gestão Estrutural para Escala de Mentorias High Ticket</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.08] mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Mentoria só escala
            <br />
            quando existe{' '}
            <span className="text-gradient-gold">governo.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-4 animate-fade-in leading-relaxed" style={{ animationDelay: '0.2s' }}>
            {PLATFORM.name} é o sistema operacional que governa a operação do mentor, a execução do mentorado e o resultado ao longo do tempo.
          </p>

          <p className="text-base text-muted-foreground/80 max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            O resto é ferramenta.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/showcase">
              <Button size="lg" className="btn-premium text-lg px-10 h-14">
                <span className="flex items-center gap-2">
                  Solicitar Demonstração <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </div>

          <div className="mt-20 animate-bounce">
            <ChevronDown className="w-6 h-6 text-muted-foreground mx-auto" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         2. O PROBLEMA — Quebra da ilusão
         ═══════════════════════════════════════ */}
      <Section id="problema">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Mentores high ticket não quebram
              <br />
              por falta de <span className="text-gradient-gold">conteúdo.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Quebram por falta de <strong className="text-foreground">governo.</strong>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* O que usam hoje */}
            <div className="glass-card p-8 rounded-2xl border border-destructive/20">
              <h3 className="font-display text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                O que a maioria opera hoje
              </h3>
              <ul className="space-y-4">
                {problemPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Consequências */}
            <div className="glass-card p-8 rounded-2xl border border-border/30">
              <h3 className="font-display text-lg font-bold text-foreground mb-6">O resultado?</h3>
              <div className="space-y-5">
                {consequencePoints.map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground font-medium">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/15">
                <p className="text-sm text-foreground font-medium text-center">
                  O caos não é do mentorado.<br />
                  <strong className="text-primary">É da estrutura.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         3. A TESE — Governance Engine
         ═══════════════════════════════════════ */}
      <Section id="governance">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">O Coração do Sistema</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              <span className="text-gradient-gold">Governance Engine</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-4">
              O módulo que transforma mentoria em operação governada. Não é customer success. Não é suporte.
            </p>
            <p className="text-xl text-foreground font-display font-semibold">
              É governo contínuo da execução do mentorado.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {governanceFeatures.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="glass-card-glow p-6 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-8 md:p-12 rounded-3xl border border-primary/20 text-center">
            <p className="text-xl md:text-2xl font-display font-bold text-foreground">
              "No {PLATFORM.name}, o mentorado é{' '}
              <span className="text-gradient-gold">governado para vencer.</span>"
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         4. A VIRADA CONCEITUAL
         ═══════════════════════════════════════ */}
      <Section>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              A virada que muda <span className="text-gradient-gold">tudo</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No {PLATFORM.name}, o mentorado não é passivo. O mentorado opera um negócio.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-card p-8 rounded-2xl border border-primary/20">
              <h3 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-primary" />
                O mentorado tem
              </h3>
              <ul className="space-y-4">
                {['Metas diárias de prospecção', 'Pipeline de vendas próprio', 'Score IA de performance', 'Tarefas com prazo e prioridade', 'Histórico completo de execução'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card p-8 rounded-2xl border border-accent/20">
              <h3 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-accent" />
                O mentor sabe
              </h3>
              <ul className="space-y-4">
                {['Quem está executando — e quem não está', 'Quem precisa de atenção urgente', 'Qual aluno está convertendo mais', 'Onde estão os gargalos da turma', 'Quando intervir e como intervir'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         5. ARSENAL IA — 8 Ferramentas
         ═══════════════════════════════════════ */}
      <Section id="arsenal" className="relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] pointer-events-none blur-3xl bg-accent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Arsenal de Vendas IA</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              <span className="text-gradient-gold">8 IAs</span> com contexto unificado
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Cada IA é treinada no negócio do mentorado: produto, público, pitch e histórico. Não são ferramentas genéricas. São armas calibradas.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiTools.map(({ icon: Icon, name, desc }, i) => (
              <div key={i} className="glass-card p-5 rounded-2xl border border-border/30 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--primary)/0.08)] transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-display font-semibold text-foreground text-sm mb-1.5">{name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-5 rounded-2xl bg-primary/5 border border-primary/15 text-center">
            <p className="text-sm text-foreground">
              <Activity className="w-4 h-4 inline-block mr-1.5 text-primary" />
              Toda utilização de IA é registrada em telemetria. O mentor sabe exatamente quem está usando, com que frequência e para quais leads.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         6. TUDO QUE ESTÁ INCLUÍDO
         ═══════════════════════════════════════ */}
      <Section id="infraestrutura">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Um único sistema. <span className="text-gradient-gold">Nada disso existe integrado</span> no mercado.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tudo que mentores precisam para governar operação, execução e resultado — em uma plataforma.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allModules.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-border/30 bg-card/40 hover:bg-card/80 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-foreground text-sm mb-1">{title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         7. COMPARAÇÃO IMPLÍCITA COM O MERCADO
         ═══════════════════════════════════════ */}
      <Section>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Isso não é <span className="text-gradient-gold">ferramenta.</span>
            </h2>
            <p className="text-lg text-muted-foreground">É infraestrutura de negócio.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Mercado */}
            <div className="rounded-2xl border border-destructive/15 bg-destructive/[0.02] p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-4.5 h-4.5 text-destructive" />
                </div>
                <h3 className="font-display font-bold text-foreground text-lg">O que o mercado vende</h3>
              </div>
              <div className="space-y-3">
                {comparisons.filter(c => !c.has).map(({ label }, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-background/60 border border-border/30">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </div>
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/60 text-center mt-5">Funcionalidades soltas. Sem governo.</p>
            </div>

            {/* MentorFlow */}
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.06] pointer-events-none blur-2xl bg-primary" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="font-display font-bold text-foreground text-lg">{PLATFORM.name}</h3>
              </div>
              <div className="space-y-3 relative z-10">
                {comparisons.filter(c => c.has).map(({ label }, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/15 group hover:border-primary/30 hover:bg-primary/10 transition-all duration-300">
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground font-medium">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-primary/70 text-center mt-5 font-medium relative z-10">Infraestrutura integrada. Governo real.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         8. PRICING — Infraestrutura, não mensalidade
         ═══════════════════════════════════════ */}
      <Section id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Investimento em <span className="text-gradient-gold">infraestrutura</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Fração mínima do faturamento. Substituição de múltiplas ferramentas. Previsibilidade e escala.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={cn(
                  'glass-card rounded-2xl overflow-hidden border',
                  plan.highlighted
                    ? 'border-primary/30 ring-2 ring-primary/20 glass-card-glow'
                    : 'border-border/30'
                )}
              >
                {plan.highlighted && (
                  <div className="h-1 bg-gradient-to-r from-primary to-accent" />
                )}
                <div className="p-8">
                  <h3 className="font-display text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-5">{plan.description}</p>
                  <div className="mb-1">
                    <span className="text-3xl font-display font-bold text-foreground">{plan.price}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Implementação</span>
                  <p className="text-sm text-muted-foreground mt-1 mb-6">{plan.monthly}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/showcase">
                    <Button
                      className={cn('w-full', plan.highlighted ? 'btn-premium' : '')}
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      <span>{plan.highlighted ? 'Solicitar Demonstração' : 'Falar com Especialista'}</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         9. CTA FINAL — Âncora
         ═══════════════════════════════════════ */}
      <Section className="pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card-glow p-12 md:p-16 rounded-3xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.06] pointer-events-none blur-3xl bg-accent" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                {PLATFORM.name} é <span className="text-gradient-gold">gestão estrutural</span>
                <br />
                para escala de mentorias high ticket.
              </h2>
              <p className="text-xl text-muted-foreground mb-2">
                O resto é ferramenta.
              </p>
              <p className="text-sm text-muted-foreground mb-10 max-w-xl mx-auto">
                Se você já vende, já tem alunos e já sente o peso da operação — esse sistema foi construído para você.
              </p>
              <Link to="/showcase">
                <Button size="lg" className="btn-premium text-lg px-10 h-14">
                  <span className="flex items-center gap-2">
                    Solicitar Demonstração <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <BrandLogo variant="full" size="sm" className="opacity-70" />
            <p className="text-sm text-muted-foreground">
              {PLATFORM.email.footer}
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Termos</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacidade</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contato</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
