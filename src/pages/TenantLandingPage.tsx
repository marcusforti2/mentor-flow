import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Sparkles, BookOpen, Target, Trophy, Brain, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PLATFORM } from '@/lib/platform';

export default function TenantLandingPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-landing', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url, primary_color, secondary_color, settings')
        .eq('slug', slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch public trails count for this tenant
  const { data: trailsCount } = useQuery({
    queryKey: ['tenant-trails-count', tenant?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('trails')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant!.id)
        .eq('is_published', true);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background theme-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-background theme-light">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-display font-bold text-foreground">Mentoria não encontrada</h1>
          <p className="text-muted-foreground">O link que você acessou não corresponde a nenhuma mentoria ativa.</p>
          <Link to="/">
            <Button variant="outline">Voltar ao início</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tenantColor = tenant.primary_color || 'hsl(160 84% 39%)';

  const highlights = [
    { icon: Brain, title: 'IA de Vendas', desc: 'Arsenal completo de inteligência artificial treinada no seu nicho.' },
    { icon: BookOpen, title: 'Trilhas de Conteúdo', desc: `${trailsCount || 'Várias'} trilhas com vídeos, exercícios e certificados.` },
    { icon: Target, title: 'CRM Inteligente', desc: 'Pipeline visual com qualificação automática de leads.' },
    { icon: Trophy, title: 'Gamificação', desc: 'Pontos, badges, ranking e competição saudável entre mentorados.' },
  ];

  return (
    <div className="min-h-screen bg-background theme-light">
      <div className="animated-gradient-bg" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-10 object-contain rounded-lg" />
            ) : (
              <div 
                className="h-10 w-10 rounded-lg flex items-center justify-center font-display font-bold text-lg"
                style={{ backgroundColor: `${tenantColor}20`, color: tenantColor }}
              >
                {tenant.name.charAt(0)}
              </div>
            )}
            <span className="font-display font-bold text-xl text-foreground">{tenant.name}</span>
          </div>
          <Link to="/auth">
            <Button className="btn-premium px-6">
              <span>Acessar Plataforma</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div 
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: tenantColor }}
        />
        <div className="container mx-auto text-center relative max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Mentoria {tenant.name}</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">
            Acelere seus <span className="text-gradient-gold">resultados</span>
            <br />com a mentoria certa
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Plataforma completa com IA, CRM inteligente, trilhas de conteúdo e gamificação
            para você vender mais e melhor.
          </p>
          
          <Link to="/auth">
            <Button size="lg" className="btn-premium text-lg px-10 h-14">
              <span className="flex items-center gap-2">
                Entrar na Plataforma <ArrowRight className="w-5 h-5" />
              </span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, i) => (
              <Card key={i} className="glass-card hover-lift border-border/30">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="glass-card-glow p-12 rounded-3xl text-center">
            <h2 className="text-3xl font-display font-bold mb-4">
              Pronto para <span className="text-gradient-gold">começar</span>?
            </h2>
            <p className="text-muted-foreground mb-8">
              Entre na plataforma e comece sua jornada com {tenant.name}.
            </p>
            <Link to="/auth">
              <Button size="lg" className="btn-premium px-10 h-14">
                <span className="flex items-center gap-2">
                  Acessar Agora <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/30">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {tenant.name} — Powered by {PLATFORM.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {PLATFORM.email.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}
