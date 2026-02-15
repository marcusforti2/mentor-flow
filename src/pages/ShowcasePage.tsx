import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { PLATFORM } from '@/lib/platform';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, Target, MessageSquare, BarChart3, Trophy, BookOpen,
  Zap, Shield, Users, ArrowRight, ArrowLeft, Sparkles, TrendingUp,
  Eye, Mic, FileText, Bot, Flame, ChevronDown, Star,
  Crosshair, Send, Swords, FileSignature, LineChart,
  UserCircle, PenTool, GraduationCap, Calendar, AlertTriangle,
  Settings, LayoutDashboard, UserCheck, Bell, ClipboardList,
  Activity, Mail, Video, MonitorPlay, Award, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/* ─── Scroll reveal hook ─── */
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

/* ─── Section wrapper ─── */
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

/* ─── Feature module card ─── */
function ModuleCard({ icon: Icon, title, description, highlights, color, delay = 0 }: {
  icon: React.ElementType;
  title: string;
  description: string;
  highlights?: string[];
  color: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div
      ref={ref}
      className={cn(
        'glass-card p-6 rounded-2xl hover-lift group cursor-default transition-all duration-500 border border-border/30',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{description}</p>
      {highlights && highlights.length > 0 && (
        <ul className="space-y-1.5">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
              <Star className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Stat block ─── */
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

/* ═══════════════════════════════════
   MAIN SHOWCASE PAGE
   ═══════════════════════════════════ */
export default function ShowcasePage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [activeView, setActiveView] = useState<'mentor' | 'mentorado'>('mentor');
  const [selectedTool, setSelectedTool] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ─── MENTOR modules ─── */
  const mentorModules = [
    {
      icon: LayoutDashboard,
      title: 'Dashboard Estratégico',
      description: 'Visão 360° de toda sua operação: mentorados ativos, engajamento, alertas e KPIs de performance em tempo real.',
      highlights: ['KPIs clicáveis com navegação direta', 'Atividades recentes dos mentorados', 'Score IA consolidado da turma'],
      color: 'hsl(160 84% 39%)',
    },
    {
      icon: Users,
      title: 'Gestão de Mentorados',
      description: 'Cadastre, importe via planilha e acompanhe cada mentorado individualmente. Perfil completo com KPIs, Governo do Negócio e timeline de atividades.',
      highlights: ['Perfil 360° com resumo IA', 'Importação em massa via CSV', 'Contato direto via WhatsApp e email'],
      color: 'hsl(220 91% 65%)',
    },
    {
      icon: Target,
      title: 'CRM dos Mentorados',
      description: 'Acompanhe o pipeline de prospecção de cada aluno. Veja quantos leads cada um tem, em que estágio estão e quem precisa de atenção.',
      highlights: ['Visão consolidada de todos os pipelines', 'Ranking por volume e conversão', 'Alertas de mentorados parados'],
      color: 'hsl(45 93% 48%)',
    },
    {
      icon: Brain,
      title: 'Análise Comportamental IA',
      description: 'A IA extrai dados do Instagram e LinkedIn do mentorado e gera um relatório psicológico profundo: medos ocultos, bloqueios de execução, linguagem ideal e estratégia de potencialização.',
      highlights: ['Perfil DISC e Eneagrama automatizado', 'Gatilhos de motivação personalizados', 'Orientação de como conduzir cada aluno'],
      color: 'hsl(270 91% 65%)',
    },
    {
      icon: BookOpen,
      title: 'Trilhas de Conteúdo',
      description: 'Crie trilhas de capacitação com módulos, aulas em vídeo, materiais complementares e certificados automáticos de conclusão.',
      highlights: ['Editor completo de trilhas e aulas', 'Acompanhamento de progresso por aluno', 'Certificados gerados automaticamente'],
      color: 'hsl(190 95% 45%)',
    },
    {
      icon: Trophy,
      title: 'Gamificação & Ranking',
      description: 'Sistema de pontos, badges, streaks e ranking competitivo. Você configura as regras, a plataforma engaja seus alunos automaticamente.',
      highlights: ['Ranking em tempo real entre mentorados', 'Badges personalizáveis', 'Loja de prêmios configurável'],
      color: 'hsl(45 100% 51%)',
    },
    {
      icon: BarChart3,
      title: 'Relatórios & Analytics',
      description: 'Score de performance ponderado (0-100) por mentorado, evolução temporal, distribuição por faixas de engajamento e métricas de conversão.',
      highlights: ['Fórmula: Leads 30% + Tarefas 20% + Trilhas 20% + Atividades 20% + Streak 10%', 'Gráficos de evolução e comparativos', 'Exportação de dados'],
      color: 'hsl(160 84% 39%)',
    },
    {
      icon: AlertTriangle,
      title: 'Centro SOS + Alertas',
      description: 'Receba alertas inteligentes quando mentorados estão travados, inativos ou precisam de atenção. Sistema de SOS com triagem IA e notificação em tempo real.',
      highlights: ['Triagem automática por gravidade', 'Notificação instantânea para o mentor', 'Histórico de ocorrências por aluno'],
      color: 'hsl(0 84% 55%)',
    },
    {
      icon: Calendar,
      title: 'Agendamento Integrado',
      description: 'Configure sua disponibilidade e permita que mentorados agendem sessões diretamente. Calendário completo com eventos e reuniões.',
      highlights: ['Disponibilidade configurável por dia/horário', 'Booking automático pelo mentorado', 'Integração com link de reunião'],
      color: 'hsl(220 91% 55%)',
    },
    {
      icon: Video,
      title: 'Reuniões & Transcrições',
      description: 'Registre reuniões, importe transcrições e extraia tarefas automaticamente com IA. Histórico completo de cada sessão com cada mentorado.',
      highlights: ['Extração automática de tarefas por IA', 'Kanban de tarefas por mentorado', 'Player de vídeo integrado'],
      color: 'hsl(270 91% 55%)',
    },
    {
      icon: Mail,
      title: 'Email Marketing',
      description: 'Crie templates, monte fluxos automatizados e dispare campanhas segmentadas para seus mentorados ou leads.',
      highlights: ['Editor visual de fluxos', 'Templates personalizáveis', 'Automações por gatilho'],
      color: 'hsl(190 95% 45%)',
    },
    {
      icon: Settings,
      title: 'Branding Personalizado',
      description: 'Sua mentoria com a sua cara: logo, cores, fontes e domínio personalizado. O mentorado vê a SUA marca, não a nossa.',
      highlights: ['IA Branding Engine (análise visual)', 'Cores e fontes customizáveis', 'Landing page exclusiva do mentor'],
      color: 'hsl(45 93% 48%)',
    },
  ];

  /* ─── MENTORADO modules ─── */
  const mentoradoModules = [
    {
      icon: LayoutDashboard,
      title: 'Dashboard do Mentorado',
      description: 'O aluno vê seus KPIs pessoais: leads no CRM, trilhas em andamento, pontos acumulados, streak e próximos eventos — tudo em um único lugar.',
      highlights: ['Visão consolidada do progresso pessoal', 'Cards clicáveis para cada módulo', 'Nota IA de performance'],
      color: 'hsl(160 84% 39%)',
    },
    {
      icon: Target,
      title: 'CRM Pessoal de Vendas',
      description: 'Pipeline Kanban completo para o mentorado gerenciar seus próprios leads. Arraste entre fases, registre interações e veja scores de qualificação IA.',
      highlights: ['Vision IA: print do perfil → lead qualificado', 'Score e temperatura automáticos', 'Abordagem sugerida pela IA'],
      color: 'hsl(45 93% 48%)',
    },
    {
      icon: Brain,
      title: 'Arsenal IA (8 Ferramentas)',
      description: 'O mentorado tem acesso a 8 IAs treinadas no negócio dele: qualificador, cold messages, simulador de objeções, propostas, bio, conteúdo, análise de conversão e mentor virtual.',
      highlights: ['Qualificador de Leads com score IA', 'Cold Messages para WhatsApp, LinkedIn, Email', 'Simulador de objeções em cenários reais', 'Mentor Virtual 24/7 contextualizado'],
      color: 'hsl(270 91% 65%)',
    },
    {
      icon: BookOpen,
      title: 'Trilhas de Capacitação',
      description: 'Acesso às trilhas criadas pelo mentor: vídeos, materiais e aulas organizadas por módulos com progresso visual e certificados de conclusão.',
      highlights: ['Player de vídeo integrado', 'Barra de progresso por trilha', 'Certificados ao concluir'],
      color: 'hsl(190 95% 45%)',
    },
    {
      icon: Trophy,
      title: 'Gamificação & Ranking',
      description: 'Pontos por cada ação (lead cadastrado, aula concluída, tarefa feita), badges de conquista, ofensivas diárias e posição no ranking geral.',
      highlights: ['Ranking competitivo entre colegas', 'Streaks e metas diárias', 'Loja de prêmios do mentor'],
      color: 'hsl(45 100% 51%)',
    },
    {
      icon: ClipboardList,
      title: 'Minhas Tarefas',
      description: 'Tarefas atribuídas pelo mentor (ou extraídas automaticamente de reuniões) em formato Kanban. O aluno organiza, prioriza e executa.',
      highlights: ['Kanban com drag & drop', 'Prioridade e prazo por tarefa', 'Tarefas extraídas de reuniões por IA'],
      color: 'hsl(220 91% 65%)',
    },
    {
      icon: MessageSquare,
      title: 'Comunidade',
      description: 'Espaço de troca entre mentorados: compartilhe vitórias, tire dúvidas, interaja com o grupo e fortaleça o networking.',
      highlights: ['Feed de posts com likes e comentários', 'Chat em tempo real', 'Tags e filtros por tema'],
      color: 'hsl(220 91% 55%)',
    },
    {
      icon: Calendar,
      title: 'Agendamento',
      description: 'Veja a disponibilidade do mentor e agende sessões diretamente pela plataforma. Calendário pessoal com todos os eventos.',
      highlights: ['Booking direto com o mentor', 'Calendário de eventos e reuniões', 'Confirmação automática'],
      color: 'hsl(160 84% 45%)',
    },
    {
      icon: AlertTriangle,
      title: 'Centro SOS',
      description: 'Precisa de ajuda urgente? O mentorado abre um chamado SOS e a IA faz triagem antes de notificar o mentor. Respostas rápidas para momentos críticos.',
      highlights: ['Triagem IA antes do envio', 'Categorização automática', 'Histórico de chamados'],
      color: 'hsl(0 84% 55%)',
    },
    {
      icon: FileText,
      title: 'Meus Arquivos',
      description: 'Central de materiais compartilhados pelo mentor: apresentações, scripts, planilhas, e-books e tudo que o aluno precisa para performar.',
      highlights: ['Organização por categoria', 'Download direto', 'Materiais exclusivos do mentor'],
      color: 'hsl(270 91% 55%)',
    },
    {
      icon: UserCircle,
      title: 'Perfil & Governo do Negócio',
      description: 'O aluno preenche seu contexto de negócio: faturamento, gargalos, público-alvo e pitch. Essas informações alimentam todas as IAs e análises da plataforma.',
      highlights: ['Diagnóstico de maturidade empresarial', 'Contexto de Pitch para IAs', 'Perfil comportamental integrado'],
      color: 'hsl(45 93% 48%)',
    },
    {
      icon: Award,
      title: 'Certificados',
      description: 'Ao concluir trilhas, o mentorado recebe certificados profissionais gerados automaticamente para fortalecer sua autoridade no mercado.',
      highlights: ['Geração automática em PDF', 'Galeria de certificados conquistados', 'Compartilhável nas redes sociais'],
      color: 'hsl(160 84% 39%)',
    },
  ];

  const currentModules = activeView === 'mentor' ? mentorModules : mentoradoModules;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden theme-light">
      <div className="animated-gradient-bg" />

      {/* ── Nav ── */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-12',
          scrollY > 50
            ? 'py-3 bg-background/80 backdrop-blur-xl border-b border-border/50'
            : 'py-6 bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/60 hover:bg-muted border border-border/50 transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <BrandLogo variant="full" size="sm" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#visao" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Visão Geral</a>
            <a href="#modulos" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Módulos</a>
            <a href="#arsenal" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Arsenal IA</a>
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
         HERO
         ═══════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 md:px-12 pt-24 pb-12 overflow-hidden">
        <div
          className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.07] pointer-events-none blur-3xl"
          style={{ background: 'hsl(45 100% 51%)' }}
        />
        <div
          className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-[0.05] pointer-events-none blur-3xl"
          style={{ background: 'hsl(160 84% 45%)' }}
        />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary tracking-wider uppercase">
              Demonstração Completa da Plataforma
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
            Veja tudo que você e{' '}
            <span className="text-gradient-gold">seus mentorados</span>
            <br />
            terão acesso.
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            A plataforma opera em duas frentes: o <strong className="text-foreground">Painel do Mentor</strong> para você gerenciar,
            analisar e escalar sua operação — e o <strong className="text-foreground">Painel do Mentorado</strong> para
            seu aluno prospectar, aprender e performar com as ferramentas que você disponibiliza.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              onClick={() => navigate('/auth?mode=signup')}
              className="btn-premium px-8 h-14 text-base font-bold"
              size="lg"
            >
              <span className="flex items-center gap-2">
                Quero Para Minha Mentoria <ArrowRight className="w-5 h-5" />
              </span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 h-14 text-base border-primary/30 text-foreground hover:bg-primary/5"
              onClick={() => document.getElementById('modulos')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Ver Todos os Módulos
            </Button>
          </div>

          <div className="animate-bounce">
            <ChevronDown className="w-6 h-6 text-muted-foreground mx-auto" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════
         STATS
         ═══════════════════════ */}
      <Section id="visao" className="py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-8 md:p-12 rounded-3xl border border-border/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatBlock value="12+" label="Módulos para o Mentor" delay={0} />
              <StatBlock value="12+" label="Módulos para o Mentorado" delay={100} />
              <StatBlock value="8" label="IAs Integradas" delay={200} />
              <StatBlock value="100%" label="White-Label" delay={300} />
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         HOW IT WORKS - Dual view explanation
         ═══════════════════════ */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Uma plataforma, <span className="text-gradient-gold">duas experiências</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Você configura e gerencia tudo pelo Painel do Mentor. Seu mentorado acessa um ambiente completo
              e personalizado com a SUA marca, pronto para prospectar e performar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Mentor side */}
            <div className="glass-card-glow p-8 rounded-2xl border border-primary/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Painel do Mentor</h3>
                  <p className="text-xs text-muted-foreground">Você no controle total</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Dashboard com KPIs de toda a operação',
                  'Gestão individual de cada mentorado',
                  'Análise comportamental IA do aluno',
                  'Trilhas, gamificação e tarefas configuráveis',
                  'Relatórios de performance e ranking',
                  'Alertas inteligentes + Centro SOS',
                  'Email marketing e automações',
                  'Branding 100% personalizado',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mentorado side */}
            <div className="glass-card p-8 rounded-2xl border border-accent/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Painel do Mentorado</h3>
                  <p className="text-xs text-muted-foreground">Seu aluno com arsenal completo</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Dashboard pessoal com progresso e metas',
                  'CRM pessoal com pipeline de vendas',
                  '8 ferramentas IA treinadas no negócio',
                  'Trilhas de conteúdo com certificados',
                  'Gamificação, ranking e badges',
                  'Comunidade e networking entre alunos',
                  'Agendamento direto com o mentor',
                  'Centro SOS para urgências',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Star className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         MODULES - Toggle Mentor / Mentorado
         ═══════════════════════ */}
      <Section id="modulos">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <MonitorPlay className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Módulos Detalhados</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Explore cada módulo em <span className="text-gradient-gold">detalhe</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Alterne entre a visão do Mentor e do Mentorado para entender exatamente
              o que cada um terá acesso na plataforma.
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/80 border border-border/50">
              <button
                onClick={() => setActiveView('mentor')}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300',
                  activeView === 'mentor'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Shield className="w-4 h-4" />
                Visão do Mentor
              </button>
              <button
                onClick={() => setActiveView('mentorado')}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300',
                  activeView === 'mentorado'
                    ? 'bg-accent text-accent-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Zap className="w-4 h-4" />
                Visão do Mentorado
              </button>
            </div>
          </div>

          {/* Module description banner */}
          <div className={cn(
            'mb-10 p-6 rounded-2xl border text-center transition-all duration-300',
            activeView === 'mentor'
              ? 'bg-primary/5 border-primary/20'
              : 'bg-accent/5 border-accent/20'
          )}>
            {activeView === 'mentor' ? (
              <p className="text-sm text-foreground max-w-3xl mx-auto">
                <strong>Mentor:</strong> Aqui está tudo que VOCÊ terá acesso para gerenciar sua mentoria.
                Desde o dashboard com visão 360° dos seus alunos até análise comportamental IA, relatórios,
                gamificação e branding personalizado. Você controla cada aspecto da experiência.
              </p>
            ) : (
              <p className="text-sm text-foreground max-w-3xl mx-auto">
                <strong>Mentorado:</strong> Aqui está tudo que SEU ALUNO terá acesso na plataforma que leva a SUA marca.
                Um arsenal completo para ele prospectar, aprender e performar — tudo configurado e gerenciado por você.
              </p>
            )}
          </div>

          {/* Modules grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentModules.map((module, i) => (
              <ModuleCard key={`${activeView}-${i}`} {...module} delay={i * 60} />
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         ARSENAL IA HIGHLIGHT
         ═══════════════════════ */}
      <Section id="arsenal" className="relative">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] pointer-events-none blur-3xl"
          style={{ background: 'hsl(45 100% 51%)' }}
        />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Arsenal de Vendas IA</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="text-gradient-gold">8 IAs</span> trabalhando pelos seus mentorados
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Cada IA é treinada com o contexto do negócio do mentorado: produto, público-alvo, pitch e histórico.
              <strong className="text-foreground"> Você disponibiliza, eles performam.</strong> Tudo registrado para você acompanhar.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Crosshair,
                name: 'Qualificador de Leads',
                description: 'Analisa perfis com IA, gera score de 0-100, temperatura (quente/morno/frio) e estratégia de abordagem personalizada.',
                expanded: {
                  subtitle: 'Transforme perfis sociais em oportunidades qualificadas',
                  details: 'A IA faz scraping automatizado de perfis do Instagram e LinkedIn, extrai dados relevantes e cruza com o Contexto de Pitch do mentorado para gerar uma análise completa.',
                  features: [
                    'Score de qualificação de 0 a 100 com justificativa IA',
                    'Temperatura do lead: quente, morno ou frio',
                    'Estratégia de abordagem personalizada para cada perfil',
                    'Detecção de dores e oportunidades no perfil do lead',
                    'Script sugerido para primeiro contato',
                    'Integração automática com o CRM pessoal',
                  ],
                  impact: 'O mentorado para de perder tempo com leads frios e foca em quem tem maior probabilidade de fechar.',
                },
              },
              {
                icon: Send,
                name: 'Cold Messages',
                description: 'Mensagens para WhatsApp, Instagram, LinkedIn e Email com tom adaptado ao perfil DISC do lead.',
                expanded: {
                  subtitle: 'Mensagens que abrem portas — em qualquer canal',
                  details: 'Gera mensagens de prospecção adaptadas ao perfil comportamental do lead (DISC) e ao canal de comunicação escolhido, respeitando o tom e a linguagem ideal.',
                  features: [
                    'Mensagens para WhatsApp, Instagram DM, LinkedIn e Email',
                    'Tom adaptado ao perfil DISC do lead',
                    'Variações A/B para testar abordagens',
                    'Sequências de follow-up sugeridas',
                    'Personalização com dados do negócio do mentorado',
                    'Copy persuasiva com gatilhos mentais calibrados',
                  ],
                  impact: 'Taxa de resposta significativamente maior porque cada mensagem é cirurgicamente adaptada ao receptor.',
                },
              },
              {
                icon: Swords,
                name: 'Simulador de Objeções',
                description: 'Role-play com IA em 9 fases de negociação High Ticket. Cenários realistas e desafiadores.',
                expanded: {
                  subtitle: 'Treine para fechar antes de entrar na call',
                  details: 'O mentorado pratica negociação em cenários realistas simulados pela IA, passando por 9 fases específicas de negociação High Ticket com objeções calibradas.',
                  features: [
                    '9 fases: Diagnóstico, Ancoragem, Resgate de Leads Frios e mais',
                    'Objeções realistas baseadas no nicho do mentorado',
                    'Feedback em tempo real sobre cada resposta',
                    'Score de performance por sessão',
                    'Sugestão de rebate para objeções perdidas',
                    'Cenários progressivos de dificuldade',
                  ],
                  impact: 'Mentorados que treinam com o simulador entram em calls reais com mais confiança e repertório de respostas.',
                },
              },
              {
                icon: FileSignature,
                name: 'Gerador de Propostas',
                description: 'Propostas comerciais com ancoragem de valor, personalizadas para cada lead e contexto.',
                expanded: {
                  subtitle: 'Propostas profissionais em segundos',
                  details: 'Cria propostas comerciais completas com ancoragem de valor, usando o contexto do negócio e os dados do lead para personalizar cada detalhe.',
                  features: [
                    'Estrutura profissional com ancoragem de preço',
                    'Personalização automática com dados do lead',
                    'Seção de benefícios e entregáveis detalhados',
                    'Gatilhos de urgência e escassez integrados',
                    'Formato pronto para envio por email ou PDF',
                    'Variações de tom: formal, consultivo, direto',
                  ],
                  impact: 'Propostas que comunicam valor e profissionalismo, elevando a percepção da oferta do mentorado.',
                },
              },
              {
                icon: LineChart,
                name: 'Análise de Conversão',
                description: 'Envie transcrições de reuniões e receba nota IA, pontos fortes, objeções perdidas e melhorias.',
                expanded: {
                  subtitle: 'Diagnóstico IA de cada call de vendas',
                  details: 'O mentorado envia a transcrição de uma reunião de vendas e a IA analisa toda a performance: técnica, argumentação, objeções tratadas e oportunidades perdidas.',
                  features: [
                    'Nota de performance de 0 a 100',
                    'Pontos fortes identificados na argumentação',
                    'Objeções perdidas que poderiam ser contornadas',
                    'Sugestões concretas de melhoria',
                    'Análise de linguagem corporal e tom (quando disponível)',
                    'Comparativo de evolução entre calls',
                  ],
                  impact: 'Cada call se torna uma oportunidade de aprendizado. O mentorado evolui call a call com feedback objetivo.',
                },
              },
              {
                icon: UserCircle,
                name: 'Gerador de Bio',
                description: 'Bio otimizada para Instagram, LinkedIn e WhatsApp que comunica autoridade.',
                expanded: {
                  subtitle: 'Primeira impressão que converte',
                  details: 'Gera bios otimizadas para cada rede social, comunicando autoridade, proposta de valor e chamada para ação — tudo alinhado ao posicionamento do negócio.',
                  features: [
                    'Bios otimizadas para Instagram, LinkedIn e WhatsApp',
                    'Comunicação de autoridade e proposta de valor',
                    'Chamadas para ação estratégicas',
                    'Variações de tom e estilo',
                    'Palavras-chave para descoberta orgânica',
                    'Emojis estratégicos para cada plataforma',
                  ],
                  impact: 'Perfis profissionais que geram credibilidade antes mesmo do primeiro contato.',
                },
              },
              {
                icon: PenTool,
                name: 'Gerador de Conteúdo',
                description: 'Posts, carrosséis e stories baseados na oferta, público e tom de comunicação do aluno.',
                expanded: {
                  subtitle: 'Conteúdo estratégico sem bloquei criativo',
                  details: 'Cria conteúdos para redes sociais alinhados com a oferta, público-alvo e estilo de comunicação do mentorado — de posts simples a carrosséis educativos.',
                  features: [
                    'Posts, carrosséis, reels e stories',
                    'Calendário editorial sugerido',
                    'Tom adaptado ao posicionamento do negócio',
                    'Ganchos de engajamento e CTAs',
                    'Conteúdo educativo, prova social e bastidores',
                    'Hashtags e legendas otimizadas',
                  ],
                  impact: 'Mentorados que postam consistentemente atraem leads orgânicos qualificados para o pipeline.',
                },
              },
              {
                icon: Bot,
                name: 'Mentor Virtual 24/7',
                description: 'O aluno tira dúvidas a qualquer hora. A IA conhece o negócio e dá respostas práticas.',
                expanded: {
                  subtitle: 'Um mentor que nunca dorme',
                  details: 'Chat contextual com IA que conhece todo o histórico do mentorado: perfil do negócio, progresso nas trilhas, leads no CRM, tarefas e perfil comportamental.',
                  features: [
                    'Respostas contextualizadas com dados reais do aluno',
                    'Acesso ao histórico de negócio, trilhas e CRM',
                    'Orientação prática para situações do dia a dia',
                    'Histórico de conversas salvo e pesquisável',
                    'Suporte com Markdown e formatação rica',
                    'Disponível 24/7 sem fila de espera',
                  ],
                  impact: 'O mentorado nunca fica travado. Sempre tem uma orientação disponível — complementando o acompanhamento do mentor real.',
                },
              },
            ].map((tool, i) => (
              <div
                key={tool.name}
                className="relative group p-5 rounded-2xl border border-border/50 transition-all duration-300 bg-card/40 hover:bg-card/80 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(45_100%_51%/0.08)] cursor-pointer"
                onClick={() => setSelectedTool(i)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <tool.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-foreground text-sm mb-1">{tool.name}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                    Ver mais <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Tool Detail Modal */}
          {(() => {
            const tools = [
              { icon: Crosshair, name: 'Qualificador de Leads', color: 'hsl(45 93% 48%)', expanded: { subtitle: 'Transforme perfis sociais em oportunidades qualificadas', details: 'A IA faz scraping automatizado de perfis do Instagram e LinkedIn, extrai dados relevantes e cruza com o Contexto de Pitch do mentorado para gerar uma análise completa.', features: ['Score de qualificação de 0 a 100 com justificativa IA', 'Temperatura do lead: quente, morno ou frio', 'Estratégia de abordagem personalizada para cada perfil', 'Detecção de dores e oportunidades no perfil do lead', 'Script sugerido para primeiro contato', 'Integração automática com o CRM pessoal'], impact: 'O mentorado para de perder tempo com leads frios e foca em quem tem maior probabilidade de fechar.' } },
              { icon: Send, name: 'Cold Messages', color: 'hsl(220 91% 65%)', expanded: { subtitle: 'Mensagens que abrem portas — em qualquer canal', details: 'Gera mensagens de prospecção adaptadas ao perfil comportamental do lead (DISC) e ao canal de comunicação escolhido.', features: ['Mensagens para WhatsApp, Instagram DM, LinkedIn e Email', 'Tom adaptado ao perfil DISC do lead', 'Variações A/B para testar abordagens', 'Sequências de follow-up sugeridas', 'Personalização com dados do negócio do mentorado', 'Copy persuasiva com gatilhos mentais calibrados'], impact: 'Taxa de resposta significativamente maior porque cada mensagem é cirurgicamente adaptada ao receptor.' } },
              { icon: Swords, name: 'Simulador de Objeções', color: 'hsl(0 84% 55%)', expanded: { subtitle: 'Treine para fechar antes de entrar na call', details: 'O mentorado pratica negociação em cenários realistas simulados pela IA, passando por 9 fases específicas de negociação High Ticket.', features: ['9 fases: Diagnóstico, Ancoragem, Resgate de Leads Frios e mais', 'Objeções realistas baseadas no nicho do mentorado', 'Feedback em tempo real sobre cada resposta', 'Score de performance por sessão', 'Sugestão de rebate para objeções perdidas', 'Cenários progressivos de dificuldade'], impact: 'Mentorados que treinam com o simulador entram em calls reais com mais confiança e repertório.' } },
              { icon: FileSignature, name: 'Gerador de Propostas', color: 'hsl(270 91% 65%)', expanded: { subtitle: 'Propostas profissionais em segundos', details: 'Cria propostas comerciais completas com ancoragem de valor, personalizadas para cada lead e contexto de negócio.', features: ['Estrutura profissional com ancoragem de preço', 'Personalização automática com dados do lead', 'Seção de benefícios e entregáveis detalhados', 'Gatilhos de urgência e escassez integrados', 'Formato pronto para envio por email ou PDF', 'Variações de tom: formal, consultivo, direto'], impact: 'Propostas que comunicam valor e profissionalismo, elevando a percepção da oferta.' } },
              { icon: LineChart, name: 'Análise de Conversão', color: 'hsl(160 84% 39%)', expanded: { subtitle: 'Diagnóstico IA de cada call de vendas', details: 'O mentorado envia a transcrição e a IA analisa performance, argumentação, objeções tratadas e oportunidades perdidas.', features: ['Nota de performance de 0 a 100', 'Pontos fortes identificados na argumentação', 'Objeções perdidas que poderiam ser contornadas', 'Sugestões concretas de melhoria', 'Análise de linguagem e tom da conversa', 'Comparativo de evolução entre calls'], impact: 'Cada call se torna uma oportunidade de aprendizado com feedback objetivo.' } },
              { icon: UserCircle, name: 'Gerador de Bio', color: 'hsl(190 95% 45%)', expanded: { subtitle: 'Primeira impressão que converte', details: 'Gera bios otimizadas para cada rede social, comunicando autoridade e proposta de valor.', features: ['Bios otimizadas para Instagram, LinkedIn e WhatsApp', 'Comunicação de autoridade e proposta de valor', 'Chamadas para ação estratégicas', 'Variações de tom e estilo', 'Palavras-chave para descoberta orgânica', 'Emojis estratégicos para cada plataforma'], impact: 'Perfis profissionais que geram credibilidade antes mesmo do primeiro contato.' } },
              { icon: PenTool, name: 'Gerador de Conteúdo', color: 'hsl(45 100% 51%)', expanded: { subtitle: 'Conteúdo estratégico sem bloqueio criativo', details: 'Cria conteúdos para redes sociais alinhados com a oferta, público-alvo e estilo do mentorado.', features: ['Posts, carrosséis, reels e stories', 'Calendário editorial sugerido', 'Tom adaptado ao posicionamento do negócio', 'Ganchos de engajamento e CTAs', 'Conteúdo educativo, prova social e bastidores', 'Hashtags e legendas otimizadas'], impact: 'Mentorados que postam consistentemente atraem leads orgânicos qualificados.' } },
              { icon: Bot, name: 'Mentor Virtual 24/7', color: 'hsl(270 91% 55%)', expanded: { subtitle: 'Um mentor que nunca dorme', details: 'Chat contextual com IA que conhece todo o histórico do mentorado: perfil, progresso, leads, tarefas e comportamento.', features: ['Respostas contextualizadas com dados reais do aluno', 'Acesso ao histórico de negócio, trilhas e CRM', 'Orientação prática para situações do dia a dia', 'Histórico de conversas salvo e pesquisável', 'Suporte com Markdown e formatação rica', 'Disponível 24/7 sem fila de espera'], impact: 'O mentorado nunca fica travado. Sempre tem orientação disponível — complementando o mentor real.' } },
            ];
            const tool = selectedTool !== null ? tools[selectedTool] : null;
            return (
              <Dialog open={selectedTool !== null} onOpenChange={(open) => !open && setSelectedTool(null)}>
                {tool && (
                  <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <div className="flex items-center gap-3 mb-1">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center"
                          style={{ background: `${tool.color}15` }}
                        >
                          <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
                        </div>
                        <div>
                          <DialogTitle className="font-display text-lg">{tool.name}</DialogTitle>
                          <p className="text-xs text-muted-foreground">{tool.expanded.subtitle}</p>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="space-y-5 pt-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">{tool.expanded.details}</p>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" /> O que faz
                        </h4>
                        <ul className="space-y-2">
                          {tool.expanded.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
                              <Star className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
                        <p className="text-sm text-foreground">
                          <strong className="text-primary">Impacto:</strong> {tool.expanded.impact}
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            );
          })()}

          <div className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/15 text-center">
            <p className="text-sm text-foreground">
              <Activity className="w-4 h-4 inline-block mr-1 text-primary" />
              <strong>Para o Mentor:</strong> Toda utilização de IA é registrada em telemetria. Você sabe exatamente
              quais ferramentas cada mentorado está usando, com que frequência e para quais leads.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         SECURITY / WHITE LABEL
         ═══════════════════════ */}
      <Section>
        <div className="max-w-5xl mx-auto">
          <div className="glass-card-glow p-10 md:p-14 rounded-3xl text-center relative overflow-hidden">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.06] pointer-events-none blur-3xl"
              style={{ background: 'hsl(160 84% 45%)' }}
            />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Lock className="w-4 h-4" />
                White-Label Completo
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Sua <span className="text-gradient-gold">marca</span>, sua plataforma
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                O mentorado nunca vê o nome da nossa tecnologia. Ele acessa uma plataforma com a
                <strong className="text-foreground"> sua logo, suas cores, sua fonte e sua landing page</strong>.
                Para ele, é 100% seu.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {[
                  { icon: Eye, label: 'Logo personalizada' },
                  { icon: Sparkles, label: 'Cores e fontes' },
                  { icon: MonitorPlay, label: 'Landing exclusiva' },
                  { icon: Brain, label: 'IA Branding Engine' },
                ].map(({ icon: Ic, label }, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30">
                    <Ic className="w-5 h-5 text-primary" />
                    <span className="text-xs text-foreground font-medium text-center">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════
         FINAL CTA
         ═══════════════════════ */}
      <Section className="pb-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card-glow p-12 md:p-16 rounded-3xl relative overflow-hidden">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.08] pointer-events-none blur-3xl"
              style={{ background: 'hsl(45 100% 51%)' }}
            />
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Pronto para ter tudo isso na{' '}
                <span className="text-gradient-gold">sua mentoria?</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
                A mesma tecnologia usada por mentores de alta performance.
                Implemente na sua operação e transforme a experiência dos seus mentorados.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={() => navigate('/auth?mode=signup')}
                  className="btn-premium px-10 h-14 text-base font-bold"
                  size="lg"
                >
                  <span className="flex items-center gap-2">
                    Quero Para Minha Mentoria <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 h-14 text-base border-primary/30 text-foreground hover:bg-primary/5"
                  onClick={() => navigate('/#pricing')}
                >
                  Ver Planos e Preços
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
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
