import { Bot, Target, MessageSquare, FileText, FileSignature, TrendingUp, User, Pen, Sparkles, Rocket, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const tools = [
  { id: 'qualifier', label: 'Qualificador de Leads', icon: Target, description: 'Analise perfis com IA e descubra os leads mais quentes do seu pipeline', color: 'from-red-500 to-orange-500' },
  { id: 'communication', label: 'Hub de Comunicação', icon: MessageSquare, description: 'Scripts, follow-up e cold messages multi-canal personalizados', color: 'from-blue-500 to-cyan-500' },
  { id: 'roleplay', label: 'Simulador de Objeções', icon: FileText, description: 'Treine respostas para as objeções mais difíceis com role-play de IA', color: 'from-purple-500 to-pink-500' },
  { id: 'proposal', label: 'Criador de Propostas', icon: FileSignature, description: 'Gere propostas comerciais irresistíveis em segundos', color: 'from-emerald-500 to-teal-500' },
  { id: 'analytics', label: 'Análise de Conversão', icon: TrendingUp, description: 'Analise calls, conversas e descubra onde você perde vendas', color: 'from-amber-500 to-yellow-500' },
  { id: 'bio', label: 'Gerador de Bio', icon: User, description: 'Bio otimizada para LinkedIn, Instagram e WhatsApp', color: 'from-indigo-500 to-violet-500' },
  { id: 'content', label: 'Gerador de Conteúdo', icon: Pen, description: 'Posts, carrosséis e stories que convertem seguidores em clientes', color: 'from-pink-500 to-rose-500' },
  { id: 'mentor', label: 'Mentor Virtual 24/7', icon: Bot, description: 'Seu mentor pessoal disponível a qualquer hora para tirar dúvidas', color: 'from-sky-500 to-blue-500' },
];

export default function FerramentasIA() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        {/* Animated Robot */}
        <div className="relative mx-auto w-32 h-32">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-30 blur-xl animate-pulse" />
          
          {/* Robot body */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Floating animation container */}
            <div className="animate-bounce" style={{ animationDuration: '2s' }}>
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30 relative overflow-hidden">
                {/* Shine effect */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                  style={{ 
                    animation: 'shimmer 3s ease-in-out infinite',
                  }}
                />
                <Bot className="h-12 w-12 text-primary-foreground relative z-10" />
              </div>
            </div>
            
            {/* Dancing sparkles */}
            <Sparkles 
              className="absolute top-0 right-0 h-5 w-5 text-primary animate-ping" 
              style={{ animationDuration: '2s', animationDelay: '0s' }} 
            />
            <Sparkles 
              className="absolute bottom-2 left-0 h-4 w-4 text-accent animate-ping" 
              style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} 
            />
            <Sparkles 
              className="absolute top-4 -left-2 h-3 w-3 text-primary animate-ping" 
              style={{ animationDuration: '3s', animationDelay: '1s' }} 
            />
          </div>
        </div>

        <div className="space-y-3">
          <Badge variant="outline" className="border-primary/50 text-primary gap-1.5 px-3 py-1">
            <Rocket className="h-3.5 w-3.5" />
            Em Breve
          </Badge>
          <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Arsenal de Vendas IA
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            8 armas de inteligência artificial para transformar sua prospecção e fechar mais negócios. Estamos preparando tudo para você!
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool, index) => (
          <Card 
            key={tool.id} 
            className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 opacity-80 hover:opacity-100"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-5 flex items-start gap-4">
              {/* Icon */}
              <div className={`shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg relative`}>
                <tool.icon className="h-5 w-5 text-white" />
                {/* Lock overlay */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
                  <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
              </div>
              
              {/* Content */}
              <div className="min-w-0 space-y-1">
                <h3 className="font-semibold text-foreground text-sm">{tool.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom message */}
      <div className="text-center pb-8">
        <div className="inline-flex items-center gap-2 bg-muted/50 backdrop-blur-sm rounded-full px-6 py-3 border border-border/50">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">
            Nosso time está calibrando as IAs para o seu perfil de vendas
          </span>
        </div>
      </div>

      {/* Shimmer keyframe style */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-200%) skewX(-12deg); }
          50% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </div>
  );
}
