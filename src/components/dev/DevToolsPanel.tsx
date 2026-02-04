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

// Fake data generators
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

const fakeBusinessTypes = [
  'Consultoria', 'Agência de Marketing', 'Software House', 'E-commerce', 'Serviços B2B',
  'Coaching', 'Infoprodutos', 'Marketplace', 'SaaS', 'Educação Online'
];

export function DevToolsPanel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [showPasswords, setShowPasswords] = useState(false);
  const [generatedUsers, setGeneratedUsers] = useState<Array<{ email: string; password: string; role: string }>>([]);
  
  // Configs
  const [mentorCount, setMentorCount] = useState(1);
  const [mentoradoCount, setMentoradoCount] = useState(5);
  const [leadsCount, setLeadsCount] = useState(20);
  const [trailsCount, setTrailsCount] = useState(3);

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

  // Generate Test Users
  const generateTestUsers = async () => {
    setIsGenerating(true);
    setProgress(0);
    setLogs([]);
    setGeneratedUsers([]);
    addLog('🚀 Iniciando geração de usuários de teste...');

    const totalUsers = mentorCount + mentoradoCount;
    let created = 0;
    const users: Array<{ email: string; password: string; role: string }> = [];

    try {
      // Get or create a mentor first
      const { data: existingMentor } = await supabase
        .from('mentors')
        .select('id')
        .limit(1)
        .single();

      let mentorId = existingMentor?.id;

      // Create Mentors
      for (let i = 0; i < mentorCount; i++) {
        const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
        const email = generateFakeEmail(name);
        const password = 'Test@123456';

        addLog(`📧 Criando mentor: ${email}`);

        // Create user via edge function
        const { data, error } = await supabase.functions.invoke('verify-otp', {
          body: {
            email,
            code: '000000', // Special code for dev
            fullName: name,
            phone: generateFakePhone(),
            userType: 'mentor',
            devMode: true
          }
        });

        if (error) {
          addLog(`❌ Erro ao criar ${email}: ${error.message}`);
        } else {
          users.push({ email, password, role: 'mentor' });
          if (!mentorId && data?.userId) {
            // Get the mentor_id for this user
            const { data: mentorData } = await supabase
              .from('mentors')
              .select('id')
              .eq('user_id', data.userId)
              .single();
            mentorId = mentorData?.id;
          }
          addLog(`✅ Mentor criado: ${email}`);
        }

        created++;
        setProgress((created / totalUsers) * 100);
      }

      if (!mentorId) {
        addLog('❌ Nenhum mentor disponível. Criando mentor padrão...');
        return;
      }

      // Create Mentorados
      for (let i = 0; i < mentoradoCount; i++) {
        const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
        const email = generateFakeEmail(name);
        const password = 'Test@123456';

        addLog(`📧 Criando mentorado: ${email}`);

        const { data, error } = await supabase.functions.invoke('verify-otp', {
          body: {
            email,
            code: '000000',
            fullName: name,
            phone: generateFakePhone(),
            userType: 'mentorado',
            devMode: true,
            mentorId
          }
        });

        if (error) {
          addLog(`❌ Erro ao criar ${email}: ${error.message}`);
        } else {
          users.push({ email, password, role: 'mentorado' });
          addLog(`✅ Mentorado criado: ${email}`);
        }

        created++;
        setProgress((created / totalUsers) * 100);
      }

      setGeneratedUsers(users);
      addLog(`🎉 Geração concluída! ${users.length} usuários criados.`);
      toast.success(`${users.length} usuários de teste criados!`);

    } catch (error: any) {
      addLog(`❌ Erro geral: ${error.message}`);
      toast.error('Erro ao gerar usuários');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Test Data (Leads, Prospections, etc.)
  const generateTestData = async () => {
    setIsGenerating(true);
    setProgress(0);
    setLogs([]);
    addLog('🚀 Iniciando geração de dados de teste...');

    try {
      // Get a mentor
      const { data: mentor } = await supabase
        .from('mentors')
        .select('id')
        .limit(1)
        .single();

      if (!mentor) {
        addLog('❌ Nenhum mentor encontrado!');
        toast.error('Crie um mentor primeiro');
        return;
      }

      // Get mentorados
      const { data: mentorados } = await supabase
        .from('mentorados')
        .select('id')
        .eq('mentor_id', mentor.id);

      addLog(`📊 Encontrados ${mentorados?.length || 0} mentorados`);

      // Generate CRM Leads for mentor
      addLog('📈 Gerando leads do CRM...');
      const stages = ['lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
      const sources = ['Instagram', 'LinkedIn', 'Indicação', 'Google', 'Facebook', 'Orgânico'];

      for (let i = 0; i < leadsCount; i++) {
        const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
        await supabase.from('crm_leads').insert({
          mentor_id: mentor.id,
          name,
          email: generateFakeEmail(name),
          phone: generateFakePhone(),
          company: fakeCompanies[Math.floor(Math.random() * fakeCompanies.length)],
          stage: stages[Math.floor(Math.random() * stages.length)],
          source: sources[Math.floor(Math.random() * sources.length)],
          value: Math.floor(Math.random() * 50000) + 1000,
          notes: `Lead de teste gerado automaticamente`
        });

        setProgress(((i + 1) / leadsCount) * 30);
      }
      addLog(`✅ ${leadsCount} leads criados`);

      // Generate prospections for mentorados
      if (mentorados && mentorados.length > 0) {
        addLog('🎯 Gerando prospecções...');
        const temperatures = ['cold', 'warm', 'hot'];
        const statuses = ['contacted', 'interested', 'meeting_scheduled', 'proposal_sent', 'closed_won', 'closed_lost'];

        for (const mentorado of mentorados) {
          const prospCount = Math.floor(Math.random() * 10) + 5;
          for (let i = 0; i < prospCount; i++) {
            const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
            await supabase.from('crm_prospections').insert({
              mentorado_id: mentorado.id,
              contact_name: name,
              contact_email: generateFakeEmail(name),
              contact_phone: generateFakePhone(),
              company: fakeCompanies[Math.floor(Math.random() * fakeCompanies.length)],
              temperature: temperatures[Math.floor(Math.random() * temperatures.length)],
              status: statuses[Math.floor(Math.random() * statuses.length)],
              points: Math.floor(Math.random() * 10) + 1,
              notes: 'Prospecção de teste'
            });
          }
        }
        addLog(`✅ Prospecções criadas para ${mentorados.length} mentorados`);
        setProgress(60);

        // Generate ranking entries
        addLog('🏆 Gerando ranking...');
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        for (const mentorado of mentorados) {
          await supabase.from('ranking_entries').insert({
            mentorado_id: mentorado.id,
            points: Math.floor(Math.random() * 500) + 50,
            period_type: 'weekly',
            period_start: weekStart.toISOString().split('T')[0],
            period_end: weekEnd.toISOString().split('T')[0]
          });
        }
        addLog('✅ Rankings criados');
        setProgress(80);

        // Generate streaks
        addLog('🔥 Gerando streaks...');
        for (const mentorado of mentorados) {
          const streak = Math.floor(Math.random() * 30) + 1;
          await supabase.from('user_streaks').upsert({
            mentorado_id: mentorado.id,
            current_streak: streak,
            longest_streak: streak + Math.floor(Math.random() * 10),
            last_access_date: new Date().toISOString().split('T')[0]
          }, { onConflict: 'mentorado_id' });
        }
        addLog('✅ Streaks criados');
      }

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

  // Generate validated business
  const generateValidatedBusiness = async () => {
    setIsGenerating(true);
    setProgress(0);
    setLogs([]);
    addLog('🚀 Criando negócio completo e validado...');

    try {
      // Get mentor
      const { data: mentor } = await supabase
        .from('mentors')
        .select('id, user_id')
        .limit(1)
        .single();

      if (!mentor) {
        addLog('❌ Nenhum mentor encontrado!');
        return;
      }

      // Update mentor config
      addLog('🏢 Configurando mentor...');
      await supabase.from('mentors').update({
        business_name: 'LBV Academy Pro',
        bio: 'Mentoria de alta performance para vendedores que querem escalar seus resultados',
        website: 'https://lbvacademy.com',
        primary_color: '#D4AF37',
        secondary_color: '#3B82F6'
      }).eq('id', mentor.id);
      setProgress(10);

      // Create Trails
      addLog('📚 Criando trilhas de treinamento...');
      const trailsData = [
        { title: 'Prospecção Magnética', description: 'Domine a arte de atrair clientes ideais' },
        { title: 'Fechamento de Alto Ticket', description: 'Venda produtos premium com confiança' },
        { title: 'Mindset de Campeão', description: 'Desenvolva a mentalidade de um top performer' }
      ];

      for (const trail of trailsData) {
        const { data: newTrail } = await supabase.from('trails').insert({
          mentor_id: mentor.id,
          title: trail.title,
          description: trail.description,
          is_published: true,
          thumbnail_url: `https://picsum.photos/seed/${trail.title}/800/400`
        }).select().single();

        if (newTrail) {
          // Create modules
          const modules = ['Fundamentos', 'Técnicas Avançadas', 'Prática Intensiva'];
          for (let i = 0; i < modules.length; i++) {
            const { data: newModule } = await supabase.from('trail_modules').insert({
              trail_id: newTrail.id,
              title: modules[i],
              description: `Módulo ${i + 1} de ${trail.title}`,
              order_index: i
            }).select().single();

            if (newModule) {
              // Create lessons
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

      // Create Badges
      addLog('🏅 Criando badges...');
      const badges = [
        { name: 'Primeiro Passo', description: 'Completou primeira aula', criteria: 'first_lesson', points_required: 10 },
        { name: 'Prospector', description: 'Registrou 10 prospecções', criteria: 'prospections_10', points_required: 50 },
        { name: 'Maratonista', description: '7 dias seguidos de acesso', criteria: 'streak_7', points_required: 100 },
        { name: 'Vendedor Bronze', description: 'Fechou primeira venda', criteria: 'first_sale', points_required: 200 },
        { name: 'Vendedor Prata', description: '5 vendas fechadas', criteria: 'sales_5', points_required: 500 },
        { name: 'Vendedor Ouro', description: '10 vendas fechadas', criteria: 'sales_10', points_required: 1000 },
        { name: 'Mestre das Trilhas', description: 'Completou todas as trilhas', criteria: 'all_trails', points_required: 2000 }
      ];

      for (const badge of badges) {
        await supabase.from('badges').insert({
          mentor_id: mentor.id,
          ...badge,
          icon_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${badge.name}`
        });
      }
      addLog('✅ 7 badges criados');
      setProgress(60);

      // Create Rewards
      addLog('🎁 Criando catálogo de prêmios...');
      const rewards = [
        { name: 'Caneca LBV', description: 'Caneca exclusiva da mentoria', points_cost: 100, category: 'physical' },
        { name: 'Camiseta LBV', description: 'Camiseta premium da mentoria', points_cost: 250, category: 'physical' },
        { name: 'Mentoria Individual 30min', description: 'Sessão exclusiva com o mentor', points_cost: 500, category: 'experience' },
        { name: 'Acesso VIP', description: 'Acesso a conteúdo exclusivo', points_cost: 1000, category: 'digital' },
        { name: 'Kit Completo LBV', description: 'Caneca + Camiseta + Boné', points_cost: 2000, category: 'physical' }
      ];

      for (const reward of rewards) {
        await supabase.from('reward_catalog').insert({
          ...reward,
          is_active: true,
          stock: 100,
          image_url: `https://picsum.photos/seed/${reward.name}/400/400`
        });
      }
      addLog('✅ 5 prêmios cadastrados');
      setProgress(80);

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
          mentor_id: mentor.id,
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

  // Clear all test data
  const clearTestData = async () => {
    if (!confirm('Tem certeza? Isso vai limpar TODOS os dados de teste!')) return;

    setIsGenerating(true);
    setLogs([]);
    addLog('🗑️ Limpando dados de teste...');

    try {
      // Delete in order of dependencies
      await supabase.from('crm_interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addLog('✅ Interações removidas');

      await supabase.from('crm_prospections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addLog('✅ Prospecções removidas');

      await supabase.from('crm_leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addLog('✅ Leads removidos');

      await supabase.from('ranking_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addLog('✅ Rankings removidos');

      await supabase.from('user_streaks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      addLog('✅ Streaks removidos');

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
      {/* Header */}
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

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
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

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Gerar Usuários de Teste
              </CardTitle>
              <CardDescription>
                Cria usuários fake com roles definidos para testes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade de Mentores</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={mentorCount}
                    onChange={(e) => setMentorCount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de Mentorados</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={mentoradoCount}
                    onChange={(e) => setMentoradoCount(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <Button 
                onClick={generateTestUsers} 
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
                    <UserPlus className="mr-2 h-4 w-4" />
                    Gerar Usuários
                  </>
                )}
              </Button>

              {/* Generated Users List */}
              {generatedUsers.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Usuários Gerados</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2 max-h-48 overflow-auto">
                    {generatedUsers.map((user, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-background">
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'mentor' ? 'default' : 'secondary'} className="text-xs">
                            {user.role}
                          </Badge>
                          <span className="font-mono">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">
                            {showPasswords ? user.password : '••••••••'}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(`${user.email}\n${user.password}`)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                Gerar Dados de Teste
              </CardTitle>
              <CardDescription>
                Popula o banco com leads, prospecções, rankings, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leads do CRM</Label>
                  <Input
                    type="number"
                    min={5}
                    max={100}
                    value={leadsCount}
                    onChange={(e) => setLeadsCount(parseInt(e.target.value) || 20)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trilhas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={trailsCount}
                    onChange={(e) => setTrailsCount(parseInt(e.target.value) || 3)}
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <p className="text-sm font-medium">Será gerado:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {leadsCount} leads no CRM do mentor</li>
                  <li>• 5-15 prospecções por mentorado</li>
                  <li>• Rankings semanais para todos</li>
                  <li>• Streaks de acesso variados</li>
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
                Configura um negócio completo com trilhas, badges, prêmios e mais
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
                  <div className="flex items-center gap-2 text-primary">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium">Badges</span>
                  </div>
                  <p className="text-sm text-muted-foreground">7 badges com critérios variados</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-accent">
                    <Target className="h-4 w-4" />
                    <span className="font-medium">Prêmios</span>
                  </div>
                  <p className="text-sm text-muted-foreground">5 itens no catálogo de recompensas</p>
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
