import { 
  Brain, MessageSquare, Swords, FileText, BarChart3, User, PenTool, Bot,
  Target, Play, Users, AlertTriangle, Gift, Shield,
  Mail, TrendingUp, Lock, ArrowRight,
  Eye, Trophy, Sparkles, Zap, CheckCircle2, Monitor
} from 'lucide-react';
import { LBVLogo } from '@/components/LBVLogo';

interface SlideRendererProps {
  slideIndex: number;
}

export function SlideRenderer({ slideIndex }: SlideRendererProps) {
  switch (slideIndex) {
    case 0: return <SlideCapa />;
    case 1: return <SlideVisaoGeral />;
    case 2: return <SlideArsenalIA />;
    case 3: return <SlideCRMTrilhas />;
    case 4: return <SlideMentorDashboard />;
    case 5: return <SlideMentorAutomacao />;
    case 6: return <SlideDiferenciais />;
    case 7: return <SlideJornadaValor />;
    default: return null;
  }
}

/* ═══════════════════════════════════════════
   DESIGN PRIMITIVES 
   ═══════════════════════════════════════════ */

const gold = 'hsl(45 100% 51%)';
const goldSoft = 'hsl(45 100% 51% / 0.12)';
const goldBorder = 'hsl(45 100% 51% / 0.2)';

function Headline({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={`text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] text-white ${className}`}>
      {children}
    </h1>
  );
}

function GoldText({ children }: { children: React.ReactNode }) {
  return <span style={{ color: gold }}>{children}</span>;
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl">{children}</p>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider"
      style={{ background: goldSoft, color: gold, border: `1px solid ${goldBorder}` }}>
      {children}
    </span>
  );
}

