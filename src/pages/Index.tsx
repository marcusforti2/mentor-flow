import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Brain, 
  Trophy, 
  MessageSquare,
  ArrowRight,
  Shield,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import { LBVLogo } from "@/components/LBVLogo";

const Index = () => {
  const features = [
    {
      icon: Users,
      title: "CRM Inteligente",
      description: "Pipeline visual de vendas com IA que identifica leads quentes e sugere próximos passos."
    },
    {
      icon: Brain,
      title: "Análise com IA",
      description: "Upload de calls para análise automática de performance, objeções e score de evolução."
    },
    {
      icon: Calendar,
      title: "Calendário Integrado",
      description: "Agenda de encontros com integração Zoom/Meet e lembretes automáticos."
    },
    {
      icon: Trophy,
      title: "Gamificação",
      description: "Rankings em tempo real, badges e sistema de conquistas que engajam mentorados."
    },
    {
      icon: TrendingUp,
      title: "Dashboard Analytics",
      description: "Métricas de engajamento, progresso das trilhas e insights de IA sobre sua mentoria."
    },
    {
      icon: MessageSquare,
      title: "Centro SOS",
      description: "Sistema de urgências com roteamento inteligente para atendimentos prioritários."
    }
  ];

  const stats = [
    { value: "200+", label: "Mentorados Ativos" },
    { value: "95%", label: "Taxa de Engajamento" },
    { value: "3x", label: "Aumento em Conversões" },
    { value: "24/7", label: "IA Disponível" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <LBVLogo variant="full" size="md" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Planos</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">Sobre</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="gradient-gold text-primary-foreground hover:opacity-90 glow-gold">
                Começar Agora
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Plataforma para Mentores High Ticket</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Escale sua <span className="text-gradient-gold">Mentoria</span>
            <br />
            com <span className="text-gradient-premium">LBV TECH</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            A plataforma completa para mentores que querem gerenciar +200 mentorados 
            com CRM inteligente, gamificação e IA que transforma resultados.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gradient-gold text-primary-foreground glow-gold hover:opacity-90 text-lg px-8">
                Criar Minha Conta
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-border hover:bg-secondary text-lg px-8">
              Ver Demonstração
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-gradient-gold mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Tudo que você precisa para <span className="text-gradient-gold">escalar</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa com IA para automatizar, engajar e transformar 
              a experiência dos seus mentorados.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-card border-border hover-lift group cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <Card className="bg-gradient-to-r from-card to-secondary border-border overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <CardContent className="p-12 md:p-16 text-center relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Tecnologia Premium para Mentores
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Pronto para transformar sua <span className="text-gradient-gold">mentoria</span>?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Junte-se a mentores que estão escalando seus programas com a LBV TECH.
                Comece gratuitamente.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-gold text-primary-foreground glow-gold hover:opacity-90 text-lg px-10">
                  Começar Agora — É Grátis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <LBVLogo variant="full" size="sm" />
            <p className="text-sm text-muted-foreground">
              © 2024 LBV TECH. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Termos</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contato</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
