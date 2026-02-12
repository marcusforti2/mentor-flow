import { 
  Brain, MessageSquare, Swords, FileText, BarChart3, User, PenTool, Bot,
  Target, Play, Users, Gift, Shield,
  TrendingUp, ArrowRight, Zap,
  Eye, Trophy, Sparkles, CheckCircle2, Monitor, Clock,
  XCircle, Flame, LineChart, Award, Rocket, Crown, Lock, Heart
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

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
    case 5: return <SlideMentorVirtual />;
    case 6: return <SlideTransformacao />;
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
   Fala direto com o mentorado: "isso é PRA VOCÊ"
   ═══════════════════════════════════════════ */

function SlideCapa() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-10 min-h-[55vh]">
      {/* Logo with massive glow */}
      <div className="relative">
        <div className="absolute inset-0 blur-[100px] opacity-25 rounded-full scale-[2]"
          style={{ background: `radial-gradient(circle, ${gold}, transparent 70%)` }} />
        <BrandLogo variant="full" size="xl" />
      </div>

      <div className="space-y-8 max-w-4xl relative z-10">
        <Headline className="text-[clamp(2.2rem,5.5vw,4.5rem)]">
          Você acabou de ganhar<br />
          um <Gold>arsenal de vendas.</Gold>
        </Headline>

        <Sub className="text-lg md:text-xl mx-auto max-w-xl">
          Tudo que você precisa pra prospectar melhor, fechar mais rápido 
          e parar de depender de sorte. Construímos isso <span className="text-white font-medium">pra você crescer</span>.
        </Sub>

        <div className="flex flex-wrap gap-3 justify-center pt-2">
          {[
            '8 IAs treinadas pra você',
            'Seu CRM pessoal',
            'Trilhas + Gamificação',
            'Suporte 24/7 com IA',
          ].map(tag => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 1 — O PROBLEMA (a dor DELES)
   ═══════════════════════════════════════════ */

function SlideProblema() {
  const dores = [
    { icon: XCircle, text: 'Você prospecta sem método — manda mensagem genérica e torce pra responderem' },
    { icon: XCircle, text: 'Não sabe se o lead tá quente ou frio — perde tempo com quem não vai comprar' },
    { icon: XCircle, text: 'Esquece de fazer follow-up — oportunidades morrem no silêncio' },
    { icon: XCircle, text: 'Na hora da objeção, trava — não sabe o que responder' },
    { icon: XCircle, text: 'Seus leads ficam na cabeça, no bloco de notas ou perdidos no WhatsApp' },
    { icon: XCircle, text: 'Consome conteúdo mas não aplica — falta processo e organização' },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <Pill>Seja honesto</Pill>
        <Headline>
          Quantas vendas <Gold>você já perdeu</Gold><br />
          por falta de processo?
        </Headline>
        <Sub className="mx-auto text-center">
          Se você se identifica com pelo menos 3 dessas situações, a plataforma que vamos te apresentar vai mudar seu jogo.
        </Sub>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
        {dores.map((d, i) => (
          <Card key={i} className="flex items-start gap-3 p-4" style={{ borderColor: 'hsl(0 60% 30% / 0.15)' }}>
            <d.icon className="w-5 h-5 text-red-400/70 shrink-0 mt-0.5" />
            <span className="text-slate-300 text-sm leading-relaxed">{d.text}</span>
          </Card>
        ))}
      </div>

      <div className="text-center pt-2">
        <p className="text-slate-500 text-sm">
          Se isso te incomoda, <span className="text-white font-medium">bom sinal</span>. Significa que você quer mais. E a gente construiu exatamente o que você precisa.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 2 — ARSENAL DE IA (as armas DELES)
   ═══════════════════════════════════════════ */

function SlideArsenalIA() {
  const tools = [
    { icon: Target, name: 'Qualificador de Leads', hook: 'Cola o perfil do lead → recebe score, perfil DISC e script de abordagem pronto.' },
    { icon: MessageSquare, name: 'Hub de Comunicação', hook: 'Scripts personalizados pro WhatsApp, Instagram, LinkedIn e Email. Sem mais "oi, tudo bem?"' },
    { icon: Swords, name: 'Simulador de Objeções', hook: 'Treina com a IA antes da reunião real. Ela te desafia como um cliente difícil.' },
    { icon: FileText, name: 'Criador de Propostas', hook: 'Proposta profissional com ancoragem de valor em minutos.' },
    { icon: BarChart3, name: 'Análise de Calls', hook: 'Grava a call, envia pra IA. Ela te dá diagnóstico completo do que melhorar.' },
    { icon: User, name: 'Gerador de Bio', hook: 'Bio otimizada pro seu posicionamento. Atrai o cliente certo.' },
    { icon: PenTool, name: 'Gerador de Conteúdo', hook: 'Posts prontos pra LinkedIn, Instagram e Stories que atraem leads.' },
    { icon: Bot, name: 'Mentor Virtual 24/7', hook: 'Travou numa negociação às 23h? Pergunta pra IA. Ela responde na hora.' },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Pill>Seu Arsenal</Pill>
        <Headline>
          <GradientText>8 inteligências artificiais</GradientText><br />
          trabalhando pra <Gold>você.</Gold>
        </Headline>
        <Sub>Não é ChatGPT genérico. Cada IA sabe o que você vende, pra quem e como. Elas usam o contexto do <span className="text-white font-medium">seu negócio</span>.</Sub>
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
   SLIDE 3 — CRM COM VISION AI (organização DELES)
   ═══════════════════════════════════════════ */

function SlideCRMVision() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Copy */}
        <div className="space-y-6">
          <Pill>Seu CRM Pessoal</Pill>
          <Headline>
            Chega de lead<br />
            <Gold>perdido no WhatsApp.</Gold>
          </Headline>
          <Sub>
            Agora você tem um pipeline visual pra organizar cada oportunidade.
            E o melhor: manda o <span className="text-white font-medium">print da conversa</span> e a IA cadastra o lead pra você automaticamente.
          </Sub>

          <div className="space-y-3 pt-2">
            {[
              { icon: Monitor, text: 'Pipeline Kanban com etapas visuais — você vê tudo' },
              { icon: Eye, text: 'Upload de prints — a IA extrai nome, empresa e temperatura' },
              { icon: Target, text: 'Score automático — saiba quem priorizar' },
              { icon: Zap, text: 'Integrado com as IAs — gere scripts direto do lead' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <f.icon className="w-4 h-4 shrink-0" style={{ color: gold }} />
                <span className="text-slate-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban Mockup */}
        <Card glow className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Meu Pipeline</span>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: gold }}>Seus leads organizados</span>
          </div>
          <div className="flex gap-2">
            {[
              { name: 'Novos', count: 4, color: 'bg-blue-500/20' },
              { name: 'Contato', count: 3, color: 'bg-amber-500/20' },
              { name: 'Reunião', count: 2, color: 'bg-purple-500/20' },
              { name: 'Proposta', count: 2, color: 'bg-orange-500/20' },
              { name: 'Fechado ✓', count: 1, color: 'bg-emerald-500/20' },
            ].map((col, i) => (
              <div key={i} className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">{col.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${col.color} text-slate-300`}>{col.count}</span>
                </div>
                {Array.from({ length: Math.min(col.count, 3) }).map((_, j) => (
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
   SLIDE 4 — TRILHAS + GAMIFICAÇÃO (crescimento DELES)
   ═══════════════════════════════════════════ */

function SlideTrilhasGamificacao() {
  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <Pill>Seu Crescimento</Pill>
        <Headline>
          Aprende no seu ritmo.<br />
          Compete pra <Gold>ser o melhor.</Gold>
        </Headline>
        <Sub className="mx-auto text-center">
          Conteúdo organizado em trilhas como na Netflix. E cada ação sua gera pontos. Quanto mais você executa, mais você sobe no ranking.
        </Sub>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trilhas */}
        <Card glow className="space-y-4">
          <div className="flex items-center gap-3">
            <IconCircle icon={Play} />
            <div>
              <h3 className="text-white font-semibold">Trilhas de Conteúdo</h3>
              <p className="text-slate-500 text-xs">Tudo organizado, na ordem certa</p>
            </div>
          </div>

          {/* Netflix mockup */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, hsl(220 50% 15%), hsl(35 80% 20%))' }}>
            <div className="p-4 space-y-2">
              <div className="text-[10px] text-white/50 uppercase tracking-wider">Sua próxima trilha</div>
              <div className="text-lg text-white font-display font-bold">Prospecção B2B Avançada</div>
              <p className="text-white/40 text-xs">11 aulas · 4h30 de conteúdo prático</p>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-3">
                <div className="h-1.5 rounded-full" style={{ width: '35%', background: gold }} />
              </div>
              <div className="text-[10px] text-white/50">35% concluído — continue de onde parou</div>
            </div>
          </div>

          <div className="flex gap-2">
            {['Negociação', 'Fechamento', 'Pós-venda'].map((t, i) => (
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
                <h3 className="text-white font-semibold">Ranking & Conquistas</h3>
                <p className="text-slate-500 text-xs">Cada ação sua gera pontos</p>
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
                <Crown className="w-6 h-6 mx-auto" style={{ color: gold }} />
                <div className="text-white text-lg font-bold">#3</div>
                <div className="text-[10px] text-slate-500">No Ranking</div>
              </div>
            </div>

            <p className="text-slate-500 text-xs text-center">
              Prospectou? <span className="text-white">+10pts</span> · Fechou venda? <span className="text-white">+50pts</span> · Completou trilha? <span className="text-white">+30pts</span>
            </p>
          </Card>

          <Card glow className="space-y-3">
            <div className="flex items-center gap-3">
              <IconCircle icon={Gift} />
              <div>
                <h3 className="text-white font-semibold">Loja de Prêmios</h3>
                <p className="text-slate-500 text-xs">Seus pontos viram recompensas reais</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              Cada prospecção, cada aula, cada lead fechado gera pontos. 
              Você <span className="text-white font-medium">troca por prêmios reais</span> — mentorias extras, materiais exclusivos e mais.
            </p>
          </Card>

          <Card glow className="space-y-3">
            <div className="flex items-center gap-3">
              <IconCircle icon={Users} />
              <div>
                <h3 className="text-white font-semibold">Comunidade</h3>
                <p className="text-slate-500 text-xs">Você não tá sozinho nisso</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              Feed exclusivo + chat com o grupo. Compartilhe vitórias, tire dúvidas e troque experiências com quem tá no <span className="text-white font-medium">mesmo jogo que você</span>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 5 — MENTOR VIRTUAL 24/7 (suporte DELES)
   ═══════════════════════════════════════════ */

function SlideMentorVirtual() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <Pill>Nunca Mais Sozinho</Pill>
          <Headline>
            Travou na venda?<br />
            <Gold>Pergunta pra IA.</Gold>
          </Headline>
          <Sub>
            Às 23h, sábado, feriado — não importa. O Mentor Virtual entende seu negócio, 
            conhece seu pitch e te dá a resposta que você precisa <span className="text-white font-medium">na hora</span>.
          </Sub>

          <div className="space-y-3 pt-2">
            {[
              { icon: Clock, text: 'Disponível 24/7 — sem esperar até a próxima reunião' },
              { icon: Brain, text: 'Treinada no contexto do seu negócio e produtos' },
              { icon: Shield, text: 'Centro SOS — pedidos urgentes vão direto pro mentor' },
              { icon: Zap, text: 'Respostas práticas, com script pronto pra usar' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <f.icon className="w-4 h-4 shrink-0" style={{ color: gold }} />
                <span className="text-slate-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
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
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online agora
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-sm bg-blue-600/20 border border-blue-500/20 px-4 py-2.5 max-w-[80%]">
                <p className="text-slate-300 text-sm">O lead disse que tá caro. Como respondo?</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/[0.06] px-4 py-2.5 max-w-[85%] space-y-2">
                <p className="text-slate-300 text-sm">
                  Baseado no seu ticket de <span className="text-white font-medium">R$ 15.000</span>, use <span style={{ color: gold }}>ancoragem de valor</span>:
                </p>
                <p className="text-slate-400 text-xs italic">
                  "Quanto você perde por mês sem resolver [dor principal]? Se são R$ 10k/mês, em 2 meses o investimento já se pagou..."
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-sm bg-blue-600/20 border border-blue-500/20 px-4 py-2.5 max-w-[80%]">
                <p className="text-slate-300 text-sm">E se pedir desconto?</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/[0.06] px-4 py-2.5 max-w-[85%]">
                <p className="text-slate-300 text-sm">
                  Nunca desconto. <span className="text-white font-medium">Adicione valor</span>. Ofereça uma sessão extra ou acesso antecipado. O preço se mantém, a percepção de valor sobe. 💪
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-[10px] text-slate-600">Respostas personalizadas com base no seu Contexto de Pitch</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 6 — TRANSFORMAÇÃO (o antes/depois DELES)
   ═══════════════════════════════════════════ */

function SlideTransformacao() {
  const antes = [
    'Prospecta no escuro, sem dados',
    'Perde lead por falta de follow-up',
    'Depende 100% de reunião com mentor',
    'Pipeline na cabeça ou no bloco de notas',
    'Manda mensagem genérica pra todo mundo',
    'Consome conteúdo mas não aplica',
  ];

  const depois = [
    'IA te diz quem priorizar e como abordar',
    'Coach de Follow-up lembra o que mandar',
    'Mentor Virtual 24/7 resolve na hora',
    'CRM visual com todo seu pipeline organizado',
    'Scripts personalizados pra cada lead',
    'Trilhas com tracking — aprende e aplica',
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <Pill>Sua Transformação</Pill>
        <Headline>
          O que muda <Gold>pra você</Gold><br />
          a partir de agora.
        </Headline>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
        {/* ANTES */}
        <Card className="space-y-4" style={{ borderColor: 'hsl(0 60% 30% / 0.3)' }}>
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-display font-bold text-sm uppercase tracking-wider">Antes</span>
          </div>
          <div className="space-y-3">
            {antes.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 mt-2 shrink-0" />
                <span className="text-slate-400 text-sm leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* DEPOIS */}
        <Card className="space-y-4" style={{ borderColor: `hsl(45 100% 51% / 0.25)` }}>
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
            <Rocket className="w-5 h-5" style={{ color: gold }} />
            <span className="font-display font-bold text-sm uppercase tracking-wider" style={{ color: gold }}>Agora com a plataforma</span>
          </div>
          <div className="space-y-3">
            {depois.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: gold }} />
                <span className="text-slate-200 text-sm leading-relaxed">{c}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="text-center pt-4">
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Não é sobre ter mais ferramentas. É sobre <span className="text-white font-medium">parar de perder venda</span> por falta de processo, dados e agilidade.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE 7 — ENCERRAMENTO (empoderamento)
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
          Construímos isso<br />
          <Gold>pra você crescer.</Gold>
        </Headline>

        <Sub className="mx-auto text-center max-w-xl">
          Enquanto outros prospectam no escuro, você vai ter IA, CRM, 
          gamificação e suporte 24/7 — tudo personalizado pro <span className="text-white font-medium">seu negócio</span>.
        </Sub>

        {/* Final impact stats */}
        <div className="flex flex-wrap justify-center gap-8 pt-4">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold" style={{ color: gold }}>8</div>
            <div className="text-xs text-slate-500 mt-1">IAs ao seu lado</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold text-white">24/7</div>
            <div className="text-xs text-slate-500 mt-1">Suporte IA</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold" style={{ color: gold }}>100%</div>
            <div className="text-xs text-slate-500 mt-1">Personalizado</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold text-white">∞</div>
            <div className="text-xs text-slate-500 mt-1">Potencial</div>
          </div>
        </div>

        <div className="pt-4">
          <Card glow className="inline-flex items-center gap-3 px-8 py-4">
            <Rocket className="w-5 h-5" style={{ color: gold }} />
            <span className="text-white font-display font-bold text-lg">Bora vender mais?</span>
            <ArrowRight className="w-5 h-5" style={{ color: gold }} />
          </Card>
        </div>
      </div>

      <div className="relative z-10">
        <BrandLogo variant="full" size="lg" className="opacity-60" />
      </div>
    </div>
  );
}
