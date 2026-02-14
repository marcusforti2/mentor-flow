import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  Database, 
  Briefcase, 
  Zap, 
  Trash2, 
  RefreshCw,
  UserPlus,
  Target,
  BookOpen,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';

const fakeNames = [
  'Ana Silva', 'Bruno Costa', 'Carla Oliveira', 'Diego Santos', 'Elena Ferreira',
  'Felipe Lima', 'Gabriela Rocha', 'Hugo Martins', 'Isabela Souza', 'João Almeida',
  'Karen Barbosa', 'Lucas Pereira', 'Marina Gomes', 'Nicolas Ribeiro', 'Olívia Castro',
  'Paulo Mendes', 'Rafaela Dias', 'Samuel Cardoso', 'Tatiana Moreira', 'Victor Araújo'
];

const fakeCompanies = [
  'Tech Solutions', 'Digital Growth', 'Sales Pro', 'Marketing Plus', 'Business Hub',
  'Innovation Co', 'Future Tech', 'Smart Sales', 'Growth Lab', 'Success Partners'
];

export function DevToolsPanel() {
  const { activeMembership } = useTenant();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [showPasswords, setShowPasswords] = useState(false);
  const [generatedUsers, setGeneratedUsers] = useState<Array<{ email: string; password: string; role: string }>>([]);
  
  const [menteeCount, setMenteeCount] = useState(5);
  const [leadsCount, setLeadsCount] = useState(20);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const generateFakeEmail = (name: string) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '.');
    return `${cleanName}.test${Math.floor(Math.random() * 9999)}@fakelbv.com`;
  };

  const generateFakePhone = () => {
    const ddd = ['11', '21', '31', '41', '51'][Math.floor(Math.random() * 5)];
    const number = Math.floor(90000000 + Math.random() * 9999999);
    return `${ddd}9${number}`;
  };

  // Generate Test Data via memberships (no legacy tables)
  const generateTestData = async () => {
    if (!activeMembership) {
      toast.error('Sem membership ativa');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setLogs([]);
    addLog('🚀 Gerando dados de teste via memberships...');

    try {
      const tenantId = activeMembership.tenant_id;
      const membershipId = activeMembership.id;

      // Generate CRM Prospections
      addLog('📈 Gerando prospecções do CRM...');
      const statuses = ['contacted', 'interested', 'meeting_scheduled', 'proposal_sent', 'closed_won', 'closed_lost'];
      const temperatures = ['quente', 'morno', 'frio'];

      for (let i = 0; i < leadsCount; i++) {
        const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
        await supabase.from('crm_prospections').insert({
          membership_id: membershipId,
          tenant_id: tenantId,
          contact_name: name,
          contact_email: generateFakeEmail(name),
          contact_phone: generateFakePhone(),
          company: fakeCompanies[Math.floor(Math.random() * fakeCompanies.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          temperature: temperatures[Math.floor(Math.random() * temperatures.length)],
          points: Math.floor(Math.random() * 30) + 1,
          notes: 'Prospecção de teste gerada automaticamente',
        });
        setProgress(((i + 1) / leadsCount) * 60);
      }
      addLog(`✅ ${leadsCount} prospecções criadas`);

      // Generate activity logs
      addLog('📊 Gerando logs de atividade...');
      const activityTypes = ['trail_started', 'lesson_completed', 'prospection_added', 'ai_tool_used'];
      for (let i = 0; i < 15; i++) {
        const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        await supabase.from('activity_logs').insert({
          membership_id: membershipId,
          tenant_id: tenantId,
          action_type: type,
          action_description: `Ação de teste: ${type}`,
          points_earned: Math.floor(Math.random() * 15) + 1,
        });
      }
      addLog('✅ 15 logs de atividade criados');
      setProgress(80);

      // Generate AI tool usage
      addLog('🤖 Gerando uso de IA...');
      const aiTools = ['bio_generator', 'cold_message', 'lead_qualifier', 'script_generator'];
      for (let i = 0; i < 8; i++) {
        await supabase.from('ai_tool_usage').insert({
          membership_id: membershipId,
          tenant_id: tenantId,
          tool_type: aiTools[Math.floor(Math.random() * aiTools.length)],
        });
      }
      addLog('✅ 8 usos de IA criados');

      setProgress(100);
      addLog('🎉 Dados de teste gerados com sucesso!');
      toast.success('Dados de teste gerados!');
    } catch (error: any) {
      addLog(`❌ Erro: ${error.message}`);
      toast.error('Erro ao gerar dados');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate validated business (trails, badges, etc.) — uses tenant context
  const generateValidatedBusiness = async () => {
    if (!activeMembership) {
      toast.error('Sem membership ativa');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setLogs([]);
    addLog('🚀 Criando negócio completo via memberships...');

    try {
      const tenantId = activeMembership.tenant_id;
      const membershipId = activeMembership.id;

      // Create Trails
      addLog('📚 Criando trilhas de treinamento...');
      const trailsData = [
        { title: 'Prospecção Magnética', description: 'Domine a arte de atrair clientes ideais' },
        { title: 'Fechamento de Alto Ticket', description: 'Venda produtos premium com confiança' },
        { title: 'Mindset de Campeão', description: 'Desenvolva a mentalidade de um top performer' }
      ];

      for (const trail of trailsData) {
        const { data: newTrail } = await supabase.from('trails').insert({
          tenant_id: tenantId,
          creator_membership_id: membershipId,
          title: trail.title,
          description: trail.description,
          is_published: true,
          thumbnail_url: `https://picsum.photos/seed/${trail.title}/800/400`
        }).select().single();

        if (newTrail) {
          const modules = ['Fundamentos', 'Técnicas Avançadas', 'Prática Intensiva'];
          for (let i = 0; i < modules.length; i++) {
            const { data: newModule } = await supabase.from('trail_modules').insert({
              trail_id: newTrail.id,
              title: modules[i],
              description: `Módulo ${i + 1} de ${trail.title}`,
              order_index: i
            }).select().single();

            if (newModule) {
              for (let j = 0; j < 3; j++) {
                await supabase.from('trail_lessons').insert({
                  module_id: newModule.id,
                  title: `Aula ${j + 1}: ${modules[i]}`,
                  description: `Conteúdo da aula ${j + 1}`,
                  content_type: 'video',
                  content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                  duration_minutes: Math.floor(Math.random() * 20) + 10,
                  order_index: j
                });
              }
            }
          }
        }
      }
      addLog('✅ 3 trilhas com módulos e aulas criadas');
      setProgress(40);

      // Create Behavioral Questions
      addLog('📋 Criando perguntas comportamentais...');
      const questions = [
        {
          question_text: 'Como você prefere abordar um novo cliente?',
          options: [
            { text: 'Direto ao ponto, apresentando a solução', value: 'D' },
            { text: 'Construindo rapport primeiro', value: 'I' },
            { text: 'Fazendo perguntas para entender a situação', value: 'S' },
            { text: 'Apresentando dados e estatísticas', value: 'C' }
          ]
        },
        {
          question_text: 'Quando enfrenta uma objeção, você geralmente:',
          options: [
            { text: 'Rebate imediatamente com argumentos', value: 'D' },
            { text: 'Tenta entender o sentimento por trás', value: 'I' },
            { text: 'Pede tempo para pensar na resposta', value: 'S' },
            { text: 'Busca dados para contra-argumentar', value: 'C' }
          ]
        }
      ];

      for (let i = 0; i < questions.length; i++) {
        await supabase.from('behavioral_questions').insert({
          mentor_id: membershipId, // legacy required field, using membership_id as placeholder
          owner_membership_id: membershipId,
          question_text: questions[i].question_text,
          options: questions[i].options,
          question_type: 'disc',
          order_index: i,
          is_active: true
        });
      }
      addLog('✅ Perguntas comportamentais criadas');
      setProgress(100);

      addLog('🎉 Negócio completo criado com sucesso!');
      toast.success('Negócio validado criado com sucesso!');
    } catch (error: any) {
      addLog(`❌ Erro: ${error.message}`);
      toast.error('Erro ao criar negócio');
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear test data
  const clearTestData = async () => {
    if (!confirm('Tem certeza? Isso vai limpar TODOS os dados de teste!')) return;

    setIsGenerating(true);
    setLogs([]);
    addLog('🗑️ Limpando dados de teste...');

    try {
      await supabase.from('crm_interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addLog('✅ Interações removidas');
      await supabase.from('crm_prospections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addLog('✅ Prospecções removidas');
      await supabase.from('trail_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addLog('✅ Progresso removido');

      addLog('🎉 Dados de teste limpos!');
      toast.success('Dados limpos com sucesso!');
    } catch (error: any) {
      addLog(`❌ Erro: ${error.message}`);
      toast.error('Erro ao limpar dados');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            DevTools
          </h1>
          <p className="text-muted-foreground mt-1">
            Ferramentas de desenvolvimento e geração de dados de teste
          </p>
        </div>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
          ⚠️ Apenas Admin Master
        </Badge>
      </div>

      <Tabs defaultValue="data" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Negócio
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Ações
          </TabsTrigger>
        </TabsList>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                Gerar Dados de Teste
              </CardTitle>
              <CardDescription>
                Popula o banco com prospecções, atividades e uso de IA via memberships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prospecções do CRM</Label>
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={leadsCount}
                  onChange={(e) => setLeadsCount(parseInt(e.target.value) || 20)}
                />
              </div>

              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <p className="text-sm font-medium">Será gerado:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {leadsCount} prospecções no CRM</li>
                  <li>• 15 logs de atividade</li>
                  <li>• 8 usos de IA</li>
                </ul>
              </div>

              <Button 
                onClick={generateTestData} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Gerar Dados
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-emerald-500" />
                Criar Negócio Validado
              </CardTitle>
              <CardDescription>
                Configura trilhas e perguntas comportamentais via memberships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <BookOpen className="h-4 w-4" />
                    <span className="font-medium">Trilhas</span>
                  </div>
                  <p className="text-sm text-muted-foreground">3 trilhas com 3 módulos e 9 aulas cada</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-purple-500">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Comportamental</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Perguntas DISC configuradas</p>
                </div>
              </div>

              <Button 
                onClick={generateValidatedBusiness} 
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Criar Negócio Completo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Limpar Dados
                </CardTitle>
                <CardDescription>
                  Remove todos os dados de teste (exceto usuários)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  onClick={clearTestData}
                  disabled={isGenerating}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Tudo
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Reset Completo
                </CardTitle>
                <CardDescription>
                  Limpa e recria tudo do zero
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    await clearTestData();
                    await generateValidatedBusiness();
                    await generateTestData();
                  }}
                  disabled={isGenerating}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset & Recriar
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Progress Bar */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground mt-2">
              {Math.round(progress)}% completo
            </p>
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 w-full rounded-md border bg-muted/30 p-4">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    log.includes('❌') && 'text-destructive',
                    log.includes('✅') && 'text-emerald-500',
                    log.includes('🎉') && 'text-primary font-semibold'
                  )}>
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
