import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useMenteeDashboardStats } from '@/hooks/useDashboardStats';
import { useGamification } from '@/hooks/useGamification';
import { BentoGrid, BentoCard } from '@/components/BentoGrid';
import { BadgeCard } from '@/components/gamification/BadgeCard';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { DailyGoalCounter } from '@/components/gamification/DailyGoalCounter';
import { RecentActivityFeed } from '@/components/activity/RecentActivityFeed';
import { 
  BookOpen, Target, Calendar, TrendingUp, Award,
  ArrowUpRight, Play, Zap, Clock, Star, Loader2, Activity, FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { useGuidedTour, mentoradoDashboardSteps } from '@/hooks/useGuidedTour';
import { HelpCircle } from 'lucide-react';

export default function MemberDashboard() {
  const { profile, user } = useAuth();
  const { activeMembership, isImpersonating } = useTenant();
  const { isOpen: isTourOpen, startTour, completeTour, skipTour } = useGuidedTour(user?.id);

  // Fetch impersonated user's profile
  const { data: impersonatedProfile } = useQuery({
    queryKey: ['impersonated-dashboard-profile', activeMembership?.user_id],
    queryFn: async () => {
      if (!activeMembership?.user_id) return null;
      const { data } = await supabaseClient
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', activeMembership.user_id)
        .maybeSingle();
      return data;
    },
    enabled: isImpersonating && !!activeMembership?.user_id,
  });

  const displayName = isImpersonating && impersonatedProfile?.full_name
    ? impersonatedProfile.full_name
    : profile?.full_name;
  const { stats: dashboardStats, isLoading: isLoadingDashboard } = useMenteeDashboardStats();
  const { badges, stats: gamificationStats, isBadgeUnlocked, getBadgeUnlockDate, updateStreak, isLoading: isLoadingGamification, mentoradoId } = useGamification();
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => { updateStreak(); }, [updateStreak]);

  useEffect(() => {
    // training_analyses table doesn't exist yet — skip to avoid 400 errors
    setAvgScore(null);
    setTotalAnalyses(0);
    setIsLoadingStats(false);
  }, [user, activeMembership, mentoradoId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-primary";
    if (score >= 60) return "text-amber-500";
    return "text-destructive";
  };

  const formatMeetingDate = (dateStr: string) => {
    try { return format(new Date(dateStr), "EEEE, HH'h'", { locale: ptBR }); }
    catch { return dateStr; }
  };

  const isLoading = isLoadingDashboard || isLoadingGamification;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasTrailProgress = dashboardStats.trailProgress.length > 0;
  

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-lg">Bem-vindo de volta,</p>
           <h1 className="text-4xl font-display font-bold text-foreground mt-1">
            {displayName?.split(' ')[0] || 'Mentorado'} <span className="text-gradient-gold">🚀</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/mentorado/trilhas">
            <Button className="btn-premium px-6 py-5 text-base">
              <Play className="mr-2 h-5 w-5" />
              <span>{hasTrailProgress ? 'Continuar Trilha' : 'Iniciar Trilha'}</span>
            </Button>
          </Link>
          <Button variant="outline" size="icon" onClick={startTour} title="Tour guiado" className="h-12 w-12">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Daily Goal Counter */}
      {(mentoradoId || activeMembership?.id) && (
        <DailyGoalCounter mentoradoId={mentoradoId || activeMembership?.id || ""} />
      )}

      {/* Bento Grid */}
      <BentoGrid>
        {/* Main Progress Card */}
        <BentoCard size="xl" glow data-tour="trail-progress">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Sua Jornada</h2>
            </div>
            <div className="flex-1">
              {hasTrailProgress ? (
                <div className="space-y-5">
                  {dashboardStats.trailProgress.map((trail) => (
                    <TrailProgress key={trail.id} name={trail.name} progress={trail.progress} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={<BookOpen className="h-12 w-12 text-muted-foreground/50" />} title="Nenhuma trilha iniciada" description="Comece sua jornada de aprendizado agora"
                  action={<Link to="/mentorado/trilhas"><Button><Play className="h-4 w-4 mr-2" />Explorar Trilhas</Button></Link>} />
              )}
            </div>
            {hasTrailProgress && (
              <Link to="/mentorado/trilhas" className="mt-6"><Button variant="outline" className="w-full">Ver Todas as Trilhas<ArrowUpRight className="ml-2 h-4 w-4" /></Button></Link>
            )}
          </div>
        </BentoCard>

        {/* Stats Cards */}
        <Link to="/mentorado/meu-crm" className="contents" data-tour="prospections">
          <BentoCard size="sm" className="cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all" data-tour="prospections">
            <div className="flex flex-col justify-between h-full">
              <Target className="h-8 w-8 text-accent" />
              <div className="mt-auto">
                <p className="stat-value">{dashboardStats.monthlyProspections}</p>
                <p className="stat-label mt-1">Prospecções do Mês</p>
                <span className="text-xs text-muted-foreground mt-2 inline-block">{dashboardStats.totalPoints} pontos acumulados</span>
              </div>
            </div>
          </BentoCard>
        </Link>

        {/* Next Meeting */}
        <BentoCard size="md" data-tour="next-meeting">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-secondary" />
              <h3 className="font-semibold text-foreground">Próximo Encontro</h3>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4 rounded-xl bg-secondary/10 border border-secondary/20">
              {dashboardStats.nextMeeting ? (
                <><Clock className="h-10 w-10 text-secondary mb-3" />
                  <p className="text-2xl font-bold text-foreground capitalize">{formatMeetingDate(dashboardStats.nextMeeting.scheduledAt)}</p>
                  <p className="text-muted-foreground mt-1">{dashboardStats.nextMeeting.title}</p>
                  {dashboardStats.nextMeeting.meetingUrl && (
                    <a href={dashboardStats.nextMeeting.meetingUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="mt-4">Entrar na Reunião</Button></a>
                  )}
                </>
              ) : (
                <><Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">Nenhum encontro agendado</p><p className="text-xs text-muted-foreground/70 mt-1">Aguarde novos eventos do mentor</p></>
              )}
            </div>
          </div>
        </BentoCard>

        {/* Badges */}
        <BentoCard size="md" data-tour="badges">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /><h3 className="font-semibold text-foreground">Conquistas</h3></div>
              <span className="text-xs text-primary flex items-center gap-1"><Award className="h-3 w-3" />{gamificationStats?.totalPoints || 0} pts</span>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              {isLoadingGamification ? (
                <div className="col-span-3 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : badges.length > 0 ? (
                badges.slice(0, 6).map((badge) => (
                  <BadgeCard key={badge.id} name={badge.name} description={badge.description || ""} iconType={badge.icon_url} points={badge.points_required || 0} unlocked={isBadgeUnlocked(badge.id)} unlockedAt={getBadgeUnlockDate(badge.id)} size="sm" showPoints={false} />
                ))
              ) : (
                <div className="col-span-3 flex flex-col items-center justify-center text-center py-4"><Award className="h-8 w-8 text-muted-foreground/50 mb-2" /><p className="text-sm text-muted-foreground">Nenhuma conquista disponível</p></div>
              )}
            </div>
            
          </div>
        </BentoCard>

        {/* Quick Actions */}
        <BentoCard size="wide" className="!p-0" data-tour="quick-actions">
          <div className="h-full flex">
            <Link to="/mentorado/meu-crm" className="flex-1 p-6 group hover:bg-accent/5 transition-colors border-r border-border">
              <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Target className="h-6 w-6 text-accent" /></div>
              <h3 className="font-semibold text-foreground text-lg">Registrar Prospecção</h3>
              <p className="text-muted-foreground text-sm mt-1">Ganhe pontos no ranking</p>
            </Link>
            <Link to="/mentorado/ferramentas" className="flex-1 p-6 group hover:bg-primary/5 transition-colors border-r border-border">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><TrendingUp className="h-6 w-6 text-primary" /></div>
              <h3 className="font-semibold text-foreground text-lg">Ferramentas IA</h3>
              <p className="text-muted-foreground text-sm mt-1">IA analisa sua performance</p>
            </Link>
            <Link to="/mentorado/meus-arquivos" className="flex-1 p-6 group hover:bg-primary/5 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><FolderOpen className="h-6 w-6 text-primary" /></div>
              <h3 className="font-semibold text-foreground text-lg">Meus Arquivos</h3>
              <p className="text-muted-foreground text-sm mt-1">Acesse seus documentos</p>
            </Link>
          </div>
        </BentoCard>

        {/* Weekly Performance */}
        <BentoCard size="sm" glow data-tour="ai-score">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3"><Zap className="h-5 w-5 text-primary" /><h3 className="font-semibold text-foreground text-sm">Nota Média IA</h3></div>
            <div className="flex-1 flex items-center justify-center">
              {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : avgScore !== null ? (
                <div className="text-center"><p className={`stat-value ${getScoreColor(avgScore)}`}>{avgScore}</p><p className="text-xs text-muted-foreground mt-1">{totalAnalyses} análise{totalAnalyses !== 1 ? 's' : ''} de treinamento</p></div>
              ) : (
                <Link to="/mentorado/ferramentas" className="text-center"><p className="text-muted-foreground text-sm">Nenhuma análise</p><p className="text-xs text-primary mt-1 hover:underline">Usar ferramentas IA →</p></Link>
              )}
            </div>
          </div>
        </BentoCard>

        {/* Streak */}
        <BentoCard size="sm">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3"><Star className="h-5 w-5 text-amber-500" /><h3 className="font-semibold text-foreground text-sm">Sequência</h3></div>
            <div className="flex-1 flex items-center justify-center"><StreakCounter days={gamificationStats?.streakDays || 0} size="md" /></div>
          </div>
        </BentoCard>

        {/* Recent Activity */}
        <BentoCard size="md">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4"><Activity className="h-5 w-5 text-primary" /><h3 className="font-semibold text-foreground">Atividade Recente</h3></div>
            <div className="flex-1 overflow-y-auto"><RecentActivityFeed membershipId={activeMembership?.id || undefined} limit={5} /></div>
          </div>
        </BentoCard>
      </BentoGrid>

      {/* Guided Tour */}
      <GuidedTour
        steps={mentoradoDashboardSteps}
        isOpen={isTourOpen}
        onComplete={completeTour}
        onSkip={skipTour}
      />
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode; }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      {icon}
      <p className="font-medium text-muted-foreground mt-3">{title}</p>
      <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function TrailProgress({ name, progress }: { name: string; progress: number; }) {
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
