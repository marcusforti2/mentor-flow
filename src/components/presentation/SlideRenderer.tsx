import { 
  Brain, MessageSquare, Swords, FileText, BarChart3, User, PenTool, Bot,
  Target, Play, Users, Gift, Shield,
  TrendingUp, ArrowRight, Zap,
  Eye, Trophy, Sparkles, CheckCircle2, Monitor, Clock,
  XCircle, Flame, LineChart, Award
} from 'lucide-react';
import { LBVLogo } from '@/components/LBVLogo';

interface SlideRendererProps {
  slideIndex: number;
}

export function SlideRenderer({ slideIndex }: SlideRendererProps) {
  switch (slideIndex) {
    case 0: return <SlideCapa />;
    case 1: return <SlideProblema />;
    case 2: return <SlideArsenalIA />;
    case 3: return <SlideCRMVision />;
    case 4: return <SlideTrilhasGamificacao />;
    case 5: return <SlideSuporte247 />;
    case 6: return <SlideMentorPainel />;
    case 7: return <SlideEncerramento />;
    default: return null;
  }
}

/* ═══════════════════════════════════════════
   DESIGN SYSTEM
   ═══════════════════════════════════════════ */

const gold = 'hsl(45 100% 51%)';
const goldDim = 'hsl(45 100% 51% / 0.10)';
const goldBorder = 'hsl(45 100% 51% / 0.18)';

function Headline({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={`text-[clamp(2rem,5vw,4rem)] font-display font-bold tracking-tight leading-[1.08] text-white ${className}`}>
      {children}
    </h1>
  );
}

function Gold({ children }: { children: React.ReactNode }) {
  return <span style={{ color: gold }}>{children}</span>;
}

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-clip-text text-transparent"
      style={{ backgroundImage: `linear-gradient(135deg, ${gold}, hsl(35 100% 60%))` }}>
      {children}
    </span>
  );
}

