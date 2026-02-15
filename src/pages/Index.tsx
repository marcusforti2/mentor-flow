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
  Zap,
  Sparkles,
  Target,
  BarChart3,
  CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { PLATFORM } from "@/lib/platform";

const Index = () => {
  const features = [
    {
      icon: Users,
      title: "CRM Inteligente",
      description: "Pipeline visual de vendas com IA que identifica leads quentes e sugere próximos passos."
    },
    {
      icon: Brain,
      title: "8 IAs de Vendas",
      description: "Arsenal completo: qualificador, cold messages, simulador de objeções, propostas e mais."
    },
    {
      icon: Calendar,
      title: "Agendamento Integrado",
      description: "Disponibilidade configurável, booking por mentorado e sessões gerenciadas."
    },
    {
      icon: Trophy,
      title: "Gamificação Avançada",
      description: "Rankings em tempo real, badges, streaks e sistema de pontos que engajam mentorados."
    },
    {
      icon: TrendingUp,
      title: "Relatórios & Analytics",
      description: "KPIs de engajamento, score IA por mentorado, alertas inteligentes e dashboards."
    },
    {
      icon: MessageSquare,
      title: "Centro SOS + Alertas",
      description: "Sistema de urgências com triagem IA e alertas inteligentes para o mentor."
    }
  ];

  const stats = [
    { value: "8", label: "IAs Integradas" },
    { value: "200+", label: "Mentorados por Mentor" },
    { value: "3x", label: "Mais Conversões" },
    { value: "24/7", label: "Mentor Virtual" }
  ];

  const plans = [
    {
      name: 'Starter',
      price: 'R$ 197',
      period: '/mês',
      description: 'Para mentores começando a escalar',
      features: ['Até 30 mentorados', 'CRM básico', '3 ferramentas IA', 'Trilhas ilimitadas', 'Suporte por email'],
      cta: 'Começar Grátis',
      highlighted: false,
    },
    {
      name: 'Professional',
      price: 'R$ 497',
      period: '/mês',
      description: 'Para mentores em crescimento acelerado',
      features: ['Até 100 mentorados', 'CRM completo + Vision IA', '8 ferramentas IA', 'Gamificação + Ranking', 'Relatórios avançados', 'Alertas inteligentes', 'Branding personalizado'],
      cta: 'Escolher Professional',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'R$ 997',
      period: '/mês',
      description: 'Para operações de mentoria de alto volume',
      features: ['Mentorados ilimitados', 'Tudo do Professional', 'Multi-mentor', 'API customizada', 'Onboarding dedicado', 'SLA garantido', 'White-label completo'],
      cta: 'Falar com Vendas',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background theme-light">
      {/* Animated gradient background */}
      <div className="animated-gradient-bg" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <BrandLogo variant="full" size="md" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</a>
            <Link to="/showcase" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Demo</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="btn-premium px-6">
                <span>Começar Agora</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8 animate-fade-in">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Plataforma SaaS para Mentores High Ticket</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Escale sua <span className="text-gradient-gold">Mentoria</span>
            <br />
            com <span className="text-gradient-premium">{PLATFORM.name}</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {PLATFORM.description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="btn-premium text-lg px-8 h-14">
                <span className="flex items-center gap-2">
                  Criar Minha Conta <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
            <Link to="/showcase">
              <Button size="lg" variant="outline" className="border-border/50 hover:bg-card/50 text-lg px-8 h-14">
                Ver Demonstração
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-display font-bold text-gradient-gold mb-2">{stat.value}</div>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">Funcionalidades</span>
            </div>
            <h2 className="text-4xl font-display font-bold mb-4">
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
                className="glass-card hover-lift group cursor-default border-border/30"
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 mb-6">
              <Target className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-medium text-accent tracking-wider uppercase">Planos</span>
            </div>
            <h2 className="text-4xl font-display font-bold mb-4">
              Escolha o plano <span className="text-gradient-gold">ideal</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Comece grátis e escale conforme sua operação cresce.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden border-border/30 ${
                  plan.highlighted 
                    ? 'glass-card-glow ring-2 ring-primary/30' 
                    : 'glass-card'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
                )}
                <CardContent className="p-8">
                  <div className="mb-6">
                    <h3 className="font-display text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-display font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth?mode=signup">
                    <Button 
                      className={`w-full ${plan.highlighted ? 'btn-premium' : ''}`}
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      <span>{plan.cta}</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="glass-card-glow p-12 md:p-16 rounded-3xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Tecnologia Premium para Mentores
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
                Pronto para transformar sua <span className="text-gradient-gold">mentoria</span>?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Junte-se a mentores que estão escalando com o {PLATFORM.name}.
                Comece gratuitamente.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="btn-premium text-lg px-10 h-14">
                  <span className="flex items-center gap-2">
                    Começar Agora — É Grátis <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/30">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <BrandLogo variant="full" size="sm" className="opacity-60" />
            <p className="text-sm text-muted-foreground">
              {PLATFORM.email.footer}
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
