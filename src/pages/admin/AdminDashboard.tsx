import { useAuth } from '@/hooks/useAuth';
import { BentoGrid, BentoCard } from '@/components/BentoGrid';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  Target,
  Trophy,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { AIToolsAnalyticsCard } from '@/components/admin/AIToolsAnalyticsCard';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const [mentoradosCount, setMentoradosCount] = useState(0);
  const [sosCount, setSosCount] = useState(0);
  
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      // Get mentor id
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!mentorData) return;
      
      // Count mentorados
      const { count: mentoradosTotal } = await supabase
        .from('mentorados')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentorData.id)
        .eq('status', 'active');
      
      setMentoradosCount(mentoradosTotal || 0);
      
      // Count pending SOS
      const { count: sosTotal } = await supabase
        .from('sos_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);
      
      setSosCount(sosTotal || 0);
    };
    
    fetchStats();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Mentor'}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Aqui está o resumo da sua mentoria hoje.
          </p>
        </div>
        <div className="glass-card px-4 py-2 rounded-full flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">Todos os sistemas operacionais</span>
        </div>
      </div>

      {/* Bento Grid */}
      <BentoGrid>
        {/* Stats Row */}
        <BentoCard size="sm" glow>
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <Users className="h-6 w-6 text-primary" />
              <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                +3 este mês
              </span>
            </div>
            <div className="mt-4">
              <p className="stat-value text-gradient-gold">{mentoradosCount}</p>
              <p className="stat-label mt-1">Mentorados Ativos</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard size="sm">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
              <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                +5%
              </span>
            </div>
            <div className="mt-4">
              <p className="stat-value">87%</p>
              <p className="stat-label mt-1">Taxa de Engajamento</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard size="sm">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <Calendar className="h-6 w-6 text-accent" />
            </div>
            <div className="mt-4">
              <p className="stat-value">4</p>
              <p className="stat-label mt-1">Encontros Esta Semana</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard size="sm">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              {sosCount > 0 && (
                <span className="text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-1 rounded-full">
                  Urgente
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="stat-value text-amber-500">{sosCount}</p>
              <p className="stat-label mt-1">SOS Pendentes</p>
            </div>
          </div>
        </BentoCard>

        {/* Quick Actions - Wide card */}
        <BentoCard size="wide" className="!p-0 overflow-hidden">
          <div className="h-full flex">
            <Link to="/admin/jornada-cs" className="flex-1 p-6 group hover:bg-primary/5 transition-colors border-r border-border">
              <Target className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground text-lg">Gerenciar Jornada</h3>
              <p className="text-muted-foreground text-sm mt-1">Etapas e sucesso do cliente</p>
            </Link>
            <Link to="/admin/mentorados" className="flex-1 p-6 group hover:bg-accent/5 transition-colors border-r border-border">
              <Users className="h-8 w-8 text-accent mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground text-lg">Ver Mentorados</h3>
              <p className="text-muted-foreground text-sm mt-1">Gestão e progresso</p>
            </Link>
            <Link to="/admin/trilhas" className="flex-1 p-6 group hover:bg-emerald-500/5 transition-colors">
              <BookOpen className="h-8 w-8 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground text-lg">Criar Trilha</h3>
              <p className="text-muted-foreground text-sm mt-1">Novos conteúdos</p>
            </Link>
          </div>
        </BentoCard>

        {/* Activity Feed - Tall card */}
        <BentoCard size="tall">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Atividade Recente</h3>
            </div>
            <div className="flex-1 space-y-3 overflow-auto">
              <ActivityItem
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                title="João completou Trilha de Prospecção"
                time="2h atrás"
                color="emerald"
              />
              <ActivityItem
                icon={<Target className="h-4 w-4 text-accent" />}
                title="Maria registrou 5 novas prospecções"
                time="4h atrás"
                color="accent"
              />
              <ActivityItem
                icon={<Trophy className="h-4 w-4 text-primary" />}
                title="Pedro subiu para #3 no ranking"
                time="6h atrás"
                color="primary"
              />
              <ActivityItem
                icon={<BookOpen className="h-4 w-4 text-purple-500" />}
                title="Ana iniciou nova trilha"
                time="8h atrás"
                color="purple"
              />
              <ActivityItem
                icon={<Calendar className="h-4 w-4 text-cyan-500" />}
                title="Encontro de grupo confirmado"
                time="1d atrás"
                color="cyan"
              />
            </div>
          </div>
        </BentoCard>

        {/* Alerts */}
        <BentoCard size="lg" glow>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Alertas & Insights IA</h3>
            </div>
            <div className="flex-1 space-y-3">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">Carlos não acessa há 7 dias</p>
                    <p className="text-sm text-muted-foreground mt-1">Último acesso: 24/01/2026</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0">
                    Contatar
                  </Button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">Ana solicitou SOS urgente</p>
                    <p className="text-sm text-muted-foreground mt-1">Há 30 minutos</p>
                  </div>
                  <Button size="sm" variant="destructive" className="shrink-0">
                    Atender
                  </Button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">3 mentorados próximos de concluir trilha</p>
                    <p className="text-sm text-muted-foreground mt-1">Considere parabenizá-los</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0">
                    Ver
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Ranking Preview */}
        <BentoCard size="md">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Top Ranking</h3>
              </div>
              <Link to="/admin/ranking" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex-1 space-y-3">
              <RankingItem position={1} name="Maria Silva" points={450} />
              <RankingItem position={2} name="João Santos" points={380} />
              <RankingItem position={3} name="Pedro Costa" points={320} />
            </div>
          </div>
        </BentoCard>

        {/* AI Tools Analytics */}
        <BentoCard size="md" glow>
          <AIToolsAnalyticsCard />
        </BentoCard>

        {/* Trail Progress */}
        <BentoCard size="md">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold text-foreground">Progresso Geral</h3>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <TrailProgress name="Prospecção Avançada" progress={78} />
              <TrailProgress name="Fechamento de Vendas" progress={65} />
              <TrailProgress name="Mindset de Alta Performance" progress={52} />
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}

function ActivityItem({ 
  icon, 
  title, 
  time, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  time: string; 
  color: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-${color}-500/5 border border-${color}-500/10`}>
      <div className={`h-8 w-8 rounded-lg bg-${color}-500/20 flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

function RankingItem({ position, name, points }: { position: number; name: string; points: number }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
      <span className="text-xl">{medals[position - 1]}</span>
      <div className="flex-1">
        <p className="font-medium text-foreground text-sm">{name}</p>
      </div>
      <span className="text-sm font-semibold text-primary">{points} pts</span>
    </div>
  );
}

function TrailProgress({ name, progress }: { name: string; progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-foreground font-medium">{name}</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
