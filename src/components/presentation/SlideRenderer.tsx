import { 
  Brain, MessageSquare, Swords, FileText, BarChart3, User, PenTool, Bot,
  Target, Kanban, Play, Users, AlertTriangle, FolderOpen, Gift, Shield,
  Mail, Route, TrendingUp, Calendar, Lock, CheckCircle2, ArrowRight,
  Zap, Eye, Gauge, Trophy, Star, Sparkles
} from 'lucide-react';
import { LBVLogo } from '@/components/LBVLogo';

interface SlideRendererProps {
  slideIndex: number;
}

export function SlideRenderer({ slideIndex }: SlideRendererProps) {
  switch (slideIndex) {
    case 0: return <SlideCapa />;
    case 1: return <SlideVisaoGeral />;
    case 2: return <SlideAlunoDashboardIA />;
    case 3: return <SlideAlunoCRMTrilhas />;
    case 4: return <SlideMentorDashboard />;
    case 5: return <SlideMentorAutomacao />;
    case 6: return <SlideDiferenciais />;
    case 7: return <SlideJornadaValor />;
    default: return null;
  }
}

// ─── Shared Primitives ───

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

function GoldBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: 'hsl(45 100% 51% / 0.15)', color: 'hsl(45 100% 51%)', border: '1px solid hsl(45 100% 51% / 0.3)' }}>
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight" style={{ color: 'hsl(45 100% 51%)' }}>
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-3xl">{children}</p>;
}

// ─── SLIDE 0: CAPA ───

function SlideCapa() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-8 px-4">
      <div className="relative">
        <div className="absolute inset-0 blur-3xl opacity-30 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(45 100% 51%) 0%, transparent 70%)' }} />
        <LBVLogo variant="full" size="xl" />
      </div>
      
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white leading-tight">
          Sistema Operacional de Governo
          <br />
          <span style={{ color: 'hsl(45 100% 51%)' }}>para Mentorias High Ticket</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl">
          Plataforma completa para mentores e mentorados de alto valor
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {['IA Integrada', 'CRM Vision AI', 'Gamificação', 'Multi-tenant'].map(tag => (
          <GoldBadge key={tag}>{tag}</GoldBadge>
        ))}
      </div>

      <p className="text-slate-500 text-xs mt-8 animate-pulse">
        Use as setas ← → para navegar • ESC para sair do fullscreen
      </p>
    </div>
  );
}

// ─── SLIDE 1: VISÃO GERAL ───

