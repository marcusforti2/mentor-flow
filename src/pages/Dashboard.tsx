import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Trophy,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  BookOpen,
  MessageSquare,
  BarChart3,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Até logo!",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const menuItems = [
    { icon: BarChart3, label: "Dashboard", active: true },
    { icon: Users, label: "CRM" },
    { icon: BookOpen, label: "Trilhas" },
    { icon: Calendar, label: "Calendário" },
    { icon: Trophy, label: "Rankings" },
    { icon: MessageSquare, label: "Centro SOS" },
  ];

  const stats = [
    { title: "Mentorados Ativos", value: "0", icon: Users, change: "+0%" },
    { title: "Engajamento", value: "0%", icon: TrendingUp, change: "+0%" },
    { title: "Calls Agendadas", value: "0", icon: Calendar, change: "Esta semana" },
    { title: "Conquistas", value: "0", icon: Trophy, change: "Desbloqueadas" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground">MentorHub</h1>
              <span className="text-xs text-muted-foreground">Portal do Mentor</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    item.active 
                      ? "bg-sidebar-accent text-sidebar-primary" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
            <span>Configurações</span>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">
              Bem-vindo, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Mentor"}!
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                0
              </span>
            </Button>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold">
                {user?.email?.charAt(0).toUpperCase() || "M"}
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-card border-border hover-lift">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Welcome Card */}
          <Card className="bg-gradient-to-r from-card to-secondary border-border mb-8">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    🎉 Bem-vindo ao MentorHub Pro!
                  </h3>
                  <p className="text-muted-foreground max-w-xl mb-4">
                    Sua plataforma está pronta. Comece adicionando seus mentorados e 
                    configurando suas trilhas de conteúdo para transformar sua mentoria.
                  </p>
                  <div className="flex gap-3">
                    <Button className="gradient-gold text-primary-foreground hover:opacity-90">
                      Adicionar Mentorado
                    </Button>
                    <Button variant="outline" className="border-border">
                      Criar Trilha
                    </Button>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-glow">
                    <Trophy className="w-16 h-16 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-card border-border hover-lift cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Gerenciar CRM</h4>
                <p className="text-sm text-muted-foreground">
                  Pipeline de leads e gestão de mentorados
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover-lift cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-accent" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Criar Conteúdo</h4>
                <p className="text-sm text-muted-foreground">
                  Trilhas, módulos e materiais de aprendizado
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover-lift cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-7 h-7 text-success" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Agendar Encontro</h4>
                <p className="text-sm text-muted-foreground">
                  Calls em grupo com integração Zoom/Meet
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
