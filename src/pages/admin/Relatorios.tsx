import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMentorReports } from "@/hooks/useMentorReports";
import { 
  Users, 
  Target, 
  Activity, 
  TrendingUp, 
  Award,
  BarChart3,
  PieChart,
  Calendar
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', '#f59e0b', '#10b981', '#6366f1'];

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  contato: 'Em Contato',
  qualificado: 'Qualificado',
  proposta: 'Proposta',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export default function Relatorios() {
  const {
    stats,
    statsLoading,
    activityByDay,
    activityByDayLoading,
    leadsByStatus,
    leadsByStatusLoading,
    topPerformers,
    topPerformersLoading,
  } = useMentorReports();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">
          Visão consolidada do desempenho dos seus mentorados
        </p>
      </div>

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

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Atividades por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityByDayLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activityByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(parseISO(val), 'EEE', { locale: ptBR })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    labelFormatter={(val) => format(parseISO(val as string), "dd 'de' MMM", { locale: ptBR })}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    name="Atividades"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Leads by Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Leads por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByStatusLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : leadsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
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
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top 5 Mentorados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformersLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : topPerformers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum mentorado encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div
                  key={performer.mentoradoId}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <Avatar>
                    <AvatarImage src={performer.avatar || undefined} />
                    <AvatarFallback>
                      {performer.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{performer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {performer.leadsCount} leads • {performer.activitiesCount} atividades
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {performer.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
