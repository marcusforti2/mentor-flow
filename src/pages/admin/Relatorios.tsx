import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMentorReports } from "@/hooks/useMentorReports";
import { MenteeRanking } from "@/components/admin/MenteeRanking";
import { PerformanceChart } from "@/components/admin/PerformanceChart";
import { MonthlyComparisonChart } from "@/components/admin/MonthlyComparisonChart";
import { MenteeReportSheet } from "@/components/admin/MenteeReportSheet";
import { ReportPeriodFilter, getDefaultPeriod, type PeriodRange } from "@/components/admin/ReportPeriodFilter";
import type { MenteeScore } from "@/components/admin/MenteeScoreCard";
import {
  Users,
  Target,
  Activity,
  TrendingUp,
  PieChart,
  BarChart3,
  Download,
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', '#f59e0b', '#10b981', '#6366f1'];

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  contato: 'Em Contato',
  qualificado: 'Qualificado',
  proposta: 'Proposta',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

function exportCSV(menteeScores: MenteeScore[], stats: any) {
  const header = 'Nome,Score,Leads,Tarefas Concluídas,Trilhas (%),Atividades,Última Atividade\n';
  const rows = menteeScores
    .sort((a, b) => b.score - a.score)
    .map(m => `"${m.name}",${m.score.toFixed(0)},${m.leadsCount},${m.tasksCompleted},${m.trailsProgress},${m.activitiesCount},"${m.lastActivityAt || 'N/A'}"`)
    .join('\n');

  const summary = `\n\nResumo\nTotal Mentorados,${stats?.totalMentorados || 0}\nMentorados Ativos,${stats?.activeMentorados || 0}\nTotal Leads,${stats?.totalLeads || 0}\nTaxa Conclusão,${(stats?.trailCompletionRate || 0).toFixed(1)}%\n`;

  const blob = new Blob([header + rows + summary], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-mentorados-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const [period, setPeriod] = useState<PeriodRange>(getDefaultPeriod());
  const [selectedMentee, setSelectedMentee] = useState<MenteeScore | null>(null);

  const {
    stats,
    statsLoading,
    leadsByStatus,
    leadsByStatusLoading,
    menteeScores,
    menteeScoresLoading,
    weeklyEvolution,
    weeklyEvolutionLoading,
    monthlyComparison,
    monthlyComparisonLoading,
  } = useMentorReports(period);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Visão consolidada do desempenho dos seus mentorados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => exportCSV(menteeScores, stats)}
            disabled={menteeScoresLoading}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <ReportPeriodFilter value={period} onChange={setPeriod} />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mentorados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalMentorados || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.activeMentorados || 0} ativos
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.leadsThisMonth || 0} este mês
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalActivities || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.activitiesThisWeek || 0} esta semana
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.trailCompletionRate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Média: {stats?.avgLeadsPerMentorado?.toFixed(1) || 0} leads/aluno
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Evolution Chart */}
      <PerformanceChart data={weeklyEvolution} isLoading={weeklyEvolutionLoading} />

      {/* Monthly Comparison */}
      <MonthlyComparisonChart data={monthlyComparison} isLoading={monthlyComparisonLoading} />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leads by Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-5 w-5" />
              Leads por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByStatusLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : leadsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Nenhum lead encontrado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={leadsByStatus.map(l => ({
                      ...l,
                      name: STATUS_LABELS[l.status] || l.status,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {leadsByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Score summary card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              Distribuição de Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {menteeScoresLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : menteeScores.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Nenhum mentorado encontrado
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Excelente (80+)', min: 80, max: 101, color: 'bg-emerald-500' },
                  { label: 'Bom (60-79)', min: 60, max: 80, color: 'bg-primary' },
                  { label: 'Regular (40-59)', min: 40, max: 60, color: 'bg-accent' },
                  { label: 'Atenção (0-39)', min: 0, max: 40, color: 'bg-destructive' },
                ].map(tier => {
                  const count = menteeScores.filter(m => m.score >= tier.min && m.score < tier.max).length;
                  const pct = menteeScores.length > 0 ? (count / menteeScores.length) * 100 : 0;
                  return (
                    <div key={tier.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{tier.label}</span>
                        <Badge variant="secondary" className="font-mono text-xs">{count}</Badge>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${tier.color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 text-center text-xs text-muted-foreground">
                  Score médio: <span className="font-bold text-foreground">
                    {(menteeScores.reduce((sum, m) => sum + m.score, 0) / menteeScores.length).toFixed(0)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mentee Ranking */}
      <MenteeRanking
        mentees={menteeScores}
        isLoading={menteeScoresLoading}
        onMenteeClick={(mentee) => setSelectedMentee(mentee)}
      />

      {/* Individual Report Sheet */}
      <MenteeReportSheet
        mentee={selectedMentee}
        open={!!selectedMentee}
        onOpenChange={(open) => { if (!open) setSelectedMentee(null); }}
      />
    </div>
  );
}
