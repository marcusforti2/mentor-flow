import { useState } from 'react';
import { Bot, Target, MessageSquare, FileText, FileSignature, TrendingUp, User, Pen, Sparkles, Rocket, Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';

// AI Tool components
import { VirtualMentor } from '@/components/ai-tools/VirtualMentor';
import { LeadQualifier } from '@/components/ai-tools/LeadQualifier';
import { BioGenerator } from '@/components/ai-tools/BioGenerator';
import { ContentGenerator } from '@/components/ai-tools/ContentGenerator';
import { CommunicationHub } from '@/components/ai-tools/CommunicationHub';
import { ObjectionSimulator } from '@/components/ai-tools/ObjectionSimulator';
import { ProposalCreator } from '@/components/ai-tools/ProposalCreator';
import { ConversionAnalyzer } from '@/components/ai-tools/ConversionAnalyzer';

const PASSWORD = 'LB2026';

const tools = [
  { id: 'mentor', label: 'Mentor Virtual 24/7', icon: Bot, description: 'Seu mentor pessoal disponível a qualquer hora para tirar dúvidas', color: 'from-sky-500 to-blue-500' },
  { id: 'qualifier', label: 'Qualificador de Leads', icon: Target, description: 'Analise perfis com IA e descubra os leads mais quentes do seu pipeline', color: 'from-red-500 to-orange-500' },
  { id: 'communication', label: 'Hub de Comunicação', icon: MessageSquare, description: 'Scripts, follow-up e cold messages multi-canal personalizados', color: 'from-blue-500 to-cyan-500' },
  { id: 'roleplay', label: 'Simulador de Objeções', icon: FileText, description: 'Treine respostas para as objeções mais difíceis com role-play de IA', color: 'from-purple-500 to-pink-500' },
  { id: 'proposal', label: 'Criador de Propostas', icon: FileSignature, description: 'Gere propostas comerciais irresistíveis em segundos', color: 'from-emerald-500 to-teal-500' },
  { id: 'analytics', label: 'Análise de Conversão', icon: TrendingUp, description: 'Analise calls, conversas e descubra onde você perde vendas', color: 'from-amber-500 to-yellow-500' },
  { id: 'bio', label: 'Gerador de Bio', icon: User, description: 'Bio otimizada para LinkedIn, Instagram e WhatsApp', color: 'from-indigo-500 to-violet-500' },
  { id: 'content', label: 'Gerador de Conteúdo', icon: Pen, description: 'Posts, carrosséis e stories que convertem seguidores em clientes', color: 'from-pink-500 to-rose-500' },
];

export default function FerramentasIA() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingToolId, setPendingToolId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const { activeMembership } = useTenant();

  const mentoradoId = activeMembership?.id || null;

  const handleToolClick = (toolId: string) => {
    if (isUnlocked) {
      setActiveTool(toolId);
    } else {
      setPendingToolId(toolId);
      setPasswordInput('');
      setShowPasswordDialog(true);
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === PASSWORD) {
      setIsUnlocked(true);
      setShowPasswordDialog(false);
      setActiveTool(pendingToolId);
      setPendingToolId(null);
      setPasswordInput('');
      toast.success('Arsenal desbloqueado! 🚀');
    } else {
      toast.error('Senha incorreta');
      setPasswordInput('');
    }
  };

  const handlePasswordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePasswordSubmit();
  };

  const renderActiveTool = () => {
    if (!activeTool) return null;

    const toolMap: Record<string, JSX.Element> = {
      mentor: <VirtualMentor mentoradoId={mentoradoId} />,
      qualifier: <LeadQualifier mentoradoId={mentoradoId} />,
      bio: <BioGenerator mentoradoId={mentoradoId} />,
      content: <ContentGenerator mentoradoId={mentoradoId} />,
      communication: <CommunicationHub mentoradoId={mentoradoId} />,
      roleplay: <ObjectionSimulator mentoradoId={mentoradoId} />,
      proposal: <ProposalCreator mentoradoId={mentoradoId} />,
      analytics: <ConversionAnalyzer mentoradoId={mentoradoId} />,
    };

    return toolMap[activeTool] || null;
  };

  const activeToolData = tools.find(t => t.id === activeTool);

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        {/* Animated Robot */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-30 blur-xl animate-pulse" />
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="animate-bounce" style={{ animationDuration: '2s' }}>
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30 relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                  style={{ animation: 'shimmer 3s ease-in-out infinite' }}
                />
                <Bot className="h-12 w-12 text-primary-foreground relative z-10" />
              </div>
            </div>
            <Sparkles className="absolute top-0 right-0 h-5 w-5 text-primary animate-ping" style={{ animationDuration: '2s' }} />
            <Sparkles className="absolute bottom-2 left-0 h-4 w-4 text-accent animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            <Sparkles className="absolute top-4 -left-2 h-3 w-3 text-primary animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
          </div>
        </div>

        <div className="space-y-3">
          <Badge variant="outline" className={`gap-1.5 px-3 py-1 ${isUnlocked ? 'border-emerald-500/50 text-emerald-400' : 'border-primary/50 text-primary'}`}>
            {isUnlocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
            {isUnlocked ? 'Arsenal Ativo' : 'Arsenal de Vendas IA'}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Arsenal de Vendas IA
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            {isUnlocked 
              ? 'Selecione uma ferramenta abaixo para começar. Seu arsenal está pronto!'
              : '8 armas de inteligência artificial para transformar sua prospecção e fechar mais negócios.'}
          </p>
        </div>
      </div>

      {/* Active Tool View */}
      {activeTool && isUnlocked && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeToolData && (
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeToolData.color} flex items-center justify-center shadow-lg`}>
                  <activeToolData.icon className="h-4 w-4 text-white" />
                </div>
              )}
              <h2 className="text-xl font-display font-semibold">{activeToolData?.label}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTool(null)}>
              ← Voltar ao Arsenal
            </Button>
          </div>
          {renderActiveTool()}
        </div>
      )}

      {/* Tools Grid - show when no active tool */}
      {(!activeTool || !isUnlocked) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((tool, index) => (
            <Card 
              key={tool.id} 
              className={`group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer ${
                isUnlocked 
                  ? 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02]' 
                  : 'hover:border-primary/30 opacity-80 hover:opacity-100'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleToolClick(tool.id)}
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg relative`}>
                  <tool.icon className="h-5 w-5 text-white" />
                  {!isUnlocked && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
                      <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <h3 className="font-semibold text-foreground text-sm">{tool.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bottom message */}
      {!isUnlocked && !activeTool && (
        <div className="text-center pb-8">
          <div className="inline-flex items-center gap-2 bg-muted/50 backdrop-blur-sm rounded-full px-6 py-3 border border-border/50">
            <KeyRound className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Clique em uma ferramenta e insira a senha para desbloquear
            </span>
          </div>
        </div>
      )}

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-xl shadow-primary/30">
              <Lock className="h-8 w-8 text-primary-foreground" />
            </div>
            <DialogTitle className="text-center text-xl font-display">Desbloquear Arsenal IA</DialogTitle>
            <DialogDescription className="text-center">
              Digite a senha de acesso para liberar todas as ferramentas de IA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              type="password"
              placeholder="Senha de acesso"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={handlePasswordKeyPress}
              autoFocus
              className="text-center text-lg tracking-widest"
            />
            <Button onClick={handlePasswordSubmit} className="w-full gap-2">
              <ShieldCheck className="h-4 w-4" />
              Desbloquear Arsenal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
