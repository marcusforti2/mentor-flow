import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Brain, Zap, TrendingUp, Users, Sparkles, ArrowUpRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';

interface ToolUsageStat {
  tool_type: string;
  uses: number;
  percentage: number;
}

interface TopUser {
  name: string;
  uses: number;
}

interface AnalyticsData {
  totalUsesToday: number;
  totalUsesWeek: number;
  toolStats: ToolUsageStat[];
  topUsers: TopUser[];
  trend: number;
}

const TOOL_LABELS: Record<string, string> = {
  'lead-qualifier': 'Qualificador de Leads',
  'cold-message': 'Cold Messages',
  'bio-generator': 'Gerador de Bio',
  'script-generator': 'Scripts de Venda',
  'objection-simulator': 'Simulador de Objeções',
  'proposal-creator': 'Criador de Propostas',
  'training-analyzer': 'Análise de Treinamento',
  'virtual-mentor': 'Mentor Virtual',
};

const TOOL_COLORS: Record<string, string> = {
  'lead-qualifier': 'text-emerald-500',
  'cold-message': 'text-accent',
  'bio-generator': 'text-purple-500',
  'script-generator': 'text-cyan-500',
  'objection-simulator': 'text-amber-500',
  'proposal-creator': 'text-primary',
  'training-analyzer': 'text-rose-500',
  'virtual-mentor': 'text-indigo-500',
};

export function AIToolsAnalyticsCard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mentorId, setMentorId] = useState<string | null>(null);

  // Get mentor ID from user
  useEffect(() => {
    const fetchMentorId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setMentorId(data?.id || null);
    };
    fetchMentorId();
  }, [user]);

  useEffect(() => {
    if (!mentorId) return;
    
    const fetchAnalytics = async () => {
      try {
        // Get today's usage
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const lastWeekStart = new Date();
        lastWeekStart.setDate(lastWeekStart.getDate() - 14);

        // Query usage for mentorados of this mentor
        const { data: mentoradoIds } = await supabase
          .from('mentorados')
          .select('id')
          .eq('mentor_id', mentorId);

        if (!mentoradoIds || mentoradoIds.length === 0) {
          setAnalytics({
            totalUsesToday: 0,
            totalUsesWeek: 0,
            toolStats: [],
            topUsers: [],
            trend: 0
          });
          setLoading(false);
          return;
        }

        const ids = mentoradoIds.map(m => m.id);

        // Today's usage
        const { count: todayCount } = await supabase
          .from('ai_tool_usage')
          .select('*', { count: 'exact', head: true })
          .in('mentorado_id', ids)
          .gte('created_at', todayStart.toISOString());

        // This week's usage
        const { count: weekCount } = await supabase
          .from('ai_tool_usage')
          .select('*', { count: 'exact', head: true })
          .in('mentorado_id', ids)
          .gte('created_at', weekStart.toISOString());

        // Last week's usage (for trend)
        const { count: lastWeekCount } = await supabase
          .from('ai_tool_usage')
          .select('*', { count: 'exact', head: true })
          .in('mentorado_id', ids)
          .gte('created_at', lastWeekStart.toISOString())
          .lt('created_at', weekStart.toISOString());

        // Tool breakdown this week
        const { data: toolBreakdown } = await supabase
          .from('ai_tool_usage')
          .select('tool_type')
          .in('mentorado_id', ids)
          .gte('created_at', weekStart.toISOString());

        // Count by tool type
        const toolCounts: Record<string, number> = {};
        toolBreakdown?.forEach(item => {
          toolCounts[item.tool_type] = (toolCounts[item.tool_type] || 0) + 1;
        });

        const totalTools = Object.values(toolCounts).reduce((a, b) => a + b, 0);
        const toolStats: ToolUsageStat[] = Object.entries(toolCounts)
          .map(([tool_type, uses]) => ({
            tool_type,
            uses,
            percentage: totalTools > 0 ? Math.round((uses / totalTools) * 100) : 0
          }))
          .sort((a, b) => b.uses - a.uses)
          .slice(0, 4);

        // Top users this week
        const { data: userUsage } = await supabase
          .from('ai_tool_usage')
          .select(`
            mentorado_id,
            mentorados!inner(
              user_id,
              profiles:user_id(full_name)
            )
          `)
          .in('mentorado_id', ids)
          .gte('created_at', weekStart.toISOString());

        const userCounts: Record<string, { name: string; uses: number }> = {};
        userUsage?.forEach(item => {
          const mentorado = item.mentorados as any;
          const name = mentorado?.profiles?.full_name || 'Sem nome';
          const id = item.mentorado_id;
          if (!userCounts[id]) {
            userCounts[id] = { name, uses: 0 };
          }
          userCounts[id].uses++;
        });

        const topUsers = Object.values(userCounts)
          .sort((a, b) => b.uses - a.uses)
          .slice(0, 3);

        // Calculate trend
        const trend = lastWeekCount && lastWeekCount > 0
          ? Math.round(((weekCount || 0) - lastWeekCount) / lastWeekCount * 100)
          : weekCount && weekCount > 0 ? 100 : 0;

        setAnalytics({
          totalUsesToday: todayCount || 0,
          totalUsesWeek: weekCount || 0,
          toolStats,
          topUsers,
          trend
        });
      } catch (error) {
        console.error('Error fetching AI analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [mentorId]);

  if (loading) {
    return (
      <div className="flex flex-col h-full animate-pulse">
        <div className="h-6 w-48 bg-muted/50 rounded mb-4" />
        <div className="flex-1 space-y-3">
          <div className="h-16 bg-muted/30 rounded-xl" />
          <div className="h-16 bg-muted/30 rounded-xl" />
        </div>
      </div>
    );
  }

  const hasData = analytics && analytics.totalUsesWeek > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Arsenal IA</h3>
            <p className="text-xs text-muted-foreground">Uso das ferramentas</p>
          </div>
        </div>
        {hasData && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            analytics.trend >= 0 
              ? 'text-emerald-500 bg-emerald-500/10' 
              : 'text-rose-500 bg-rose-500/10'
          }`}>
            <TrendingUp className={`h-3 w-3 ${analytics.trend < 0 ? 'rotate-180' : ''}`} />
            {analytics.trend >= 0 ? '+' : ''}{analytics.trend}% semanal
          </div>
        )}
      </div>

      {hasData ? (
        <div className="flex-1 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Hoje</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{analytics.totalUsesToday}</p>
            </div>
            <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">Semana</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{analytics.totalUsesWeek}</p>
            </div>
          </div>

          {/* Tool Breakdown */}
          {analytics.toolStats.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ferramentas mais usadas
              </p>
              <div className="space-y-2">
                {analytics.toolStats.map((tool) => (
                  <div key={tool.tool_type} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={`font-medium ${TOOL_COLORS[tool.tool_type] || 'text-foreground'}`}>
                        {TOOL_LABELS[tool.tool_type] || tool.tool_type}
                      </span>
                      <span className="text-muted-foreground">{tool.uses}x</span>
                    </div>
                    <Progress value={tool.percentage} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Users */}
          {analytics.topUsers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Mais engajados
              </p>
              <div className="space-y-1.5">
                {analytics.topUsers.map((user, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">#{i + 1}</span>
                      <span className="text-sm text-foreground truncate max-w-[120px]">
                        {user.name}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {user.uses} usos
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
            <Brain className="h-8 w-8 text-primary/50" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            Nenhum uso registrado
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Quando seus mentorados usarem o Arsenal IA, você verá as métricas aqui.
          </p>
          <Link 
            to="/admin/mentorados" 
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Ver mentorados <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
