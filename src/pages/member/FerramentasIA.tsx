import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { useAuth } from '@/hooks/useAuth';
 import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  MessageSquare, 
  Pen, 
  FileSignature, 
  TrendingUp, 
  Bot,
  Sparkles,
  AlertCircle,
  Target,
  User,
  BarChart3,
  Mic
} from 'lucide-react';
import { ObjectionSimulator } from '@/components/ai-tools/ObjectionSimulator';
import { ContentGenerator } from '@/components/ai-tools/ContentGenerator';
import { ProposalCreator } from '@/components/ai-tools/ProposalCreator';
import { ConversionAnalyzer } from '@/components/ai-tools/ConversionAnalyzer';
import { TrainingAnalyzer } from '@/components/ai-tools/TrainingAnalyzer';
import { VirtualMentor } from '@/components/ai-tools/VirtualMentor';
import { LeadQualifier } from '@/components/ai-tools/LeadQualifier';
import { BioGenerator } from '@/components/ai-tools/BioGenerator';
import { CommunicationHub } from '@/components/ai-tools/CommunicationHub';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const tools = [
  { id: 'qualifier', label: 'Qualificação', icon: Target, description: 'Qualificador de Leads com IA' },
  { id: 'communication', label: 'Comunicação', icon: MessageSquare, description: 'Scripts, Follow-up e Cold Messages' },
  { id: 'roleplay', label: 'Role-Play', icon: FileText, description: 'Simulador de Objeções' },
  { id: 'proposal', label: 'Propostas', icon: FileSignature, description: 'Criador de Propostas' },
  { id: 'analytics', label: 'Análise', icon: TrendingUp, description: 'Análise de Conversão e Calls' },
  { id: 'bio', label: 'Bio', icon: User, description: 'Gerador de Bio Otimizada' },
  { id: 'content', label: 'Conteúdo', icon: Pen, description: 'Gerador de Conteúdo' },
  { id: 'mentor', label: 'Mentor', icon: Bot, description: 'Mentor Virtual 24/7' },
];

export default function FerramentasIA() {
   const { user } = useAuth();
   const { isMentor } = useTenant();
  const navigate = useNavigate();
  const [mentoradoId, setMentoradoId] = useState<string | null>(null);
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMentoradoData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: mentorado } = await supabase
          .from('mentorados')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (mentorado) {
          setMentoradoId(mentorado.id);

          const { data: profile } = await supabase
            .from('mentorado_business_profiles')
            .select('id, business_name, main_offer')
            .eq('mentorado_id', mentorado.id)
            .single();

          setHasBusinessProfile(!!(profile?.business_name || profile?.main_offer));
        } else {
          setMentoradoId(user.id);
        }
      } catch (error) {
        console.error('Error fetching mentorado data:', error);
        if (user) setMentoradoId(user.id);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentoradoData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Carregando ferramentas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Arsenal de Vendas</h1>
          <p className="text-muted-foreground">8 armas de IA para dominar suas negociações</p>
        </div>
      </div>

      {/* Business Profile Alert */}
      {!hasBusinessProfile && (
        <Alert variant="default" className="border-warning/50 bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Complete seu perfil de negócio para resultados personalizados.
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/app/perfil')}
            >
              Completar Perfil
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tools Tabs */}
      <Tabs defaultValue="qualifier" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-2 rounded-xl">
          {tools.map((tool) => (
            <TabsTrigger
              key={tool.id}
              value={tool.id}
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-lg transition-all"
            >
              <tool.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tool.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="qualifier">
            <LeadQualifier mentoradoId={mentoradoId} />
          </TabsContent>

          <TabsContent value="communication">
            <CommunicationHub mentoradoId={mentoradoId} />
          </TabsContent>

          <TabsContent value="roleplay">
            <ObjectionSimulator mentoradoId={mentoradoId} />
          </TabsContent>

          <TabsContent value="proposal">
            <ProposalCreator mentoradoId={mentoradoId} />
          </TabsContent>

          <TabsContent value="analytics">
            <Tabs defaultValue="training" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-4">
                <TabsTrigger value="training" className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Calls & Conversas
                </TabsTrigger>
                <TabsTrigger value="conversion" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Pipeline
                </TabsTrigger>
              </TabsList>
              <TabsContent value="training">
                <TrainingAnalyzer mentoradoId={mentoradoId} />
              </TabsContent>
              <TabsContent value="conversion">
                <ConversionAnalyzer mentoradoId={mentoradoId} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="bio">
            <BioGenerator mentoradoId={mentoradoId} />
          </TabsContent>

          <TabsContent value="content">
            <ContentGenerator mentoradoId={mentoradoId} />
          </TabsContent>

          <TabsContent value="mentor">
            <VirtualMentor mentoradoId={mentoradoId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