function SlideVisaoGeral() {
  const pilares = [
    { icon: TrendingUp, title: 'Previsibilidade', desc: 'Pipeline de vendas organizado com IA qualificando leads em tempo real' },
    { icon: Eye, title: 'Visibilidade Total', desc: 'Dashboard unificado com KPIs de todos os mentorados e seus pipelines' },
    { icon: Brain, title: 'IA Aplicada', desc: '8 ferramentas de IA integradas ao contexto real do negócio do aluno' },
    { icon: Trophy, title: 'Gamificação', desc: 'Pontos, badges, streaks e loja de prêmios que transformam rotina em jogo' },
  ];

  return (
    <div className="flex flex-col h-full gap-6 px-2">
      <div className="space-y-2">
        <SectionTitle>O que é a Plataforma LBV?</SectionTitle>
        <SubTitle>
          Um sistema operacional completo para mentorias high ticket, projetado para profissionais de saúde 
          com tickets de alto valor. Integra gestão de alunos, inteligência artificial, CRM e gamificação.
        </SubTitle>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {pilares.map((p, i) => (
          <GlassCard key={i} className="flex gap-4 items-start hover:border-amber-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(45 100% 51% / 0.1)' }}>
              <p.icon className="w-6 h-6" style={{ color: 'hsl(45 100% 51%)' }} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white text-lg">{p.title}</h3>
              <p className="text-slate-400 text-sm mt-1">{p.desc}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="border-amber-500/20">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 shrink-0" style={{ color: 'hsl(45 100% 51%)' }} />
          <p className="text-slate-300 text-sm">
            <strong className="text-white">Nicho:</strong> Educação High Ticket para profissionais de saúde (médicos, dentistas) com tickets de alto valor (ex: R$ 120.000,00)
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── SLIDE 2: ALUNO - DASHBOARD + ARSENAL IA ───

function SlideAlunoDashboardIA() {
  const tools = [
    { icon: Target, name: 'Qualificador', desc: 'Score DISC 0-100' },
    { icon: MessageSquare, name: 'Comunicação', desc: 'Scripts multi-canal' },
    { icon: Swords, name: 'Simulador', desc: 'Role-Play de objeções' },
    { icon: FileText, name: 'Propostas', desc: 'Gerador automático' },
    { icon: BarChart3, name: 'Análise', desc: 'Calls e conversão' },
    { icon: User, name: 'Bio', desc: 'Otimização de perfil' },
    { icon: PenTool, name: 'Conteúdo', desc: 'Posts estratégicos' },
    { icon: Bot, name: 'Mentor 24/7', desc: 'Chat inteligente' },
  ];

  return (
    <div className="flex flex-col h-full gap-5 px-2">
      <div className="space-y-2">
        <GoldBadge>Área do Aluno</GoldBadge>
        <SectionTitle>Dashboard & Arsenal de Vendas IA</SectionTitle>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Mini-mockup: Dashboard Bento */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Gauge className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            Dashboard Personalizado
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Prospeccoes', val: '47', color: 'bg-emerald-500/20 text-emerald-400' },
              { label: 'Pontos', val: '1.250', color: 'bg-amber-500/20 text-amber-400' },
              { label: 'Ranking', val: '#3', color: 'bg-blue-500/20 text-blue-400' },
            ].map((m, i) => (
              <div key={i} className={`rounded-lg p-2 text-center ${m.color}`}>
                <div className="text-lg font-bold">{m.val}</div>
                <div className="text-[10px] opacity-80">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-700/30 p-2 text-xs text-slate-400 space-y-1">
              <div className="text-[10px] text-slate-500">Trilha Ativa</div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: '72%' }} />
              </div>
              <div className="text-emerald-400">72% concluído</div>
            </div>
            <div className="rounded-lg bg-slate-700/30 p-2 text-xs text-slate-400 space-y-1">
              <div className="text-[10px] text-slate-500">Streak</div>
              <div className="text-amber-400 text-lg font-bold">🔥 12 dias</div>
            </div>
          </div>
          <p className="text-slate-500 text-[10px] mt-1">Bento Grid com progresso em tempo real, ranking, badges e meta diária</p>
        </GlassCard>

        {/* Arsenal de IA */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Brain className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            Arsenal de Vendas — 8 Ferramentas IA
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {tools.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-700/30 p-2 hover:bg-slate-700/50 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'hsl(45 100% 51% / 0.1)' }}>
                  <t.icon className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-white text-xs font-medium truncate">{t.name}</div>
                  <div className="text-slate-500 text-[10px] truncate">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-[10px]">Todas alimentadas pelo Contexto de Pitch do negócio do aluno</p>
        </GlassCard>
      </div>
    </div>
  );
}

// ─── SLIDE 3: ALUNO - CRM, TRILHAS, COMUNIDADE ───

function SlideAlunoCRMTrilhas() {
  const features = [
    { icon: AlertTriangle, title: 'Centro SOS', desc: 'Triagem por IA antes de escalar ao mentor. Chat inteligente que resolve dúvidas imediatamente.' },
    { icon: Users, title: 'Comunidade', desc: 'Feed de publicações, likes, comentários e chat em tempo real entre mentorados do grupo.' },
    { icon: FolderOpen, title: 'Meus Arquivos', desc: 'Drive pessoal com materiais do mentor — PDFs, imagens, links e notas.' },
    { icon: Gift, title: 'Loja de Prêmios', desc: 'Resgate de prêmios com pontos acumulados por atividades, trilhas e prospecções.' },
  ];

  return (
    <div className="flex flex-col h-full gap-5 px-2">
      <div className="space-y-2">
        <GoldBadge>Área do Aluno</GoldBadge>
        <SectionTitle>CRM, Trilhas & Ecossistema</SectionTitle>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* CRM Mockup */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Kanban className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            CRM com Vision AI
          </h3>
          <div className="flex gap-2 overflow-hidden">
            {['Novos', 'Contato', 'Reunião', 'Proposta', 'Fechados'].map((stage, i) => (
              <div key={i} className="flex-1 min-w-0 space-y-1.5">
                <div className="text-[10px] text-slate-400 font-medium truncate">{stage}</div>
                {Array.from({ length: Math.max(1, 3 - i) }).map((_, j) => (
                  <div key={j} className="rounded bg-slate-700/40 p-1.5">
                    <div className="w-full h-1.5 rounded bg-slate-600 mb-1" />
                    <div className="w-3/4 h-1 rounded bg-slate-700" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-[10px]">Upload de até 10 prints → IA extrai dados do lead automaticamente</p>
        </GlassCard>

        {/* Trilhas Mockup */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Play className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            Trilhas de Conteúdo (Estilo Netflix)
          </h3>
          <div className="space-y-2">
            <div className="rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(220 91% 25%), hsl(45 100% 30%))' }}>
              <div className="p-3">
                <div className="text-[10px] text-white/60">Em destaque</div>
                <div className="text-sm text-white font-semibold">Prospecção B2B</div>
                <div className="w-full bg-white/20 rounded-full h-1 mt-2">
                  <div className="h-1 rounded-full bg-white" style={{ width: '65%' }} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {['Negociação', 'CRM', 'Fechamento'].map((t, i) => (
                <div key={i} className="flex-1 rounded-lg bg-slate-700/30 p-2 text-center">
                  <div className="text-[10px] text-slate-300 truncate">{t}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{(3 - i) * 3} aulas</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-slate-500 text-[10px]">Player de vídeo integrado com tracking individual de progresso</p>
        </GlassCard>

        {/* Features grid */}
        {features.map((f, i) => (
          <GlassCard key={i} className="flex gap-3 items-start lg:col-span-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'hsl(45 100% 51% / 0.1)' }}>
              <f.icon className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">{f.title}</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">{f.desc}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ─── SLIDE 4: MENTOR - DASHBOARD ───

function SlideMentorDashboard() {
  return (
    <div className="flex flex-col h-full gap-5 px-2">
      <div className="space-y-2">
        <GoldBadge>Painel do Mentor</GoldBadge>
        <SectionTitle>Dashboard & Gestão de Mentorados</SectionTitle>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* KPI Mockup */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Gauge className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            KPIs em Tempo Real
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Mentorados Ativos', val: '24', trend: '+3 este mês', color: 'text-emerald-400' },
              { label: 'Engajamento', val: '87%', trend: '↑ 12%', color: 'text-blue-400' },
              { label: 'SOS Pendentes', val: '3', trend: '2 urgentes', color: 'text-amber-400' },
              { label: 'Encontros/Semana', val: '6', trend: 'Próximo: Hoje 14h', color: 'text-purple-400' },
            ].map((kpi, i) => (
              <div key={i} className="rounded-lg bg-slate-700/30 p-2.5">
                <div className="text-[10px] text-slate-500">{kpi.label}</div>
                <div className={`text-xl font-bold ${kpi.color}`}>{kpi.val}</div>
                <div className="text-[9px] text-slate-500">{kpi.trend}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Alerts & Insights */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            Alertas & Insights IA
          </h3>
          <div className="space-y-2">
            {[
              { type: '🚨', label: 'SOS Urgente', desc: 'Carlos Silva — dúvida sobre precificação', color: 'border-red-500/30 bg-red-500/5' },
              { type: '⚠️', label: 'Em Risco', desc: 'Ana Costa — inativa há 5 dias', color: 'border-amber-500/30 bg-amber-500/5' },
              { type: '🏆', label: 'Conquista', desc: 'Diego fechou 3 leads esta semana!', color: 'border-emerald-500/30 bg-emerald-500/5' },
            ].map((alert, i) => (
              <div key={i} className={`rounded-lg border p-2 flex items-center gap-2 ${alert.color}`}>
                <span className="text-sm">{alert.type}</span>
                <div className="min-w-0">
                  <div className="text-white text-xs font-medium">{alert.label}</div>
                  <div className="text-slate-400 text-[10px] truncate">{alert.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Gestão de Mentorados */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            Gestão de Mentorados
          </h3>
          <ul className="space-y-1.5 text-slate-300 text-xs">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Ficha individual com dados, status e tempo de mentoria</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Drive exclusivo por aluno para upload de materiais</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Criação manual, convite por email ou importação via planilha</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Busca avançada e filtros por status</li>
          </ul>
        </GlassCard>

        {/* CRM Unificado */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Kanban className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            CRM Unificado — Todos os Alunos
          </h3>
          <ul className="space-y-1.5 text-slate-300 text-xs">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Visão consolidada de TODOS os leads de TODOS os mentorados</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Filtro por aluno, temperatura e status</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Métricas: total de leads, quentes vs frios, taxa de fechamento</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Acesso ao detalhe completo de cada lead</li>
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

// ─── SLIDE 5: MENTOR - AUTOMAÇÃO ───

function SlideMentorAutomacao() {
  return (
    <div className="flex flex-col h-full gap-5 px-2">
      <div className="space-y-2">
        <GoldBadge>Painel do Mentor</GoldBadge>
        <SectionTitle>Automação, Relatórios & Rankings</SectionTitle>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Email Marketing */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Mail className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            Email Marketing & Automação
          </h3>
          {/* Flow Mockup */}
          <div className="flex items-center gap-1.5 overflow-hidden">
            {['Trigger', 'Email', 'Espera 3d', 'Condição', 'Email'].map((node, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="rounded-md bg-slate-700/50 border border-slate-600/50 px-2 py-1 text-[9px] text-slate-300 whitespace-nowrap">
                  {node}
                </div>
                {i < 4 && <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />}
              </div>
            ))}
          </div>
          <ul className="space-y-1 text-slate-400 text-[11px]">
            <li>• Editor visual de fluxos com nodes drag-and-drop</li>
            <li>• Templates de email personalizáveis</li>
            <li>• Geração de campanhas com IA</li>
            <li>• Teste de fluxo antes de ativar</li>
          </ul>
        </GlassCard>

        {/* Jornada CS */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Route className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            Jornada CS (Customer Success)
          </h3>
          <div className="flex gap-1.5">
            {['Onboarding', 'Execução', 'Resultados', 'Maturidade'].map((stage, i) => (
              <div key={i} className="flex-1 text-center">
                <div className={`rounded-full w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold ${i < 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                  {i + 1}
                </div>
                <div className="text-[9px] text-slate-400 mt-1">{stage}</div>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-[11px]">Timeline visual do progresso de cada aluno com estágios personalizáveis e filtros por período</p>
        </GlassCard>

        {/* Relatórios */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            Relatórios Avançados
          </h3>
          <div className="grid grid-cols-3 gap-1.5">
            {['Leads/mês', 'Atividades', 'Conclusão'].map((label, i) => (
              <div key={i} className="rounded-lg bg-slate-700/30 p-2 text-center">
                <div className="flex items-end justify-center gap-0.5 h-8">
                  {[40, 65, 50, 80, 70].map((h, j) => (
                    <div key={j} className="w-1.5 rounded-t" style={{ height: `${h}%`, background: 'hsl(45 100% 51% / 0.5)' }} />
                  ))}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-[11px]">KPIs consolidados, gráficos de barras/pizza e ranking Top 5 Performers</p>
        </GlassCard>

        {/* Rankings & Analytics IA */}
        <GlassCard className="space-y-3">
          <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
            Rankings & Analytics IA
          </h3>
          <div className="space-y-1.5">
            {[
              { pos: '🥇', name: 'Diego Mendonça', leads: 47, pts: 1250 },
              { pos: '🥈', name: 'Ana Costa', leads: 38, pts: 980 },
              { pos: '🥉', name: 'Carlos Silva', leads: 31, pts: 840 },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-700/30 p-1.5">
                <span className="text-sm">{r.pos}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-medium truncate">{r.name}</div>
                </div>
                <div className="text-[10px] text-slate-400">{r.leads} leads</div>
                <div className="text-[10px] font-medium" style={{ color: 'hsl(45 100% 51%)' }}>{r.pts} pts</div>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-[11px]">Analytics de uso das ferramentas IA — quais são mais usadas e por quem</p>
        </GlassCard>
      </div>
    </div>
  );
}

// ─── SLIDE 6: DIFERENCIAIS ───

function SlideDiferenciais() {
  const diferenciais = [
    { feature: 'IA Integrada', desc: '8 ferramentas conectadas ao contexto real do negócio' },
    { feature: 'CRM Vision AI', desc: 'Upload de prints e IA extrai dados automaticamente' },
    { feature: 'Qualificação DISC', desc: 'Score 0-100 com perfil comportamental' },
    { feature: 'Multi-tenant', desc: 'Cada mentor em ambiente completamente isolado' },
    { feature: 'Gamificação', desc: 'Pontos, badges, streaks e loja de prêmios' },
    { feature: 'SOS Inteligente', desc: 'IA resolve antes de escalar ao mentor' },
    { feature: 'Trilhas Netflix', desc: 'Conteúdo premium com tracking individual' },
    { feature: 'Relatórios Real-time', desc: 'KPIs e rankings atualizados automaticamente' },
  ];

  const roles = ['Master Admin', 'Admin', 'Ops', 'Mentor', 'Mentee'];

  return (
    <div className="flex flex-col h-full gap-5 px-2">
      <div className="space-y-2">
        <SectionTitle>Diferenciais Tecnológicos & Segurança</SectionTitle>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1">
        {/* Diferenciais Table */}
        <GlassCard className="lg:col-span-3 space-y-2">
          <h3 className="text-white font-display font-semibold text-sm">Diferenciais da Plataforma</h3>
          <div className="space-y-1.5">
            {diferenciais.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-700/20 px-3 py-1.5">
                <Star className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(45 100% 51%)' }} />
                <div className="min-w-0">
                  <span className="text-white text-xs font-medium">{d.feature}</span>
                  <span className="text-slate-500 text-xs ml-2">— {d.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Security */}
        <div className="lg:col-span-2 space-y-4">
          <GlassCard className="space-y-3">
            <h3 className="text-white font-display font-semibold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: 'hsl(45 100% 51%)' }} />
              Segurança & Privacidade
            </h3>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li className="flex items-start gap-2"><Lock className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Isolamento por Tenant: cada mentor em ambiente separado</li>
              <li className="flex items-start gap-2"><Lock className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Privacidade: aluno vê APENAS seus dados</li>
              <li className="flex items-start gap-2"><Lock className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> RLS (Row Level Security) em todas as tabelas</li>
              <li className="flex items-start gap-2"><Lock className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> Sistema 100% invite-only</li>
            </ul>
          </GlassCard>

          <GlassCard className="space-y-3">
            <h3 className="text-white font-display font-semibold text-sm">Hierarquia de Papéis</h3>
            <div className="flex flex-col gap-1.5">
              {roles.map((role, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 text-center text-[10px] text-slate-500">{i + 1}</div>
                  <div className={`flex-1 rounded-md py-1 px-2 text-xs font-medium text-center ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    i === 4 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-slate-700/50 text-slate-300 border border-slate-600/30'
                  }`}>
                    {role}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 7: JORNADA + VALOR ───

function SlideJornadaValor() {
  const jornada = [
    'Recebe convite por email',
    'Onboarding com perguntas de perfil',
    'Preenche Contexto de Pitch',
    'Acessa Trilhas e começa a aprender',
    'Qualifica leads com IA (score DISC)',
    'Leads caem no CRM automaticamente',
    'Gera scripts no Hub de Comunicação',
    'Pratica no Simulador de Objeções',
    'Cria propostas com IA',
    'Registra prospecções → ganha pontos',
    'SOS com IA se precisar de ajuda',
    'Acessa materiais no Drive',
    'Troca experiências na Comunidade',
    'Resgata prêmios na Loja',
  ];

  return (
    <div className="flex flex-col h-full gap-5 px-2">
      <div className="space-y-2">
        <SectionTitle>Jornada do Mentorado & Métricas de Valor</SectionTitle>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Jornada */}
        <GlassCard className="space-y-3 overflow-auto">
          <h3 className="text-white font-display font-semibold text-sm">Jornada Completa — 14 Passos</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {jornada.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                  style={{ background: 'hsl(45 100% 51% / 0.15)', color: 'hsl(45 100% 51%)' }}>
                  {i + 1}
                </div>
                <span className="text-slate-300 text-[11px] leading-tight">{step}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Valor */}
        <div className="space-y-4">
          <GlassCard className="space-y-3 border-emerald-500/20">
            <h3 className="text-emerald-400 font-display font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Valor para o Mentor
            </h3>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li>✅ Dashboard unificado com todos os KPIs</li>
              <li>✅ CRM consolidado de todos os alunos</li>
              <li>✅ IA que treina o mentorado 24/7</li>
              <li>✅ Redução de chamados via triagem IA</li>
              <li>✅ Ranking que estimula competição saudável</li>
              <li>✅ Relatórios prontos para reuniões</li>
            </ul>
          </GlassCard>

          <GlassCard className="space-y-3 border-blue-500/20">
            <h3 className="text-blue-400 font-display font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Valor para o Mentorado
            </h3>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li>✅ IA qualifica leads em segundos com score e estratégia</li>
              <li>✅ Scripts personalizados para cada canal</li>
              <li>✅ CRM pessoal com pipeline visual</li>
              <li>✅ Simulação de objeções com IA</li>
              <li>✅ Mentor Virtual 24/7</li>
              <li>✅ Gamificação que transforma rotina em jogo</li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
