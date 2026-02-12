import { useAuth } from '@/hooks/useAuth';
import { useMentorDashboardStats } from '@/hooks/useDashboardStats';
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
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { AIToolsAnalyticsCard } from '@/components/admin/AIToolsAnalyticsCard';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { stats, isLoading } = useMentorDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasData = stats.mentoradosCount > 0 || stats.trailsCount > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Mentor'}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {hasData 
              ? 'Aqui está o resumo da sua mentoria hoje.'
              : 'Sua mentoria está pronta para começar!'}
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
              {stats.activeMentoradosCount > 0 && (
                <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                  {stats.activeMentoradosCount} ativos
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="stat-value text-gradient-gold">{stats.mentoradosCount}</p>
              <p className="stat-label mt-1">Mentorados</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard size="sm">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
              {stats.engagementRate > 0 && (
                <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                  Engajamento
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="stat-value">{stats.engagementRate}%</p>
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
              <p className="stat-value">{stats.meetingsThisWeek}</p>
              <p className="stat-label mt-1">Encontros Esta Semana</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard size="sm">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              {stats.sosCount > 0 && (
                <span className="text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-1 rounded-full">
                  Urgente
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="stat-value text-amber-500">{stats.sosCount}</p>
              <p className="stat-label mt-1">SOS Pendentes</p>
            </div>
          </div>
        </BentoCard>

        {/* Quick Actions - Wide card */}
        <BentoCard size="wide" className="!p-0 overflow-hidden">
          <div className="h-full flex">
            <Link to="/mentor/jornada-cs" className="flex-1 p-6 group hover:bg-primary/5 transition-colors border-r border-border">
              <Target className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground text-lg">Gerenciar Jornada</h3>
              <p className="text-muted-foreground text-sm mt-1">Etapas e sucesso do cliente</p>
            </Link>
            <Link to="/mentor/mentorados" className="flex-1 p-6 group hover:bg-accent/5 transition-colors border-r border-border">
              <Users className="h-8 w-8 text-accent mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground text-lg">Ver Mentorados</h3>
              <p className="text-muted-foreground text-sm mt-1">Gestão e progresso</p>
            </Link>
            <Link to="/mentor/trilhas" className="flex-1 p-6 group hover:bg-emerald-500/5 transition-colors">
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
            <div className="flex-1 overflow-auto">
              {stats.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActivity.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      icon={getActivityIcon(activity.type)}
                      title={activity.title}
                      time={formatRelativeTime(activity.timestamp)}
                      color={getActivityColor(activity.type)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Activity className="h-10 w-10 text-muted-foreground/50" />}
                  title="Sem atividade recente"
                  description="As atividades dos mentorados aparecerão aqui"
                />
              )}
            </div>
          </div>
        </BentoCard>

        {/* Alerts & Insights */}
        <BentoCard size="lg" glow>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Alertas & Insights IA</h3>
            </div>
            <div className="flex-1 space-y-3 overflow-auto">
              {/* SOS Alerts */}
              {stats.sosDetails.length > 0 && stats.sosDetails.map((sos) => (
                <div key={sos.id} className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                          sos.priority === 'high' ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {sos.priority === 'high' ? 'Urgente' : 'Média'}
                        </span>
                      </div>
                      <p className="font-medium text-foreground text-sm truncate">{sos.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sos.mentoradoName} • {formatRelativeTime(sos.createdAt)}</p>
                    </div>
                    <Link to="/mentor/sos">
                      <Button size="sm" variant="destructive" className="text-xs shrink-0">
                        Atender
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              {/* At Risk */}
              {stats.atRiskDetails.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Users className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs font-semibold text-amber-500">
                          {stats.atRiskCount} mentorado{stats.atRiskCount > 1 ? 's' : ''} sem atividade
                        </span>
                      </div>
                      <div className="space-y-1">
                        {stats.atRiskDetails.slice(0, 3).map((m) => (
                          <p key={m.membershipId} className="text-xs text-muted-foreground">
                            <span className="text-foreground font-medium">{m.name}</span>
                            {' — '}
                            {m.daysSinceActivity >= 999 
                              ? 'Nunca acessou'
                              : `${m.daysSinceActivity}d sem atividade`}
                          </p>
                        ))}
                      </div>
                    </div>
                     <Link to="/mentor/mentorados">
                      <Button size="sm" variant="outline" className="text-xs shrink-0">
                        Ver
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Recent Wins */}
              {stats.recentWins.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Trophy className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-500">Conquistas Recentes</span>
                  </div>
                  <div className="space-y-1">
                    {stats.recentWins.slice(0, 3).map((win) => (
                      <p key={win.id} className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{win.mentoradoName}</span>
                        {' — '}{win.description}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state only if truly nothing */}
              {stats.sosDetails.length === 0 && stats.atRiskDetails.length === 0 && stats.recentWins.length === 0 && (
                <EmptyState
                  icon={<Sparkles className="h-10 w-10 text-muted-foreground/50" />}
                  title="Tudo em ordem!"
                  description="Não há alertas ou SOS pendentes"
                />
              )}
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
              {stats.topRanking.length > 0 && (
                <Link to="/mentor/ranking" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ver todos <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
            <div className="flex-1">
              {stats.topRanking.length > 0 ? (
                <div className="space-y-3">
                  {stats.topRanking.slice(0, 3).map((item) => (
                    <RankingItem 
                      key={item.mentoradoId}
                      position={item.position} 
                      name={item.name} 
                      points={item.points} 
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Trophy className="h-10 w-10 text-muted-foreground/50" />}
                  title="Ranking vazio"
                  description="Adicione mentorados para ver o ranking"
                  action={
                    <Link to="/admin/mentorados">
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </Link>
                  }
                />
              )}
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
                <h3 className="font-semibold text-foreground">Progresso nas Trilhas</h3>
              </div>
            </div>
            <div className="flex-1">
              {stats.trailProgress.length > 0 ? (
                <div className="space-y-4">
                  {stats.trailProgress.map((trail) => (
                    <TrailProgress key={trail.id} name={trail.name} progress={trail.progress} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<BookOpen className="h-10 w-10 text-muted-foreground/50" />}
                  title="Nenhuma trilha criada"
                  description="Crie trilhas para acompanhar o progresso"
                  action={
                    <Link to="/admin/trilhas">
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Criar Trilha
                      </Button>
                    </Link>
                  }
                />
              )}
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}

// Helper components
function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      {icon}
      <p className="font-medium text-muted-foreground mt-3">{title}</p>
      <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
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
      <span className="text-xl">{medals[position - 1] || `#${position}`}</span>
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

// Helpers for activity types
function getActivityIcon(type: string) {
  switch (type) {
    case 'trail_completed':
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    case 'prospection':
      return <Target className="h-4 w-4 text-accent" />;
    case 'ranking_up':
      return <Trophy className="h-4 w-4 text-primary" />;
    case 'trail_started':
      return <BookOpen className="h-4 w-4 text-purple-500" />;
    case 'meeting':
      return <Calendar className="h-4 w-4 text-cyan-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'trail_completed':
      return 'emerald';
    case 'prospection':
      return 'accent';
    case 'ranking_up':
      return 'primary';
    case 'trail_started':
      return 'purple';
    case 'meeting':
      return 'cyan';
    default:
      return 'muted';
  }
}

function formatRelativeTime(timestamp: string) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Agora';
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR');
}
