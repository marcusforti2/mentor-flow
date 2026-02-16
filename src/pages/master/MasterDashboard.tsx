import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, Activity, TrendingUp, Eye, UserCheck, UserX, Target, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMasterDashboardStats } from '@/hooks/useMasterDashboardStats';
import { PLATFORM } from '@/lib/platform';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function MasterDashboard() {
  const {
    tenantsCount,
    usersCount,
    membershipsCount,
    recentActivity,
    tenantBreakdown,
    growthData,
    engagementRate,
    suspendedCount,
    selectedTenantId,
    setSelectedTenantId,
    isLoading,
    isGrowthLoading,
  } = useMasterDashboardStats();

  const stats = [
    { label: 'Tenants Ativos', value: tenantsCount, icon: Building2, color: 'text-primary', link: '/master/tenants' },
    { label: 'Pessoas Cadastradas', value: usersCount, icon: Users, color: 'text-accent', link: '/master/users' },
    { label: 'Vínculos Ativos', value: membershipsCount, icon: Activity, color: 'text-purple-400', link: '/master/users' },
    { label: 'Engajamento 7d', value: engagementRate !== undefined ? `${engagementRate}%` : '...', icon: TrendingUp, color: 'text-emerald-400', link: '/master/users' },
  ];

  const filteredBreakdown = selectedTenantId === 'all'
    ? tenantBreakdown
    : tenantBreakdown?.filter(t => t.tenant_id === selectedTenantId);

  return (
    <div className="space-y-6">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {PLATFORM.shortName} — Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão consolidada da operação
          </p>
        </div>
        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filtrar por tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tenants</SelectItem>
            {tenantBreakdown?.map(t => (
              <SelectItem key={t.tenant_id} value={t.tenant_id}>{t.tenant_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <Card className="glass-card-glow cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-14 mt-2 bg-muted" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground mt-1">{stat.value ?? 0}</p>
                    )}
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Row 2: Growth Chart + Tenant Health */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Growth Chart */}
        <Card className="glass-card lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Crescimento (últimas 8 semanas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isGrowthLoading ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : growthData && growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={growthData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v) => {
                      const d = new Date(v);
                      return `Semana de ${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <Bar dataKey="mentees" name="Mentorados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mentors" name="Mentores" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados de crescimento ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Indicadores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-foreground">Engajamento (7d)</span>
              </div>
              <span className="text-lg font-bold text-foreground">{engagementRate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-400" />
                <span className="text-sm text-foreground">Suspensos</span>
              </div>
              <span className="text-lg font-bold text-foreground">{suspendedCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Leads totais</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {tenantBreakdown?.reduce((sum, t) => sum + t.leadsCount, 0) ?? 0}
              </span>
            </div>

            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link to="/master/preview">
                <Eye className="mr-2 h-4 w-4" />
                Acessar Preview
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Tenant Health Table */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Saúde por Tenant
          </CardTitle>
          <CardDescription>Distribuição de membros e engajamento por empresa</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full bg-muted" />)}
            </div>
          ) : filteredBreakdown && filteredBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2 font-medium">Tenant</th>
                    <th className="text-center py-2 font-medium">Mentores</th>
                    <th className="text-center py-2 font-medium">Mentorados</th>
                    <th className="text-center py-2 font-medium">Ativos 7d</th>
                    <th className="text-center py-2 font-medium">Leads</th>
                    <th className="text-center py-2 font-medium">Saúde</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBreakdown.map(t => {
                    const healthRate = t.mentees > 0 ? Math.round((t.activeLast7d / t.mentees) * 100) : 0;
                    const healthColor = healthRate >= 60 ? 'bg-emerald-500/20 text-emerald-600' :
                      healthRate >= 30 ? 'bg-amber-500/20 text-amber-600' : 'bg-red-500/20 text-red-600';
                    const healthLabel = healthRate >= 60 ? 'Saudável' :
                      healthRate >= 30 ? 'Atenção' : 'Crítico';
                    return (
                      <tr key={t.tenant_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-3 text-foreground font-medium">{t.tenant_name}</td>
                        <td className="py-3 text-center text-foreground">{t.mentors}</td>
                        <td className="py-3 text-center text-foreground">{t.mentees}</td>
                        <td className="py-3 text-center text-foreground">{t.activeLast7d}</td>
                        <td className="py-3 text-center text-foreground">{t.leadsCount}</td>
                        <td className="py-3 text-center">
                          <Badge className={`${healthColor} text-xs`}>
                            {healthLabel}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhum tenant encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* Row 4: Recent Activity */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-base">Últimos Cadastros</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20">
                  <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-40 bg-muted" />
                    <Skeleton className="h-3 w-28 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map((activity) => {
                const roleMap: Record<string, { label: string; color: string }> = {
                  mentor: { label: 'Mentor', color: 'bg-blue-500/15 text-blue-600' },
                  mentee: { label: 'Mentorado', color: 'bg-emerald-500/15 text-emerald-600' },
                  master_admin: { label: 'Master', color: 'bg-primary/15 text-primary' },
                };
                const role = roleMap[activity.role] || { label: activity.role, color: 'bg-muted text-muted-foreground' };
                return (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                    <Badge className={`${role.color} text-[10px] px-2`}>{role.label}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {activity.profiles?.full_name || activity.profiles?.email || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.tenants?.name} · {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
