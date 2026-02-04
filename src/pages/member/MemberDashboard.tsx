import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/hooks/useGamification';
import { BentoGrid, BentoCard } from '@/components/BentoGrid';
import { BadgeCard } from '@/components/gamification/BadgeCard';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { DailyGoalCounter } from '@/components/gamification/DailyGoalCounter';
import { 
  BookOpen, 
  Target, 
  Trophy,
  Calendar,
  TrendingUp,
  Award,
  ArrowUpRight,
  Play,
  Zap,
  Clock,
  Star,
  Loader2,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function MemberDashboard() {
  const { profile, user, isMentor } = useAuth();
  const { badges, stats, isBadgeUnlocked, getBadgeUnlockDate, updateStreak, isLoading: isLoadingGamification, mentoradoId } = useGamification();
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Update streak on mount
  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || isMentor) return; // Skip for mentors
      
      try {
        // Get mentorado ID (or auto-link if missing)
        let mentoradoId: string | null = null;

        const { data: mentorado, error: mentoradoError } = await supabase
          .from("mentorados")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (mentorado?.id) {
          mentoradoId = mentorado.id;
        } else {
          if (mentoradoError) {
            console.warn("Mentorado fetch error:", mentoradoError);
          }
          const { data: ensured, error: ensureError } = await supabase.functions.invoke(
            "ensure-mentorado",
            { body: {} }
          );
          if (!ensureError && ensured?.mentorado_id) {
            mentoradoId = ensured.mentorado_id;
          }
        }

        if (!mentoradoId) {
          setIsLoadingStats(false);
          return;
        }
        
        // Get training analyses stats
        const { data: analyses } = await supabase
          .from("training_analyses")
          .select("nota_geral")
          .eq("mentorado_id", mentoradoId);
        
        if (analyses && analyses.length > 0) {
          const avg = Math.round(
            analyses.reduce((acc, a) => acc + (a.nota_geral || 0), 0) / analyses.length
          );
          setAvgScore(avg);
          setTotalAnalyses(analyses.length);
        } else {
          setAvgScore(null);
          setTotalAnalyses(0);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    fetchStats();
  }, [user, isMentor]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-lg">Bem-vindo de volta,</p>
          <h1 className="text-4xl font-display font-bold text-foreground mt-1">
            {profile?.full_name?.split(' ')[0] || 'Mentorado'} <span className="text-gradient-gold">🚀</span>
          </h1>
        </div>
        <Link to="/app/trilhas">
          <Button className="btn-premium px-6 py-5 text-base">
            <Play className="mr-2 h-5 w-5" />
            <span>Continuar Trilha</span>
          </Button>
        </Link>
      </div>

      {/* Daily Goal Counter - works with mentoradoId or user.id fallback */}
      {(mentoradoId || user?.id) && (
        <DailyGoalCounter mentoradoId={mentoradoId || user?.id || ""} />
      )}

      {/* Bento Grid */}
      <BentoGrid>
        {/* Main Progress Card - Wide */}
        <BentoCard size="xl" glow>
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Sua Jornada</h2>
            </div>
            <div className="flex-1 space-y-5">
              <TrailProgress name="Prospecção Avançada" progress={85} color="primary" />
              <TrailProgress name="Fechamento de Vendas" progress={60} color="accent" />
              <TrailProgress name="Mindset de Alta Performance" progress={40} color="emerald" />
              <TrailProgress name="Comunicação Persuasiva" progress={20} color="purple" />
            </div>
            <Link to="/app/trilhas" className="mt-6">
              <Button variant="outline" className="w-full">
                Ver Todas as Trilhas
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </BentoCard>

        {/* Stats Cards */}
        <BentoCard size="sm">
          <div className="flex flex-col justify-between h-full">
            <Trophy className="h-8 w-8 text-primary" />
            <div className="mt-auto">
              <p className="stat-value text-gradient-gold">#7</p>
              <p className="stat-label mt-1">Posição no Ranking</p>
              <span className="text-xs text-emerald-500 font-medium mt-2 inline-block">
                +2 posições esta semana
              </span>
            </div>
          </div>
        </BentoCard>

        <BentoCard size="sm">
          <div className="flex flex-col justify-between h-full">
            <Target className="h-8 w-8 text-accent" />
            <div className="mt-auto">
              <p className="stat-value">23</p>
              <p className="stat-label mt-1">Prospecções do Mês</p>
              <span className="text-xs text-muted-foreground mt-2 inline-block">
                230 pontos acumulados
              </span>
            </div>
          </div>
        </BentoCard>

        {/* Next Meeting */}
        <BentoCard size="md">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-cyan-500" />
              <h3 className="font-semibold text-foreground">Próximo Encontro</h3>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Clock className="h-10 w-10 text-cyan-500 mb-3" />
              <p className="text-2xl font-bold text-foreground">Quarta, 14h</p>
              <p className="text-muted-foreground mt-1">Mentoria em Grupo</p>
              <Button variant="outline" size="sm" className="mt-4">
                Confirmar Presença
              </Button>
            </div>
          </div>
        </BentoCard>

        {/* Badges */}
        <BentoCard size="md">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Conquistas</h3>
              </div>
              <Link to="/app/loja" className="text-xs text-primary hover:underline flex items-center gap-1">
                <Gift className="h-3 w-3" />
                {stats?.totalPoints || 0} pts
              </Link>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              {isLoadingGamification ? (
                <div className="col-span-3 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                badges.slice(0, 6).map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    name={badge.name}
                    description={badge.description || ""}
                    iconType={badge.icon_url}
                    points={badge.points_required || 0}
                    unlocked={isBadgeUnlocked(badge.id)}
                    unlockedAt={getBadgeUnlockDate(badge.id)}
                    size="sm"
                    showPoints={false}
                  />
                ))
              )}
            </div>
            <Link to="/app/loja" className="mt-3">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Ver Todas as Conquistas
              </Button>
            </Link>
          </div>
        </BentoCard>

        {/* Quick Actions - Wide */}
        <BentoCard size="wide" className="!p-0">
          <div className="h-full flex">
            <Link to="/app/meu-crm" className="flex-1 p-6 group hover:bg-accent/5 transition-colors border-r border-border">
              <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">Registrar Prospecção</h3>
              <p className="text-muted-foreground text-sm mt-1">Ganhe pontos no ranking</p>
            </Link>
            <Link to="/app/ferramentas" className="flex-1 p-6 group hover:bg-emerald-500/5 transition-colors border-r border-border">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">Ferramentas IA</h3>
              <p className="text-muted-foreground text-sm mt-1">IA analisa sua performance</p>
            </Link>
            <Link to="/app/ranking" className="flex-1 p-6 group hover:bg-primary/5 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">Ver Ranking</h3>
              <p className="text-muted-foreground text-sm mt-1">Sua posição: #7</p>
            </Link>
          </div>
        </BentoCard>

        {/* Weekly Performance */}
        <BentoCard size="sm" glow>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Nota Média IA</h3>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {isLoadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : avgScore !== null ? (
                <div className="text-center">
                  <p className={`stat-value ${getScoreColor(avgScore)}`}>{avgScore}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalAnalyses} análise{totalAnalyses !== 1 ? 's' : ''} de treinamento</p>
                </div>
              ) : (
                <Link to="/app/ferramentas" className="text-center">
                  <p className="text-muted-foreground text-sm">Nenhuma análise</p>
                  <p className="text-xs text-primary mt-1 hover:underline">Usar ferramentas IA →</p>
                </Link>
              )}
            </div>
          </div>
        </BentoCard>

        {/* Streak */}
        <BentoCard size="sm">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-foreground text-sm">Sequência</h3>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <StreakCounter 
                days={stats?.streakDays || 0} 
                size="md"
              />
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}

function TrailProgress({ 
  name, 
  progress, 
  color 
}: { 
  name: string; 
  progress: number; 
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-foreground font-medium">{name}</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r from-${color} to-${color}/60 transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
