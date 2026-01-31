import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  Target, 
  Trophy,
  Calendar,
  TrendingUp,
  Award,
  ArrowUpRight,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';

const statsCards = [
  {
    title: 'Progresso nas Trilhas',
    value: '67%',
    description: '4 de 6 trilhas concluídas',
    icon: BookOpen,
    color: 'text-green-500',
  },
  {
    title: 'Posição no Ranking',
    value: '#7',
    description: '+2 posições esta semana',
    icon: Trophy,
    color: 'text-primary',
  },
  {
    title: 'Prospecções do Mês',
    value: '23',
    description: '230 pontos acumulados',
    icon: Target,
    color: 'text-accent',
  },
  {
    title: 'Próximo Encontro',
    value: '2 dias',
    description: 'Quarta, 14h00',
    icon: Calendar,
    color: 'text-blue-500',
  },
];

const recentBadges = [
  { name: 'Primeira Prospecção', icon: '🎯' },
  { name: 'Trilha Completa', icon: '📚' },
  { name: '10 Prospecções', icon: '🔥' },
];

export default function MemberDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Bem-vindo, {profile?.full_name || 'Mentorado'}! 🚀
          </h1>
          <p className="text-muted-foreground mt-1">
            Continue evoluindo! Você está no caminho certo.
          </p>
        </div>
        <Link to="/app/trilhas">
          <Button className="bg-gradient-gold text-background hover:opacity-90">
            <Play className="mr-2 h-4 w-4" />
            Continuar Trilha
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="glass-card hover-scale">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Trail Progress */}
        <Card className="md:col-span-2 glass-card">
          <CardHeader>
            <CardTitle>Sua Jornada</CardTitle>
            <CardDescription>Progresso nas trilhas de aprendizado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">Prospecção Avançada</span>
                <span className="text-muted-foreground">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">Fechamento de Vendas</span>
                <span className="text-muted-foreground">60%</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">Mindset de Alta Performance</span>
                <span className="text-muted-foreground">40%</span>
              </div>
              <Progress value={40} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">Comunicação Persuasiva</span>
                <span className="text-muted-foreground">20%</span>
              </div>
              <Progress value={20} className="h-2" />
            </div>
            <Link to="/app/trilhas">
              <Button variant="outline" className="w-full mt-4">
                Ver Todas as Trilhas
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Badges & Achievements */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Conquistas
            </CardTitle>
            <CardDescription>Suas medalhas recentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentBadges.map((badge) => (
              <div
                key={badge.name}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-sm font-medium text-foreground">{badge.name}</span>
              </div>
            ))}
            <Link to="/app/perfil">
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                Ver todas as conquistas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/app/meu-crm">
          <Card className="glass-card hover-scale cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Registrar Prospecção</h3>
                <p className="text-sm text-muted-foreground">Ganhe pontos no ranking</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/app/treinamento">
          <Card className="glass-card hover-scale cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Analisar Call</h3>
                <p className="text-sm text-muted-foreground">IA analisa sua performance</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/app/ranking">
          <Card className="glass-card hover-scale cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Ver Ranking</h3>
                <p className="text-sm text-muted-foreground">Sua posição: #7</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
