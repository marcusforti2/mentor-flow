import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, Shield, Zap, Target, BarChart3, CheckCircle2, XCircle,
  Brain, Trophy, Users, AlertTriangle, BookOpen, Calendar,
  Mail, Video, Settings, Eye, Bot, Crosshair, Send, Swords,
  FileSignature, LineChart, UserCircle, PenTool, Activity,
  ChevronDown, Flame, Lock, MessageSquare, Star,
  FileText, ClipboardList, Mic, Upload, HelpCircle, Phone,
  Layers, Play, Award, TrendingUp, Sparkles
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

/* ── FAQ Accordion ── */
function FAQAccordion() {
  const faqs = [
    { q: 'O que é o MentorFlow.io?', a: 'É um sistema operacional completo para mentores high ticket. Não é plataforma de curso, não é CRM isolado. É infraestrutura de governo que une gestão do mentor, execução do mentorado e inteligência artificial — tudo integrado.' },
    { q: 'Funciona para qual tipo de mentoria?', a: 'Para mentorias e consultorias high ticket (R$3k+) que exigem acompanhamento individual, execução monitorada e resultados previsíveis. Se você vende conteúdo gravado, não é para você.' },
    { q: 'O mentorado vê a marca do MentorFlow?', a: 'Não. O sistema é 100% white-label. Seu mentorado vê sua marca, suas cores, seu logo e sua landing page. A tecnologia é invisível.' },
    { q: 'Quanto tempo leva para implementar?', a: 'De 7 a 15 dias úteis, dependendo da complexidade. Inclui diagnóstico, configuração, migração de dados e treinamento.' },
    { q: 'Posso usar se já tenho alunos em outra plataforma?', a: 'Sim. Fazemos a migração de dados e o onboarding dos mentorados existentes. O processo é assistido e incluso na implementação.' },
    { q: 'As IAs precisam de API key ou configuração?', a: 'Não. Todas as 8 IAs já vêm integradas e prontas para uso. O mentorado só precisa preencher o perfil do negócio para calibrar as respostas.' },
    { q: 'Tem contrato de fidelidade?', a: 'Não. A mensalidade é mês a mês. Sem fidelidade, sem multa. Você fica porque funciona, não porque está preso.' },
    { q: 'Qual a diferença para Hotmart, Kajabi ou Teachable?', a: 'Essas plataformas foram feitas para cursos gravados. O MentorFlow.io foi construído para mentoria ativa — com governo de execução, CRM individual, IA contextual e acompanhamento comportamental. São categorias diferentes.' },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {faqs.map(({ q, a }, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card/40 overflow-hidden transition-all duration-300 hover:border-primary/20">
          <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
            <span className="font-display font-semibold text-foreground text-sm pr-4">{q}</span>
            <ChevronDown className={cn("w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300", openIdx === i && "rotate-180")} />
          </button>
          <div className={cn("overflow-hidden transition-all duration-300", openIdx === i ? "max-h-48 pb-5 px-5" : "max-h-0")}>
            <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
          </div>
        </div>
      ))}
    </div>
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
      tagline: 'Estrutura imediata',
      price: 'R$ 30.000',
      monthly: 'R$ 1.997',
      description: 'Para operações que precisam de governo desde o dia 1.',
      features: ['Até 30 mentorados', 'Governance Engine completo', 'CRM com pipeline visual', '3 ferramentas IA', 'Trilhas ilimitadas', 'Dashboard + relatórios'],
      hoverExtras: ['Onboarding guiado incluso', 'Migração de dados assistida', 'Suporte por e-mail em até 48h'],
      highlighted: false,
      anchor: 'Menos que 1 mentorado paga a operação do ano inteiro.',
    },
    {
      name: 'Professional',
      tagline: 'Escala governada',
      price: 'R$ 60.000',
      monthly: 'R$ 3.997',
      description: 'O arsenal completo para quem já fatura e precisa escalar sem perder controle.',
      features: ['Até 100 mentorados', '8 IAs com contexto unificado', 'Análise comportamental automática', 'Score IA + Gamificação', 'Alertas inteligentes + SOS', 'Branding personalizado', 'Agendamento + reuniões', 'Email marketing'],
      hoverExtras: ['Implementação em até 15 dias', 'Treinamento da equipe incluso', 'Suporte prioritário 24h'],
      highlighted: true,
      anchor: 'Com 2 fechamentos High Ticket, a implementação se paga.',
    },
    {
      name: 'Enterprise',
      tagline: 'Operação de alto volume',
      price: 'R$ 120.000',
      monthly: 'R$ 8.997',
      description: 'Infraestrutura white-label para operações com múltiplos mentores.',
      features: ['Mentorados ilimitados', 'Tudo do Professional', 'Multi-mentor (equipe)', 'API + integrações avançadas', 'White-label completo', 'Análise comportamental avançada', 'Onboarding dedicado', 'SLA prioritário'],
      hoverExtras: ['Gerente de sucesso dedicado', 'Customizações sob demanda', 'Contrato com SLA garantido'],
      highlighted: false,
      anchor: 'Para quem fatura 7+ dígitos e precisa de infraestrutura à altura.',
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
            <a href="#governance" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Governance</a>
            <a href="#arsenal" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Arsenal IA</a>
            <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Como Funciona</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Investimento</a>
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
            {PLATFORM.name} é o sistema operacional que governa a operação do mentor, a execução do mentorado e o resultado ao longo do tempo — com inteligência comportamental aplicada dos dois lados.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-4 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary">
              <Brain className="w-3 h-3" />
              Engenharia Psicológica Social
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary">
              <Target className="w-3 h-3" />
              Diagnóstico Personalizado
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary">
              <Activity className="w-3 h-3" />
              Resultado Baseado em Dados Reais
            </span>
          </div>

          <p className="text-base text-muted-foreground/80 max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            O resto é ferramenta.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <Link to="/showcase">
              <Button size="lg" className="btn-premium text-lg px-10 h-14">
                <span className="flex items-center gap-2">
                  Ver Demonstração <ArrowRight className="w-5 h-5" />
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
         4.5. BMI — Behavioral Mentoring Intelligence
         ═══════════════════════════════════════ */}
      <Section id="bmi">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/20 bg-accent/5 mb-6">
              <Brain className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium text-accent tracking-wider uppercase">Nova Categoria</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              <span className="text-gradient-gold">Behavioral Mentoring Intelligence</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-2">
              Não usamos métricas genéricas. Usamos <strong className="text-foreground">engenharia psicológica social</strong>, diagnóstico personalizado e análise de redes sociais — cruzados com o contexto da mentoria.
            </p>
            <p className="text-base text-muted-foreground/70 max-w-2xl mx-auto">
              Isso muda tudo. Para o mentor e para o mentorado.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Mentor Side */}
            <div className="glass-card-glow p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.06] pointer-events-none blur-2xl bg-primary" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Para o Mentor</h3>
                  <p className="text-xs text-primary font-medium">Gestão de Sucesso Comportamental</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                O mentor não acompanha tarefas. Ele <strong className="text-foreground">governa comportamento humano</strong> — medos, bloqueios, padrões emocionais e gatilhos de motivação.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: Eye, text: 'Scraping de Instagram e LinkedIn do mentorado' },
                  { icon: Brain, text: 'Mapeamento de medos ocultos e vícios emocionais' },
                  { icon: MessageSquare, text: 'Linguagem ideal calibrada por perfil DISC' },
                  { icon: AlertTriangle, text: 'Sinais preditivos de desengajamento' },
                  { icon: Target, text: 'Estratégia de potencialização individualizada' },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/15">
                <p className="text-xs text-foreground text-center font-medium">
                  "Eu sei <strong className="text-primary">o que ele sente</strong>, não apenas o que ele faz."
                </p>
              </div>
            </div>

            {/* Mentorado Side */}
            <div className="glass-card p-8 rounded-2xl border border-accent/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.06] pointer-events-none blur-2xl bg-accent" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Crosshair className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Para o Mentorado</h3>
                  <p className="text-xs text-accent font-medium">Inteligência de Vendas Comportamental</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                O mentorado não usa scripts genéricos. Ele vende com <strong className="text-foreground">inteligência baseada no perfil emocional e comportamental real do lead</strong>.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: Crosshair, text: 'Qualificação de leads via scraping social automatizado' },
                  { icon: Brain, text: 'Análise de personalidade e padrões do lead' },
                  { icon: Send, text: 'Scripts de abordagem calibrados por comportamento' },
                  { icon: Swords, text: 'Objeções previstas baseadas em perfil emocional' },
                  { icon: LineChart, text: 'Match lead × negócio com score inteligente' },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-4 rounded-xl bg-accent/5 border border-accent/15">
                <p className="text-xs text-foreground text-center font-medium">
                  "Eu sei <strong className="text-accent">como ele pensa</strong>, antes de ligar."
                </p>
              </div>
            </div>
          </div>

          {/* Bottom anchor */}
          <div className="glass-card p-8 md:p-10 rounded-3xl border border-primary/20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full opacity-[0.05] pointer-events-none blur-3xl bg-accent" />
            <div className="relative z-10">
              <p className="text-lg md:text-xl font-display font-bold text-foreground mb-3">
                Não é IA genérica. Não é teoria.
              </p>
              <p className="text-2xl md:text-3xl font-display font-bold">
                É <span className="text-gradient-gold">inteligência comportamental real</span>
                <br />
                aplicada dos dois lados da mentoria.
              </p>
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
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
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
         7.5. FUNCIONALIDADES EXCLUSIVAS
         ═══════════════════════════════════════ */}
      <Section id="exclusivo">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/20 bg-accent/5 mb-6">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium text-accent tracking-wider uppercase">Funcionalidades Exclusivas</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              O que <span className="text-gradient-gold">mais ninguém</span> tem
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Módulos que existem no {PLATFORM.name} e em nenhuma outra plataforma de mentoria.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: FileSignature, title: 'Playbooks (Propriedade Intelectual)', desc: 'Editor estilo Notion com blocos, tabelas, mídias, checklists e compartilhamento público via link. Proteja e distribua seu conhecimento.', tag: 'Exclusivo' },
              { icon: Video, title: 'CAMPAN — Reuniões com IA', desc: 'Importe reuniões do tl;dv, transcreva e extraia tarefas com IA. Cada reunião vira plano de ação.', tag: 'IA + Automação' },
              { icon: LineChart, title: 'Análise de Call com Documentos', desc: 'Suba transcrições em texto, PDF ou Word. A IA analisa tom, objeções perdidas e dá nota de performance.', tag: 'IA Avançada' },
              { icon: Settings, title: 'Pipeline Customizável por Mentorado', desc: 'Estágios do CRM configuráveis por tenant ou individualmente. Cada aluno pode ter seu pipeline.', tag: 'Personalização' },
              { icon: Activity, title: 'Jornada CS com Múltiplos Fluxos', desc: 'Jornadas simultâneas com etapas, prazos e progresso visual. Atribuição automática por data de entrada.', tag: 'Customer Success' },
              { icon: Trophy, title: 'Certificados Automáticos', desc: 'Ao concluir uma trilha, o mentorado recebe certificado automático. Compartilhável no LinkedIn.', tag: 'Gamificação' },
              { icon: Eye, title: 'Impersonation Mode', desc: 'O mentor vê exatamente o que o mentorado vê — sem pedir print. Auditoria completa.', tag: 'Admin Avançado' },
              { icon: Target, title: 'Análise de Pipeline CRM', desc: 'A IA identifica padrões de sucesso e falha no pipeline do mentorado. Insights automáticos.', tag: 'IA + CRM' },
              { icon: MessageSquare, title: 'Comunidade + Chat Real-Time', desc: 'Feed social com posts, comentários e likes. Chat em tempo real entre mentorados.', tag: 'Engajamento' },
            ].map(({ icon: Icon, title, desc, tag }, i) => (
              <div key={i} className="glass-card-glow p-6 rounded-2xl group hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent font-bold uppercase tracking-wider">{tag}</span>
                </div>
                <h4 className="font-display font-semibold text-foreground text-sm mb-2">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         7.6. SOCIAL PROOF — Números
         ═══════════════════════════════════════ */}
      <Section id="numeros">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Infraestrutura que <span className="text-gradient-gold">entrega resultado</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { value: 15, suffix: '+', label: 'Módulos Integrados' },
              { value: 8, suffix: '', label: 'IAs Contextuais' },
              { value: 100, suffix: '%', label: 'White-Label' },
              { value: 24, suffix: '/7', label: 'Mentor Virtual IA' },
            ].map(({ value, suffix, label }, i) => (
              <div key={i} className="glass-card-glow p-6 rounded-2xl text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-2">
                  <AnimatedCounter value={value} suffix={suffix} />
                </div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, stat: '3x', desc: 'Mais visibilidade sobre a execução dos mentorados vs. planilhas.' },
              { icon: Zap, stat: '80%', desc: 'Redução no tempo operacional do mentor com automações e IA.' },
              { icon: Target, stat: '100%', desc: 'Das ferramentas que um mentor precisa — em uma única plataforma.' },
            ].map(({ icon: Icon, stat, desc }, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-border/30 bg-card/40">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <span className="text-2xl font-display font-bold text-foreground">{stat}</span>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         7.7. COMO FUNCIONA — 3 passos
         ═══════════════════════════════════════ */}
      <Section id="como-funciona">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Implementação</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Como funciona na <span className="text-gradient-gold">prática</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Da decisão ao sistema rodando — em até 15 dias.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Diagnóstico & Arquitetura', desc: 'Mapeamos sua operação, gargalos e objetivos. Desenhamos a arquitetura ideal para o seu modelo.', items: ['Entrevista estratégica', 'Mapeamento de processos', 'Definição de jornadas'] },
              { step: '02', title: 'Implementação & Migração', desc: 'Configuramos CRM, trilhas, automações e branding white-label. Migramos seus dados existentes.', items: ['Setup completo', 'Migração de dados', 'Configuração de IA'] },
              { step: '03', title: 'Treinamento & Go-Live', desc: 'Treinamos você e sua equipe. Mentorados entram já operando com governo desde o primeiro dia.', items: ['Treinamento hands-on', 'Onboarding mentorados', 'Suporte contínuo'] },
            ].map(({ step, title, desc, items }, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 -right-4 w-8">
                    <div className="h-px w-full bg-gradient-to-r from-primary/40 to-transparent" />
                  </div>
                )}
                <div className="glass-card-glow p-8 rounded-2xl h-full">
                  <div className="text-5xl font-display font-bold text-primary/15 mb-4">{step}</div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-3">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{desc}</p>
                  <ul className="space-y-2">
                    {items.map((item, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         7.8. FAQ
         ═══════════════════════════════════════ */}
      <Section id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Perguntas <span className="text-gradient-gold">frequentes</span>
            </h2>
          </div>
          <FAQAccordion />
        </div>
      </Section>

      {/* ═══════════════════════════════════════
         8. PRICING — Infraestrutura, não mensalidade
         ═══════════════════════════════════════ */}
      <Section id="pricing">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Investimento</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Isso não é <span className="text-gradient-gold">mensalidade.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
              É implementação de infraestrutura. A mensalidade é manutenção do governo.
            </p>
            <p className="text-sm text-muted-foreground/70 max-w-xl mx-auto">
              Fração mínima do faturamento. Substituição de múltiplas ferramentas. Previsibilidade e escala.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-start">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={cn(
                  'group relative rounded-2xl overflow-hidden border transition-all duration-500',
                  plan.highlighted
                    ? 'border-primary/40 bg-card/80 shadow-[0_0_40px_hsl(var(--primary)/0.1)] scale-[1.02] z-10'
                    : 'border-border/40 bg-card/40 hover:border-primary/25 hover:bg-card/60'
                )}
              >
                {/* Top accent bar */}
                {plan.highlighted && (
                  <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
                )}

                {/* Badge */}
                {plan.highlighted && (
                  <div className="absolute -top-0 right-4 translate-y-0">
                    <div className="px-3 py-1 rounded-b-lg bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest">
                      Mais escolhido
                    </div>
                  </div>
                )}

                <div className="p-7">
                  {/* Header */}
                  <div className="mb-5">
                    <h3 className="font-display text-xl font-bold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                  </div>

                  {/* Price block */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/30 mb-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Implementação</span>
                    </div>
                    <span className="text-3xl font-display font-bold text-foreground tracking-tight">{plan.price}</span>

                    <div className="my-3 border-t border-border/30" />

                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Mensalidade</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-display font-bold text-foreground">{plan.monthly}</span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{plan.description}</p>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Hover expand — extras */}
                  <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-48 group-hover:opacity-100 transition-all duration-500 ease-out">
                    <div className="pt-4 mb-4 border-t border-border/30 space-y-2.5">
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-2">Incluso neste plano</p>
                      {plan.hoverExtras.map((extra, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-foreground/80">
                          <Star className="w-3.5 h-3.5 text-accent shrink-0" />
                          {extra}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <a href="https://wa.me/5511999999999?text=Olá!%20Quero%20saber%20mais%20sobre%20o%20plano%20" target="_blank" rel="noopener noreferrer">
                    <Button
                      className={cn('w-full h-11', plan.highlighted ? 'btn-premium' : '')}
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Falar com a Equipe
                      </span>
                    </Button>
                  </a>
                  <Link to="/showcase" className="block mt-2">
                    <Button variant="ghost" className="w-full h-9 text-xs text-muted-foreground hover:text-foreground">
                      Ver Demonstração
                    </Button>
                  </Link>

                  {/* Anchor phrase */}
                  <p className="text-[11px] text-muted-foreground/70 text-center mt-4 italic leading-relaxed">
                    "{plan.anchor}"
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom social proof */}
          <div className="mt-10 text-center">
            <p className="text-xs text-muted-foreground/60">
              Implementação inclui configuração completa, migração de dados e treinamento da equipe.
              <br />
              Sem fidelidade. Cancele quando quiser.
            </p>
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
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="https://wa.me/5511999999999?text=Olá!%20Quero%20saber%20mais%20sobre%20o%20MentorFlow.io" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="btn-premium text-lg px-10 h-14">
                    <span className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Falar com a Equipe
                    </span>
                  </Button>
                </a>
                <Link to="/showcase">
                  <Button size="lg" variant="outline" className="text-lg px-8 h-14 border-primary/30 text-foreground hover:bg-primary/5">
                    <span className="flex items-center gap-2">
                      Ver Demonstração <ArrowRight className="w-5 h-5" />
                    </span>
                  </Button>
                </Link>
              </div>
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
