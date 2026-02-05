import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Users, User, ExternalLink, AlertTriangle, Loader2, Rocket, RefreshCw, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MembershipOption {
  id: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
  user_name: string | null;
  user_email: string | null;
}

const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';

export default function PreviewPage() {
  const { switchMembership, memberships } = useTenant();
  const navigate = useNavigate();
  const [selectedMentee, setSelectedMentee] = useState<string>('');
  const [menteeOptions, setMenteeOptions] = useState<MembershipOption[]>([]);
  const [mentorOptions, setMentorOptions] = useState<MembershipOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const fetchSandboxMemberships = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, role, status, tenant_id, user_id, tenants(name)')
        .eq('tenant_id', SANDBOX_TENANT_ID)
        .in('role', ['mentee', 'mentor'])
        .eq('status', 'active');

      if (error) {
        console.error('[PreviewPage] Error:', error);
        return;
      }

      if (!data || data.length === 0) {
        setMenteeOptions([]);
        setMentorOptions([]);
        return;
      }

      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const options: MembershipOption[] = data.map(m => {
        const profile = profileMap.get(m.user_id);
        const tenantData = m.tenants as any;
        return {
          id: m.id,
          role: m.role,
          tenant_id: m.tenant_id,
          tenant_name: tenantData?.name || 'Sandbox',
          user_name: profile?.full_name || null,
          user_email: profile?.email || null,
        };
      });

      setMenteeOptions(options.filter(o => o.role === 'mentee'));
      setMentorOptions(options.filter(o => o.role === 'mentor'));
      
      if (options.length > 0) setSeeded(true);
    } catch (err) {
      console.error('[PreviewPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSandboxMemberships();
  }, []);

  const handleSeedSandbox = async () => {
    setSeeding(true);
    try {
      toast.info('Preparando ambiente de preview... Isso pode levar até 30 segundos.');
      
      const { data, error } = await supabase.functions.invoke('seed-sandbox', {
        body: {},
      });

      if (error) {
        console.error('[PreviewPage] Seed error:', error);
        toast.error('Erro ao preparar o preview: ' + error.message);
        return;
      }

      if (data?.error) {
        toast.error('Erro: ' + data.error);
        return;
      }

      toast.success(`Preview preparado! ${data.mentees_created} mentorados, ${data.trails_created} trilhas e ${data.meetings_created} eventos criados.`);
      setSeeded(true);
      
      // Refresh the memberships list
      await fetchSandboxMemberships();
    } catch (err: any) {
      console.error('[PreviewPage] Seed error:', err);
      toast.error('Erro ao preparar o preview');
    } finally {
      setSeeding(false);
    }
  };

  const handleMentorPreview = async () => {
    const mentor = mentorOptions[0];
    if (mentor) {
      await switchMembership(mentor.id);
      navigate('/admin');
    }
  };

  const handleMenteePreview = async () => {
    if (selectedMentee) {
      await switchMembership(selectedMentee);
      navigate('/app');
    }
  };

  const getMenteeLabel = (m: MembershipOption) => {
    return m.user_name || m.user_email || `Mentorado ${m.id.slice(0, 8)}`;
  };

  const hasSandboxData = menteeOptions.length > 0 || mentorOptions.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-100">
          Preview do Sistema
        </h1>
        <p className="text-slate-400 mt-1">
          Explore as áreas de Mentor e Mentorado com dados de demonstração
        </p>
      </div>

      {/* Seed Section */}
      {!hasSandboxData && !loading && (
        <Card className="bg-gradient-to-br from-primary/20 to-accent/10 border-primary/30">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Rocket className="h-12 w-12 text-primary" />
              <div>
                <h2 className="text-xl font-bold text-slate-100">Preparar Ambiente de Preview</h2>
                <p className="text-slate-400 mt-2 max-w-lg">
                  Clique abaixo para criar automaticamente dados de demonstração: 
                  1 mentor, 10 mentorados, 2 trilhas completas, calendário com eventos, 
                  CRM com leads e muito mais.
                </p>
              </div>
              <Button
                onClick={handleSeedSandbox}
                disabled={seeding}
                size="lg"
                className="bg-primary hover:bg-primary/90 px-8 py-6 text-lg"
              >
                {seeding ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando dados de demo...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-5 w-5" />
                    Preparar Preview
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Preview Cards */}
      {hasSandboxData && (
        <>
          {/* Status Banner */}
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm text-emerald-200 font-medium">
                    Preview pronto — {mentorOptions.length} mentor(es) e {menteeOptions.length} mentorado(s) disponíveis
                  </p>
                  <p className="text-xs text-emerald-300/70 mt-0.5">
                    O preview troca o contexto ativo. Use o botão de retorno no topo para voltar ao Master.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedSandbox}
                disabled={seeding}
                className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
              >
                {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Recriar</span>
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mentor Preview */}
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Área do Mentor
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Painel completo com dashboard, mentorados, trilhas, calendário e CRM
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mentorOptions.length > 0 && (
                  <div className="p-3 rounded-lg bg-slate-900/50 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {(mentorOptions[0].user_name || 'M')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{mentorOptions[0].user_name || 'Mentor Demo'}</p>
                      <p className="text-xs text-slate-400">{menteeOptions.length} mentorados vinculados</p>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-slate-900/50 space-y-2">
                  <p className="text-sm text-slate-300">O que você verá:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Dashboard com métricas de {menteeOptions.length} mentorados</li>
                    <li>• 2 trilhas completas com aulas</li>
                    <li>• Calendário com reuniões agendadas</li>
                    <li>• CRM com leads de todos os mentorados</li>
                    <li>• Ranking e engajamento</li>
                  </ul>
                </div>

                <Button
                  onClick={handleMentorPreview}
                  disabled={mentorOptions.length === 0}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Entrar como Mentor
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>

            {/* Mentee Preview */}
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <User className="h-5 w-5 text-accent" />
                  Área do Mentorado
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Experiência individual com dashboard, trilhas, CRM e ferramentas IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Selecione um mentorado:</label>
                  <Select value={selectedMentee} onValueChange={setSelectedMentee}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700">
                      <SelectValue placeholder="Escolha um mentorado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {menteeOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {getMenteeLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/50 space-y-2">
                  <p className="text-sm text-slate-300">O que você verá:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Dashboard pessoal com métricas</li>
                    <li>• Trilhas e progresso individual</li>
                    <li>• CRM com leads do mentorado</li>
                    <li>• Ferramentas de IA</li>
                    <li>• Ranking (posição anônima)</li>
                  </ul>
                </div>

                <Button
                  onClick={handleMenteePreview}
                  disabled={!selectedMentee}
                  className="w-full bg-accent hover:bg-accent/90"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Entrar como Mentorado
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Impersonation Section */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Impersonation (Dev)
            <Badge variant="outline" className="ml-2 text-amber-400 border-amber-400/50">
              Debug Only
            </Badge>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Troque o contexto para qualquer membership existente. Logs são registrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
            <p className="text-sm text-red-300">
              ⚠️ Impersonation troca o contexto ativo. Use apenas para debug.
              <br />
              <span className="text-xs text-red-400">
                Todos os acessos são registrados na tabela impersonation_logs.
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Memberships do seu usuário:</label>
            <div className="grid gap-2">
              {memberships.map((m) => (
                <Button
                  key={m.id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left border-slate-700 hover:bg-slate-700"
                  onClick={() => switchMembership(m.id)}
                >
                  <Badge 
                    variant="outline" 
                    className={`mr-2 ${
                      m.role === 'master_admin' ? 'text-amber-400 border-amber-400/50' :
                      m.role === 'mentor' ? 'text-primary border-primary/50' :
                      'text-accent border-accent/50'
                    }`}
                  >
                    {m.role}
                  </Badge>
                  <span className="text-slate-300">{m.tenant_name}</span>
                  <span className="text-slate-500 text-xs ml-auto">{m.id.slice(0, 8)}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