function Sub({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl ${className}`}>{children}</p>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em]"
      style={{ background: goldDim, color: gold, border: `1px solid ${goldBorder}` }}>
      {children}
    </span>
  );
}

function Card({ children, className = '', glow = false, style }: { children: React.ReactNode; className?: string; glow?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all duration-300 ${
        glow ? 'border-white/[0.1] bg-white/[0.04]' : 'border-white/[0.05] bg-white/[0.02]'
      } ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function BigStat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="text-center space-y-1">
      <div className={`text-4xl md:text-5xl font-display font-bold ${accent ? '' : 'text-white'}`}
        style={accent ? { color: gold } : undefined}>
        {value}
      </div>
      <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function IconCircle({ icon: Icon }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
      style={{ background: goldDim, border: `1px solid ${goldBorder}` }}>
      <Icon className="w-5 h-5" style={{ color: gold }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 0 — CAPA
   Hero emocional, frase que provoca
   ═══════════════════════════════════════════ */

function SlideCapa() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-10 min-h-[55vh]">
      {/* Logo with massive glow */}
      <div className="relative">
        <div className="absolute inset-0 blur-[100px] opacity-25 rounded-full scale-[2]"
          style={{ background: `radial-gradient(circle, ${gold}, transparent 70%)` }} />
        <LBVLogo variant="full" size="xl" />
      </div>

      <div className="space-y-8 max-w-4xl relative z-10">
        <Headline className="text-[clamp(2.2rem,5.5vw,4.5rem)]">
          Pare de vender <Gold>no escuro.</Gold>
        </Headline>

        <Sub className="text-lg md:text-xl mx-auto max-w-xl">
          A plataforma que dá ao seu mentorado tudo que ele precisa para
          prospectar com inteligência, fechar com confiança e escalar com método.
        </Sub>

        <div className="flex flex-wrap gap-3 justify-center pt-2">
          {[
            '8 IAs de Vendas',
            'CRM com Vision AI',
            'Gamificação Completa',
            'Suporte 24/7',
          ].map(tag => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 1 — O PROBLEMA (Antes/Depois)
   ═══════════════════════════════════════════ */

function SlideProblema() {
  const sem = [
    'Prospecta sem método — manda mensagens genéricas',
    'Não sabe qualificar lead — perde tempo com quem não compra',
    'Esquece follow-up — oportunidades morrem no silêncio',
    'Depende 100% do mentor pra cada dúvida',
    'Não tem CRM — pipeline na cabeça ou no bloco de notas',
    'Conteúdo disperso — WhatsApp, Google Drive, YouTube',
  ];

  const com = [
    'IA gera scripts personalizados pra cada lead',
    'Score DISC + estratégia de abordagem em segundos',
    'Coach de Follow-up sugere o que mandar e quando',
    'Mentor Virtual 24/7 responde na hora',
    'CRM Kanban visual com pipeline organizado',
    'Trilhas Netflix com tracking de progresso por aula',
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <Pill>O Problema</Pill>
        <Headline>
          Seu mentorado <Gold>sem a plataforma</Gold><br />
          vs. com ela.
        </Headline>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* SEM */}
        <Card className="space-y-4" style={{ borderColor: 'hsl(0 60% 30% / 0.3)' }}>
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-display font-bold text-sm uppercase tracking-wider">Sem a plataforma</span>
          </div>
          <div className="space-y-3">
            {sem.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 mt-2 shrink-0" />
                <span className="text-slate-400 text-sm leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* COM */}
        <Card className="space-y-4" style={{ borderColor: 'hsl(150 60% 30% / 0.3)' }}>
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-display font-bold text-sm uppercase tracking-wider">Com a plataforma</span>
          </div>
          <div className="space-y-3">
            {com.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500/70 mt-0.5 shrink-0" />
                <span className="text-slate-300 text-sm leading-relaxed">{c}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 2 — ARSENAL DE IA
   ═══════════════════════════════════════════ */

function SlideArsenalIA() {
  const tools = [
    { icon: Target, name: 'Qualificador de Leads', hook: 'Cola o perfil → recebe score, DISC, script pronto.' },
    { icon: MessageSquare, name: 'Hub de Comunicação', hook: 'Scripts pro WhatsApp, Instagram, LinkedIn e Email.' },
    { icon: Swords, name: 'Simulador de Objeções', hook: 'Role-play com IA antes de cada reunião real.' },
    { icon: FileText, name: 'Criador de Propostas', hook: 'Proposta profissional com ancoragem de valor.' },
    { icon: BarChart3, name: 'Análise de Performance', hook: 'Envia a call, recebe diagnóstico completo.' },
    { icon: User, name: 'Gerador de Bio', hook: 'Bio otimizada pro posicionamento certo.' },
    { icon: PenTool, name: 'Gerador de Conteúdo', hook: 'Posts que atraem o público certo.' },
    { icon: Bot, name: 'Mentor Virtual 24/7', hook: 'Tira dúvida de vendas a qualquer hora.' },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Pill>Arsenal de Vendas</Pill>
        <Headline>
          <GradientText>8 IAs</GradientText> treinadas<br />
          no seu negócio.
        </Headline>
        <Sub>Não é IA genérica. Cada ferramenta sabe o que você vende, pra quem e como. Personalizadas com seu Contexto de Pitch.</Sub>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tools.map((t, i) => (
          <Card key={i} glow className="space-y-3 group hover:scale-[1.02] transition-transform duration-300 cursor-default">
            <IconCircle icon={t.icon} />
            <div>
              <h4 className="text-white text-sm font-semibold">{t.name}</h4>
              <p className="text-slate-500 text-[12px] leading-relaxed mt-1">{t.hook}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 3 — CRM COM VISION AI
   Feature showcase com mockup grande
   ═══════════════════════════════════════════ */

function SlideCRMVision() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Copy */}
        <div className="space-y-6">
          <Pill>CRM Inteligente</Pill>
          <Headline>
            Manda o <Gold>print.</Gold><br />
            A IA faz o resto.
          </Headline>
          <Sub>
            Tirou print de uma conversa no WhatsApp ou Instagram?
            A IA extrai nome, empresa, temperatura, objeções e monta a ficha do lead automaticamente.
          </Sub>

          <div className="space-y-3 pt-2">
            {[
              { icon: Monitor, text: 'Pipeline Kanban com 6 estágios visuais' },
              { icon: Eye, text: 'Upload de até 10 prints — IA analisa tudo' },
              { icon: Target, text: 'Score e temperatura do lead calculados automaticamente' },
              { icon: Zap, text: 'Lead cai direto no funil, pronto pra abordagem' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <f.icon className="w-4 h-4 shrink-0" style={{ color: gold }} />
                <span className="text-slate-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban Mockup — Grande */}
        <Card glow className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Meu Pipeline</span>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: gold }}>12 leads ativos</span>
          </div>
          <div className="flex gap-2">
            {[
              { name: 'Novos', count: 4, color: 'bg-blue-500/20' },
              { name: 'Contato', count: 3, color: 'bg-amber-500/20' },
              { name: 'Reunião', count: 2, color: 'bg-purple-500/20' },
              { name: 'Proposta', count: 2, color: 'bg-orange-500/20' },
              { name: 'Fechados', count: 1, color: 'bg-emerald-500/20' },
            ].map((col, i) => (
              <div key={i} className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">{col.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${col.color} text-slate-300`}>{col.count}</span>
                </div>
                {Array.from({ length: col.count }).map((_, j) => (
                  <div key={j} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2 space-y-1.5">
                    <div className="w-full h-2 rounded bg-slate-700/40" />
                    <div className="w-2/3 h-1.5 rounded bg-slate-800/40" />
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full bg-slate-700/30" />
                      <div className="flex-1 h-1 rounded bg-slate-800/30 mt-1.5" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 4 — TRILHAS + GAMIFICAÇÃO
   ═══════════════════════════════════════════ */

function SlideTrilhasGamificacao() {
  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <Pill>Aprendizado & Engajamento</Pill>
        <Headline>
          Aprende como na <Gold>Netflix.</Gold><br />
          Compete como num <Gold>game.</Gold>
        </Headline>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trilhas */}
        <Card glow className="space-y-4">
          <div className="flex items-center gap-3">
            <IconCircle icon={Play} />
            <div>
              <h3 className="text-white font-semibold">Trilhas de Conteúdo</h3>
              <p className="text-slate-500 text-xs">Carrosséis com tracking por aula</p>
            </div>
          </div>

          {/* Netflix mockup */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, hsl(220 50% 15%), hsl(35 80% 20%))' }}>
            <div className="p-4 space-y-2">
              <div className="text-[10px] text-white/50 uppercase tracking-wider">Em destaque</div>
              <div className="text-lg text-white font-display font-bold">Prospecção B2B Avançada</div>
              <p className="text-white/40 text-xs">11 aulas · 4h30 de conteúdo</p>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-3">
                <div className="h-1.5 rounded-full" style={{ width: '72%', background: gold }} />
              </div>
              <div className="text-[10px] text-white/50">72% concluído</div>
            </div>
          </div>

          <div className="flex gap-2">
            {['Negociação', 'CRM Pipeline', 'Fechamento'].map((t, i) => (
              <div key={i} className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                <div className="text-xs text-white font-medium">{t}</div>
                <div className="text-[10px] text-slate-500 mt-1">{9 - i * 2} aulas</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gamificação */}
        <div className="space-y-4">
          <Card glow className="space-y-4">
            <div className="flex items-center gap-3">
              <IconCircle icon={Trophy} />
              <div>
                <h3 className="text-white font-semibold">Sistema de Gamificação</h3>
                <p className="text-slate-500 text-xs">Competição que gera resultado</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center space-y-1">
                <Flame className="w-6 h-6 mx-auto text-orange-400" />
                <div className="text-white text-lg font-bold">12</div>
                <div className="text-[10px] text-slate-500">Dias de Streak</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center space-y-1">
                <Award className="w-6 h-6 mx-auto text-amber-400" />
                <div className="text-white text-lg font-bold">7</div>
                <div className="text-[10px] text-slate-500">Badges</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center space-y-1">
                <TrendingUp className="w-6 h-6 mx-auto text-emerald-400" />
                <div className="text-white text-lg font-bold">#3</div>
                <div className="text-[10px] text-slate-500">No Ranking</div>
              </div>
            </div>
          </Card>

          <Card glow className="space-y-3">
            <div className="flex items-center gap-3">
              <IconCircle icon={Gift} />
              <div>
                <h3 className="text-white font-semibold">Loja de Prêmios</h3>
                <p className="text-slate-500 text-xs">Converte pontos em recompensas reais</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              Cada prospecção, cada aula concluída, cada lead fechado gera pontos. 
              O mentorado <span className="text-white font-medium">resgata prêmios reais</span> com a pontuação acumulada.
            </p>
          </Card>

          <Card glow className="space-y-3">
            <div className="flex items-center gap-3">
              <IconCircle icon={Users} />
              <div>
                <h3 className="text-white font-semibold">Comunidade Exclusiva</h3>
                <p className="text-slate-500 text-xs">Feed + chat em tempo real</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              Os mentorados trocam experiências, celebram vitórias e se ajudam mutuamente.
              A <span className="text-white font-medium">energia do grupo multiplica os resultados</span>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 5 — SUPORTE 24/7
   ═══════════════════════════════════════════ */

function SlideSuporte247() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <Pill>Suporte Inteligente</Pill>
          <Headline>
            Travou numa venda?<br />
            <Gold>Resposta em segundos.</Gold>
          </Headline>
          <Sub>
            O Centro SOS usa IA treinada no seu contexto de negócio pra resolver a dúvida na hora.
            Só escala pro mentor quando realmente precisa.
          </Sub>
        </div>

        {/* Chat mockup */}
        <Card glow className="space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.05]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: goldDim }}>
              <Bot className="w-4 h-4" style={{ color: gold }} />
            </div>
            <div>
              <div className="text-white text-sm font-semibold">Mentor Virtual</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online 24/7
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* User msg */}
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-sm bg-blue-600/20 border border-blue-500/20 px-4 py-2.5 max-w-[80%]">
                <p className="text-slate-300 text-sm">O lead disse que tá caro. Como contornar?</p>
              </div>
            </div>
            {/* Bot response */}
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/[0.06] px-4 py-2.5 max-w-[85%] space-y-2">
                <p className="text-slate-300 text-sm">
                  Boa pergunta! Baseado no seu ticket de <span className="text-white font-medium">R$ 15.000</span> e no perfil desse lead, use a técnica de <span style={{ color: gold }}>ancoragem de valor</span>:
                </p>
                <p className="text-slate-400 text-xs italic">
                  "Quanto você perde por mês sem resolver [dor principal]? Se são R$ 10k/mês, em 2 meses o investimento já se pagou..."
                </p>
              </div>
            </div>
            {/* User msg */}
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-sm bg-blue-600/20 border border-blue-500/20 px-4 py-2.5 max-w-[80%]">
                <p className="text-slate-300 text-sm">E se ele pedir desconto?</p>
              </div>
            </div>
            {/* Bot */}
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/[0.06] px-4 py-2.5 max-w-[85%]">
                <p className="text-slate-300 text-sm">
                  Nunca desconto. <span className="text-white font-medium">Adicione valor</span>. Ofereça uma sessão extra ou acesso antecipado a um módulo exclusivo. O preço se mantém, a percepção de valor aumenta. 💪
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-[10px] text-slate-600">Respostas personalizadas com base no Contexto de Pitch do aluno</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 6 — PAINEL DO MENTOR (visão rápida)
   ═══════════════════════════════════════════ */

function SlideMentorPainel() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Pill>Painel do Mentor</Pill>
        <Headline>
          Você no <Gold>comando.</Gold><br />
          Visão total. Zero achismo.
        </Headline>
        <Sub>Dashboard em tempo real, CRM unificado de todos os alunos, alertas inteligentes e relatórios prontos pra cada reunião.</Sub>
      </div>

      {/* Big Stats */}
      <div className="flex flex-wrap justify-center gap-8 md:gap-12 py-4">
        <BigStat value="24" label="Mentorados Ativos" />
        <BigStat value="312" label="Leads no Pipeline" accent />
        <BigStat value="87%" label="Taxa de Engajamento" />
        <BigStat value="R$ 2.4M" label="Valor no Funil" accent />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: LineChart, title: 'Relatórios Avançados', desc: 'KPIs consolidados, gráficos de atividade, ranking Top 5 e taxa de conversão do grupo.' },
          { icon: Shield, title: 'CRM Unificado', desc: 'Visão de TODOS os leads de TODOS os alunos. Filtre por mentorado, temperatura ou status.' },
          { icon: Zap, title: 'Alertas Inteligentes', desc: 'SOS urgente, mentorado em risco (inatividade), conquistas recentes e analytics de uso da IA.' },
        ].map((f, i) => (
          <Card key={i} glow className="space-y-3">
            <IconCircle icon={f.icon} />
            <h4 className="text-white font-semibold">{f.title}</h4>
            <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 7 — ENCERRAMENTO (CTA emocional)
   ═══════════════════════════════════════════ */

function SlideEncerramento() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-10 min-h-[55vh]">
      {/* Glow */}
      <div className="relative">
        <div className="absolute inset-0 blur-[100px] opacity-20 rounded-full scale-[2.5]"
          style={{ background: `radial-gradient(circle, ${gold}, transparent 60%)` }} />
      </div>

      <div className="space-y-8 max-w-3xl relative z-10">
        <Headline className="text-[clamp(2rem,5vw,4rem)]">
          Seus mentorados <Gold>merecem</Gold><br />
          a melhor ferramenta do mercado.
        </Headline>

        <Sub className="mx-auto text-center max-w-xl">
          Enquanto outros mentorados prospectam no escuro, os seus vão ter
          IA, CRM, gamificação e suporte 24/7 — tudo num só lugar.
        </Sub>

        {/* Final impact stats */}
        <div className="flex flex-wrap justify-center gap-8 pt-4">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold" style={{ color: gold }}>8</div>
            <div className="text-xs text-slate-500 mt-1">IAs de Vendas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold text-white">24/7</div>
            <div className="text-xs text-slate-500 mt-1">Suporte Virtual</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold" style={{ color: gold }}>100%</div>
            <div className="text-xs text-slate-500 mt-1">Personalizado</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold text-white">∞</div>
            <div className="text-xs text-slate-500 mt-1">Escalabilidade</div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <LBVLogo variant="full" size="lg" className="opacity-60" />
      </div>
    </div>
  );
}
