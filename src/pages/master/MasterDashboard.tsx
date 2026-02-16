import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2, Users, Activity, TrendingUp, Eye, UserCheck, UserX, Target,
  Loader2, AlertTriangle, DollarSign, BarChart3, Bell,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMasterDashboardStats } from '@/hooks/useMasterDashboardStats';
import { PLATFORM } from '@/lib/platform';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';

const MODULE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(45, 100%, 51%)',
  'hsl(270, 60%, 55%)',
  'hsl(200, 70%, 50%)',
  'hsl(340, 65%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(30, 80%, 55%)',
];

export default function MasterDashboard() {
  const {
    tenantsCount, usersCount, membershipsCount, recentActivity,
    tenantBreakdown, growthData, engagementRate, suspendedCount,
    alerts, moduleUsage, totalMRR,
    selectedTenantId, setSelectedTenantId,
    isLoading, isGrowthLoading,
  } = useMasterDashboardStats();

  const filteredBreakdown = selectedTenantId === 'all'
    ? tenantBreakdown
    : tenantBreakdown?.filter(t => t.tenant_id === selectedTenantId);

  const criticalAlerts = alerts?.filter(a => a.severity === 'critical') || [];
  const warningAlerts = alerts?.filter(a => a.severity === 'warning') || [];

  return (
    <div className="space-y-6">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {PLATFORM.shortName} — Command Center
          </h1>
          <p className="text-muted-foreground mt-1">Visão consolidada da operação</p>
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

      {/* Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} ativo{alerts.length !== 1 ? 's' : ''}
                  {criticalAlerts.length > 0 && (
                    <Badge className="ml-2 bg-red-500/20 text-red-500 text-[10px]">{criticalAlerts.length} crítico{criticalAlerts.length !== 1 ? 's' : ''}</Badge>
                  )}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {alerts.slice(0, 4).map((alert, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <AlertTriangle className={`h-3 w-3 shrink-0 ${alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                      <span className="text-muted-foreground truncate">{alert.title}</span>
                    </div>
                  ))}
                  {alerts.length > 4 && (
                    <p className="text-xs text-muted-foreground">+{alerts.length - 4} mais</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Tenants', value: tenantsCount, icon: Building2, color: 'text-primary', link: '/master/tenants' },
          { label: 'Pessoas', value: usersCount, icon: Users, color: 'text-accent', link: '/master/users' },
          { label: 'Vínculos', value: membershipsCount, icon: Activity, color: 'text-purple-400', link: '/master/users' },
          { label: 'Engajamento 7d', value: engagementRate !== undefined ? `${engagementRate}%` : '...', icon: TrendingUp, color: 'text-emerald-400', link: '/master/users' },
          { label: 'MRR', value: totalMRR > 0 ? `R$ ${totalMRR.toLocaleString('pt-BR')}` : '—', icon: DollarSign, color: 'text-primary', link: '/master/tenants' },
        ].map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <Card className="glass-card-glow cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-12 mt-1 bg-muted" />
                    ) : (
                      <p className="text-xl font-bold text-foreground mt-0.5">{stat.value ?? 0}</p>
                    )}
                  </div>
                  <stat.icon className={`h-7 w-7 ${stat.color} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Row 2: Growth + Module Usage + Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Growth Chart */}
        <Card className="glass-card lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Crescimento (8 semanas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isGrowthLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : growthData && growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={growthData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v) => { const d = new Date(v); return `Semana ${d.getDate()}/${d.getMonth() + 1}`; }} />
                  <Bar dataKey="mentees" name="Mentorados" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="mentors" name="Mentores" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>

        {/* Module Usage */}
        <Card className="glass-card lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Uso por Módulo (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {moduleUsage && moduleUsage.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={moduleUsage} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={55} innerRadius={30} strokeWidth={0}>
                        {moduleUsage.map((_, i) => (
                          <Cell key={i} fill={MODULE_COLORS[i % MODULE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {moduleUsage.slice(0, 6).map((m, i) => (
                    <div key={m.module} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: MODULE_COLORS[i % MODULE_COLORS.length] }} />
                        <span className="text-foreground">{m.label}</span>
                      </div>
                      <span className="text-muted-foreground font-mono">{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados de uso ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Indicators */}
        <Card className="glass-card lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Indicadores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-foreground">Engajamento</span>
              </div>
              <span className="text-sm font-bold text-foreground">{engagementRate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <UserX className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs text-foreground">Suspensos</span>
              </div>
              <span className="text-sm font-bold text-foreground">{suspendedCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-foreground">Leads totais</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {tenantBreakdown?.reduce((sum, t) => sum + t.leadsCount, 0) ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-foreground">Alertas</span>
              </div>
              <span className="text-sm font-bold text-foreground">{alerts?.length ?? 0}</span>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/master/preview">
                <Eye className="mr-2 h-3.5 w-3.5" />
                Preview
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Tenant Health Table */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Saúde por Tenant
            </CardTitle>
            <CardDescription className="text-xs">MRR • Mentores • Mentorados • Engajamento</CardDescription>
          </div>
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
                  <tr className="text-muted-foreground text-xs border-b border-border/50">
                    <th className="text-left py-2 font-medium">Tenant</th>
                    <th className="text-center py-2 font-medium">MRR</th>
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
                        <td className="py-2.5 text-foreground font-medium">{t.tenant_name}</td>
                        <td className="py-2.5 text-center text-foreground text-xs">
                          {t.monthlyValue > 0 ? `R$ ${t.monthlyValue.toLocaleString('pt-BR')}` : '—'}
                        </td>
                        <td className="py-2.5 text-center text-foreground">{t.mentors}</td>
                        <td className="py-2.5 text-center text-foreground">{t.mentees}</td>
                        <td className="py-2.5 text-center text-foreground">{t.activeLast7d}</td>
                        <td className="py-2.5 text-center text-foreground">{t.leadsCount}</td>
                        <td className="py-2.5 text-center">
                          <Badge className={`${healthColor} text-[10px]`}>{healthLabel}</Badge>
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
          <CardTitle className="text-foreground text-sm">Últimos Cadastros</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10">
                  <Skeleton className="h-6 w-16 bg-muted" />
                  <Skeleton className="h-4 w-40 bg-muted" />
                </div>
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-1.5">
              {recentActivity.map((activity) => {
                const roleMap: Record<string, { label: string; color: string }> = {
                  mentor: { label: 'Mentor', color: 'bg-blue-500/15 text-blue-600' },
                  mentee: { label: 'Mentorado', color: 'bg-emerald-500/15 text-emerald-600' },
                  master_admin: { label: 'Master', color: 'bg-primary/15 text-primary' },
                };
                const role = roleMap[activity.role] || { label: activity.role, color: 'bg-muted text-muted-foreground' };
                return (
                  <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/10 transition-colors">
                    <Badge className={`${role.color} text-[10px] px-2`}>{role.label}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {activity.profiles?.full_name || activity.profiles?.email || 'Usuário'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
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
