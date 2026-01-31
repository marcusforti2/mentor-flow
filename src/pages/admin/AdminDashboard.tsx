import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  Target,
  Trophy,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const statsCards = [
  {
    title: 'Mentorados Ativos',
    value: '39',
    change: '+3 este mês',
    icon: Users,
    trend: 'up',
  },
  {
    title: 'Taxa de Engajamento',
    value: '87%',
    change: '+5% vs. semana passada',
    icon: TrendingUp,
    trend: 'up',
  },
  {
    title: 'Próximos Encontros',
    value: '4',
    change: 'Esta semana',
    icon: Calendar,
    trend: 'neutral',
  },
  {
    title: 'SOS Pendentes',
    value: '2',
    change: 'Aguardando resposta',
    icon: AlertTriangle,
    trend: 'attention',
  },
];

const quickActions = [
  { label: 'Gerenciar CRM', icon: Target, path: '/admin/crm', color: 'from-primary to-primary/80' },
  { label: 'Ver Mentorados', icon: Users, path: '/admin/mentorados', color: 'from-accent to-accent/80' },
  { label: 'Criar Trilha', icon: BookOpen, path: '/admin/trilhas', color: 'from-green-500 to-green-600' },
  { label: 'Ver Rankings', icon: Trophy, path: '/admin/ranking', color: 'from-amber-500 to-amber-600' },
];

export default function AdminDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Olá, {profile?.full_name || 'Mentor'}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está o resumo da sua mentoria hoje.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="glass-card hover-scale">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon 
                className={`h-5 w-5 ${
                  stat.trend === 'up' ? 'text-green-500' : 
                  stat.trend === 'attention' ? 'text-amber-500' : 
                  'text-muted-foreground'
                }`} 
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className={`text-xs mt-1 ${
                stat.trend === 'up' ? 'text-green-500' : 
                stat.trend === 'attention' ? 'text-amber-500' : 
                'text-muted-foreground'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path}>
              <Card className="group cursor-pointer hover-scale glass-card overflow-hidden">
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${action.color} p-6`}>
                    <action.icon className="h-8 w-8 text-white mb-3" />
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      {action.label}
                      <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas ações dos mentorados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">João completou a Trilha de Prospecção</p>
                <p className="text-xs text-muted-foreground">Há 2 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Maria registrou 5 novas prospecções</p>
                <p className="text-xs text-muted-foreground">Há 4 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Pedro subiu para #3 no ranking</p>
                <p className="text-xs text-muted-foreground">Há 6 horas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas
            </CardTitle>
            <CardDescription>Mentorados que precisam de atenção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Carlos não acessa há 7 dias</p>
                <p className="text-xs text-muted-foreground">Último acesso: 24/01/2026</p>
              </div>
              <Button size="sm" variant="outline">
                Contatar
              </Button>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Ana solicitou SOS urgente</p>
                <p className="text-xs text-muted-foreground">Há 30 minutos</p>
              </div>
              <Button size="sm" variant="destructive">
                Atender
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