function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 ${className}`} style={style}>
      {children}
    </div>
  );
}

function IconBox({ icon: Icon }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: goldSoft }}>
      <Icon className="w-5 h-5" style={{ color: gold }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 0 — CAPA
   ═══════════════════════════════════════════ */

function SlideCapa() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-10 min-h-[60vh]">
      {/* Glow behind logo */}
      <div className="relative">
        <div className="absolute inset-0 blur-[80px] opacity-20 rounded-full scale-150"
          style={{ background: `radial-gradient(circle, ${gold}, transparent 70%)` }} />
        <LBVLogo variant="full" size="xl" />
      </div>

      <div className="space-y-6 max-w-4xl">
        <Headline className="text-5xl md:text-6xl lg:text-7xl">
          O Sistema que{' '}
          <GoldText>Transforma</GoldText>
          <br />
          Mentorias em Máquinas de Resultado
        </Headline>

        <Lead>
          Tudo que seu mentorado precisa para prospectar, vender e crescer —
          com inteligência artificial, gamificação e acompanhamento em tempo real.
        </Lead>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {['8 Ferramentas de IA', 'CRM Vision AI', 'Gamificação Completa'].map(tag => (
          <Pill key={tag}>{tag}</Pill>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 1 — VISÃO GERAL
   ═══════════════════════════════════════════ */

function SlideVisaoGeral() {
  const pilares = [
    { icon: TrendingUp, title: 'Previsibilidade', copy: 'Seu mentorado sabe exatamente o que fazer todo dia. Pipeline organizado, metas claras, IA guiando cada passo.' },
    { icon: Eye, title: 'Visibilidade Total', copy: 'Você enxerga tudo: quem tá prospectando, quem parou, quem fechou. Sem achismo.' },
    { icon: Brain, title: 'IA que Vende', copy: '8 ferramentas de IA treinadas no contexto real do negócio do aluno. Não é genérico — é cirúrgico.' },
    { icon: Trophy, title: 'Engajamento Real', copy: 'Pontos, rankings, badges e prêmios. Seus alunos competem entre si e a energia do grupo explode.' },
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Pill>A Plataforma</Pill>
        <Headline>
          Quatro pilares.<br /><GoldText>Zero achismo.</GoldText>
        </Headline>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pilares.map((p, i) => (
          <Card key={i} className="flex gap-4 items-start group hover:border-white/[0.12] transition-colors duration-300">
            <IconBox icon={p.icon} />
            <div className="space-y-1.5">
              <h3 className="text-white font-display font-semibold text-lg">{p.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{p.copy}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 2 — ARSENAL DE IA
   ═══════════════════════════════════════════ */

function SlideArsenalIA() {
  const tools = [
    { icon: Target, name: 'Qualificador de Leads', desc: 'Cola o perfil, recebe score DISC, estratégia de abordagem e script pronto.' },
    { icon: MessageSquare, name: 'Hub de Comunicação', desc: 'Scripts para WhatsApp, Instagram, LinkedIn e Email. Personalizado pro lead.' },
    { icon: Swords, name: 'Simulador de Objeções', desc: 'Role-play com IA. O aluno treina antes de cada reunião real.' },
    { icon: FileText, name: 'Criador de Propostas', desc: 'Proposta profissional gerada em segundos com ancoragem de valor.' },
    { icon: BarChart3, name: 'Análise de Performance', desc: 'Envia transcrição de call, recebe diagnóstico com pontos fortes e melhorias.' },
    { icon: User, name: 'Gerador de Bio', desc: 'Bio otimizada para redes sociais, alinhada ao posicionamento.' },
    { icon: PenTool, name: 'Gerador de Conteúdo', desc: 'Posts estratégicos para atrair o público certo.' },
    { icon: Bot, name: 'Mentor Virtual 24/7', desc: 'Chat inteligente que responde dúvidas de vendas a qualquer hora.' },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Pill>Área do Aluno</Pill>
        <Headline>
          <GoldText>8 ferramentas de IA</GoldText><br />que vendem por ele.
        </Headline>
        <Lead>Todas conectadas ao Contexto de Pitch do negócio. A IA sabe o que ele vende, pra quem e como.</Lead>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {tools.map((t, i) => (
          <Card key={i} className="group hover:border-white/[0.12] transition-all duration-300 space-y-3">
            <div className="flex items-center gap-3">
              <IconBox icon={t.icon} />
              <h4 className="text-white text-sm font-semibold leading-tight">{t.name}</h4>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">{t.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 3 — CRM + TRILHAS + ECOSSISTEMA
   ═══════════════════════════════════════════ */

function SlideCRMTrilhas() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Pill>Área do Aluno</Pill>
        <Headline>
          CRM com <GoldText>Vision AI</GoldText>,<br />Trilhas estilo Netflix e mais.
        </Headline>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CRM */}
        <Card className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <IconBox icon={Monitor} />
            <div>
              <h3 className="text-white font-semibold">CRM de Vendas Pessoal</h3>
              <p className="text-slate-500 text-xs">Pipeline Kanban com 6 estágios</p>
            </div>
          </div>
          {/* Mini kanban mockup */}
          <div className="flex gap-2">
            {['Novos', 'Contato', 'Reunião', 'Proposta', 'Fechados'].map((stage, i) => (
              <div key={i} className="flex-1 space-y-2">
                <div className="text-[10px] text-slate-500 font-medium">{stage}</div>
                {Array.from({ length: Math.max(1, 3 - i) }).map((_, j) => (
                  <div key={j} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2 space-y-1">
                    <div className="w-full h-1.5 rounded bg-slate-700/50" />
                    <div className="w-2/3 h-1 rounded bg-slate-800/50" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: gold }} />
            Upload de até 10 prints de conversa → IA extrai dados do lead automaticamente
          </p>
        </Card>

        {/* Side features */}
        <div className="space-y-4">
          {[
            { icon: Play, title: 'Trilhas Netflix', desc: 'Conteúdo organizado em carrosséis com tracking individual de progresso por aula.' },
            { icon: Users, title: 'Comunidade', desc: 'Feed, likes, comentários e chat em tempo real entre mentorados.' },
            { icon: AlertTriangle, title: 'Centro SOS', desc: 'IA resolve a dúvida antes de escalar. Reduz 70% da carga operacional.' },
            { icon: Gift, title: 'Loja de Prêmios', desc: 'Resgate de prêmios com pontos acumulados por atividades.' },
          ].map((f, i) => (
            <Card key={i} className="flex gap-3 items-start hover:border-white/[0.12] transition-colors">
              <f.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: gold }} />
              <div>
                <h4 className="text-white text-sm font-semibold">{f.title}</h4>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 4 — MENTOR DASHBOARD
   ═══════════════════════════════════════════ */

function SlideMentorDashboard() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Pill>Painel do Mentor</Pill>
        <Headline>
          Visão de <GoldText>comando.</GoldText><br />Tudo numa tela.
        </Headline>
        <Lead>KPIs em tempo real, alertas inteligentes, gestão de alunos e CRM unificado de todo o grupo.</Lead>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* KPIs mockup */}
        <Card className="space-y-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: gold }} /> Dashboard em Tempo Real
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Mentorados Ativos', val: '24', sub: '+3 este mês' },
              { label: 'Engajamento', val: '87%', sub: '↑ 12% vs anterior' },
              { label: 'SOS Pendentes', val: '3', sub: '2 urgentes' },
              { label: 'Leads do Grupo', val: '312', sub: '47 quentes' },
            ].map((k, i) => (
              <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 space-y-1">
                <div className="text-[11px] text-slate-500">{k.label}</div>
                <div className="text-2xl font-bold text-white">{k.val}</div>
                <div className="text-[10px] text-slate-600">{k.sub}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alertas */}
        <Card className="space-y-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: gold }} /> Alertas & Insights IA
          </h3>
          <div className="space-y-2.5">
            {[
              { emoji: '🚨', label: 'SOS Urgente', desc: 'Carlos Silva — dúvida sobre precificação', border: 'border-red-500/20' },
              { emoji: '⚠️', label: 'Em Risco', desc: 'Ana Costa — inativa há 5 dias', border: 'border-amber-500/20' },
              { emoji: '🏆', label: 'Conquista', desc: 'Diego fechou 3 leads esta semana!', border: 'border-emerald-500/20' },
              { emoji: '📊', label: 'Analytics IA', desc: 'Qualificador é a ferramenta mais usada (42%)', border: 'border-blue-500/20' },
            ].map((a, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl border bg-white/[0.01] p-3 ${a.border}`}>
                <span className="text-lg">{a.emoji}</span>
                <div className="min-w-0">
                  <div className="text-white text-xs font-medium">{a.label}</div>
                  <div className="text-slate-500 text-[11px] truncate">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 5 — MENTOR AUTOMAÇÃO
   ═══════════════════════════════════════════ */

