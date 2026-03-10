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
  ChevronLeft, ChevronRight, CheckCircle2, ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MenteeWelcomeTour } from '@/components/onboarding/MenteeWelcomeTour';

export default function MemberDashboard() {
  const { profile, user } = useAuth();
  const { activeMembership, isImpersonating } = useTenant();
  

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
        <Link to="/mentorado/trilhas">
          <Button className="btn-premium px-6 py-5 text-base">
            <Play className="mr-2 h-5 w-5" />
            <span>{hasTrailProgress ? 'Continuar Trilha' : 'Iniciar Trilha'}</span>
          </Button>
        </Link>
      </div>

      {/* Daily Goal Counter */}
      {(mentoradoId || activeMembership?.id) && (
        <DailyGoalCounter mentoradoId={mentoradoId || activeMembership?.id || ""} />
      )}

      {/* KPI Row - 4 compact cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<Target className="h-5 w-5 text-accent" />}
          value={dashboardStats.monthlyProspections}
          label="Prospecções"
          sub="este mês"
          href="/mentorado/meu-crm"
        />
        <KpiCard
          icon={<ListChecks className="h-5 w-5 text-secondary" />}
          value={dashboardStats.totalPoints}
          label="Pontos"
          sub="acumulados"
          href="/mentorado/tarefas"
        />
        <KpiCard
          icon={<Zap className="h-5 w-5 text-primary" />}
          value={avgScore !== null ? avgScore : '—'}
          label="Nota IA"
          sub={totalAnalyses > 0 ? `${totalAnalyses} análise${totalAnalyses !== 1 ? 's' : ''}` : 'sem análises'}
          href="/mentorado/ferramentas"
        />
        <KpiCard
          icon={<Star className="h-5 w-5 text-amber-500" />}
          value={gamificationStats?.streakDays || 0}
          label="Sequência"
          sub="dias seguidos"
        />
      </div>

      {/* Main content grid */}
      <BentoGrid>
        {/* Trail Mini-Carousel */}
        <BentoCard size="wide" data-tour="trail-progress">
          <TrailCarouselSection trails={dashboardStats.trailProgress} />
        </BentoCard>

        {/* Next Meeting */}
        <BentoCard size="sm" data-tour="next-meeting">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-secondary" />
              <h3 className="font-semibold text-foreground text-sm">Próximo Encontro</h3>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center text-center p-3 rounded-xl bg-secondary/10 border border-secondary/20">
              {dashboardStats.nextMeeting ? (
                <>
                  <Clock className="h-8 w-8 text-secondary mb-2" />
                  <p className="text-lg font-bold text-foreground capitalize">{formatMeetingDate(dashboardStats.nextMeeting.scheduledAt)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{dashboardStats.nextMeeting.title}</p>
                  {dashboardStats.nextMeeting.meetingUrl && (
                    <a href={dashboardStats.nextMeeting.meetingUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="mt-3">Entrar</Button>
                    </a>
                  )}
                </>
              ) : (
                <>
                  <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum encontro</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Aguarde o mentor</p>
                </>
              )}
            </div>
          </div>
        </BentoCard>

        {/* Quick Actions */}
        <BentoCard size="md" className="!p-0" data-tour="quick-actions">
          <div className="h-full grid grid-cols-1 divide-y divide-border">
            <Link to="/mentorado/meu-crm" className="p-4 group hover:bg-accent/5 transition-colors flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Target className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">Registrar Prospecção</h3>
                <p className="text-muted-foreground text-xs">Ganhe pontos no ranking</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
            </Link>
            <Link to="/mentorado/ferramentas" className="p-4 group hover:bg-primary/5 transition-colors flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">Ferramentas IA</h3>
                <p className="text-muted-foreground text-xs">Analise sua performance</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
            </Link>
            <Link to="/mentorado/meus-arquivos" className="p-4 group hover:bg-primary/5 transition-colors flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">Meus Arquivos</h3>
                <p className="text-muted-foreground text-xs">Documentos e reuniões</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
            </Link>
          </div>
        </BentoCard>

        {/* Badges */}
        <BentoCard size="sm" data-tour="badges">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Conquistas</h3>
              </div>
              <span className="text-xs text-primary">{gamificationStats?.totalPoints || 0} pts</span>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              {isLoadingGamification ? (
                <div className="col-span-3 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : badges.length > 0 ? (
                badges.slice(0, 6).map((badge) => (
                  <BadgeCard key={badge.id} name={badge.name} description={badge.description || ""} iconType={badge.icon_url} points={badge.points_required || 0} unlocked={isBadgeUnlocked(badge.id)} unlockedAt={getBadgeUnlockDate(badge.id)} size="sm" showPoints={false} />
                ))
              ) : (
                <div className="col-span-3 flex flex-col items-center justify-center text-center py-4">
                  <Award className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma conquista</p>
                </div>
              )}
            </div>
          </div>
        </BentoCard>

        {/* Recent Activity */}
        <BentoCard size="md">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Atividade Recente</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <RecentActivityFeed membershipId={activeMembership?.id || undefined} limit={5} />
            </div>
          </div>
        </BentoCard>
      </BentoGrid>

    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({ icon, value, label, sub, href }: { 
  icon: React.ReactNode; value: string | number; label: string; sub: string; href?: string;
}) {
  const content = (
    <div className={cn(
      "glass-card rounded-xl p-4 flex items-center gap-3 h-full transition-all",
      href && "cursor-pointer hover:ring-2 hover:ring-accent/30"
    )}>
      <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        <p className="text-[10px] text-muted-foreground/70">{sub}</p>
      </div>
    </div>
  );
  if (href) return <Link to={href}>{content}</Link>;
  return content;
}

/* ── Trail Mini-Carousel ── */
function TrailCarouselSection({ trails }: { trails: { id: string; name: string; progress: number }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => { checkScroll(); }, [trails, checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  if (trails.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Trilhas de Aprendizado</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma trilha iniciada</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Explore as trilhas disponíveis</p>
          <Link to="/mentorado/trilhas" className="mt-4">
            <Button size="sm"><Play className="h-4 w-4 mr-2" />Explorar Trilhas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Trilhas em Andamento</h3>
        </div>
        <div className="flex items-center gap-1">
          {canScrollLeft && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scroll('left')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {canScrollRight && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scroll('right')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          <Link to="/mentorado/trilhas">
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
              Ver todas <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
      >
        {trails.map((trail) => (
          <Link key={trail.id} to="/mentorado/trilhas" className="shrink-0 w-[240px]">
            <div className={cn(
              "rounded-xl border p-4 h-full transition-all hover:ring-2 hover:ring-primary/30",
              trail.progress >= 100
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border/50 bg-muted/30"
            )}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground truncate pr-2">{trail.name}</span>
                {trail.progress >= 100 && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
              </div>
              <Progress value={trail.progress} className="h-1.5 mb-2" />
              <p className="text-xs text-muted-foreground">{trail.progress}% concluído</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