function SlideMentorAutomacao() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Pill>Painel do Mentor</Pill>
        <Headline>
          Automação que <GoldText>escala</GoldText><br />sem aumentar sua equipe.
        </Headline>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <IconBox icon={Mail} />
            <h3 className="text-white font-semibold">Email Marketing</h3>
          </div>
          {/* Flow mockup */}
          <div className="flex items-center gap-1 flex-wrap">
            {['Gatilho', 'Email', '3 dias', 'Condição', 'Email'].map((n, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="rounded-md bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 text-[10px] text-slate-400">{n}</div>
                {i < 4 && <ArrowRight className="w-3 h-3 text-slate-700" />}
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs">Editor visual de fluxos com geração de campanhas por IA.</p>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <IconBox icon={BarChart3} />
            <h3 className="text-white font-semibold">Relatórios</h3>
          </div>
          <div className="flex items-end justify-center gap-1.5 h-16">
            {[35, 55, 42, 70, 60, 85, 65].map((h, i) => (
              <div key={i} className="w-4 rounded-t transition-all" style={{ height: `${h}%`, background: `hsl(45 100% 51% / ${0.2 + i * 0.08})` }} />
            ))}
          </div>
          <p className="text-slate-500 text-xs">KPIs, gráficos e ranking Top 5 Performers atualizados em tempo real.</p>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <IconBox icon={Trophy} />
            <h3 className="text-white font-semibold">Rankings</h3>
          </div>
          <div className="space-y-2">
            {[
              { pos: '🥇', name: 'Diego M.', pts: '1.250' },
              { pos: '🥈', name: 'Ana C.', pts: '980' },
              { pos: '🥉', name: 'Carlos S.', pts: '840' },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2">
                <span>{r.pos}</span>
                <span className="text-white text-xs flex-1">{r.name}</span>
                <span className="text-xs font-semibold" style={{ color: gold }}>{r.pts} pts</span>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs">Competição saudável que mantém o grupo ativo e engajado.</p>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 6 — DIFERENCIAIS
   ═══════════════════════════════════════════ */

function SlideDiferenciais() {
  const items = [
    { icon: Brain, feat: 'IA Integrada', desc: '8 ferramentas conectadas ao contexto real do negócio' },
    { icon: Eye, feat: 'CRM Vision AI', desc: 'Upload de prints e IA extrai dados do lead' },
    { icon: Target, feat: 'Score DISC', desc: 'Qualificação comportamental com perfil e estratégia' },
    { icon: Shield, feat: 'Multi-tenant', desc: 'Cada mentor em ambiente completamente isolado' },
    { icon: Trophy, feat: 'Gamificação', desc: 'Pontos, badges, streaks e loja de prêmios' },
    { icon: AlertTriangle, feat: 'SOS Inteligente', desc: 'IA resolve antes de escalar ao mentor' },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Pill>Tecnologia</Pill>
        <Headline>
          O que nenhuma<br />outra plataforma <GoldText>tem.</GoldText>
        </Headline>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((d, i) => (
          <Card key={i} className="flex gap-4 items-start group hover:border-white/[0.12] transition-all">
            <IconBox icon={d.icon} />
            <div>
              <h4 className="text-white font-semibold">{d.feat}</h4>
              <p className="text-slate-500 text-sm mt-1">{d.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Security bar */}
      <Card className="flex flex-wrap items-center justify-center gap-6 py-4" >
        {[
          { icon: Lock, text: 'Isolamento por Tenant' },
          { icon: Shield, text: 'RLS em todas as tabelas' },
          { icon: Lock, text: 'Dados 100% privados' },
          { icon: Shield, text: 'Sistema invite-only' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-slate-400 text-xs">
            <s.icon className="w-3.5 h-3.5" style={{ color: gold }} />
            <span>{s.text}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 7 — JORNADA + VALOR
   ═══════════════════════════════════════════ */

function SlideJornadaValor() {
  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <Pill>Resultado</Pill>
        <Headline className="mx-auto">
          De mentorado perdido<br />a <GoldText>máquina de vendas.</GoldText>
        </Headline>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Valor Mentor */}
        <Card className="space-y-4" style={{ borderColor: 'hsl(160 60% 30% / 0.3)' }}>
          <h3 className="text-emerald-400 font-display font-semibold text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Para o Mentor
          </h3>
          <p className="text-slate-400 text-sm">Sem a plataforma, você vive no escuro. Com ela:</p>
          <div className="space-y-2.5">
            {[
              'Dashboard unificado — zero achismo',
              'CRM de TODOS os alunos consolidado',
              'IA que treina seu mentorado 24/7',
              'SOS com triagem IA — menos chamados operacionais',
              'Rankings que geram competição e energia no grupo',
              'Relatórios prontos para cada reunião',
            ].map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-slate-300 text-sm">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Valor Mentorado */}
        <Card className="space-y-4" style={{ borderColor: 'hsl(220 60% 40% / 0.3)' }}>
          <h3 className="text-blue-400 font-display font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Para o Mentorado
          </h3>
          <p className="text-slate-400 text-sm">Sem a plataforma, ele depende 100% de você. Com ela:</p>
          <div className="space-y-2.5">
            {[
              'IA qualifica leads em segundos com score e estratégia',
              'Scripts personalizados para WhatsApp, Instagram, LinkedIn',
              'CRM pessoal com pipeline visual organizado',
              'Simulação de objeções antes de cada reunião',
              'Mentor Virtual 24/7 — não precisa esperar a próxima call',
              'Gamificação que transforma prospecção em jogo',
            ].map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span className="text-slate-300 text-sm">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
