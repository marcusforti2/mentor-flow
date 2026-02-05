import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Users, User, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
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

interface MembershipOption {
  id: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
  user_name: string | null;
  user_email: string | null;
}

export default function PreviewPage() {
  const { switchMembership, memberships } = useTenant();
  const navigate = useNavigate();
  const [selectedMentee, setSelectedMentee] = useState<string>('');
  const [menteeOptions, setMenteeOptions] = useState<MembershipOption[]>([]);
  const [mentorOptions, setMentorOptions] = useState<MembershipOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all mentee and mentor memberships from ALL tenants
  useEffect(() => {
    const fetchAllMemberships = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('memberships')
          .select('id, role, status, tenant_id, user_id, tenants(name)')
          .in('role', ['mentee', 'mentor'])
          .eq('status', 'active');

        if (error) {
          console.error('[PreviewPage] Error fetching memberships:', error);
          return;
        }

        if (!data || data.length === 0) {
          console.log('[PreviewPage] No mentee/mentor memberships found');
          setMenteeOptions([]);
          setMentorOptions([]);
          return;
        }

        // Fetch profiles for user names
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
            tenant_name: tenantData?.name || 'Sem nome',
            user_name: profile?.full_name || null,
            user_email: profile?.email || null,
          };
        });

        setMenteeOptions(options.filter(o => o.role === 'mentee'));
        setMentorOptions(options.filter(o => o.role === 'mentor'));
      } catch (err) {
        console.error('[PreviewPage] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMemberships();
  }, []);

  const handleMentorPreview = async () => {
    const mentor = mentorOptions[0];
    if (mentor) {
      await switchMembership(mentor.id);
    } else {
      navigate('/mentor');
    }
  };

  const handleMenteePreview = async () => {
    if (selectedMentee) {
      await switchMembership(selectedMentee);
    }
  };

  const getMenteeLabel = (m: MembershipOption) => {
    const name = m.user_name || m.user_email || `ID ${m.id.slice(0, 8)}`;
    return `${name} — ${m.tenant_name}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-100">
          Preview do Sistema
        </h1>
        <p className="text-slate-400 mt-1">
          Visualize as áreas do Mentor e Mentorado usando memberships reais
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200 font-medium">
              Preview troca o contexto ativo para a membership selecionada
            </p>
            <p className="text-xs text-amber-300/70 mt-1">
              Você verá o sistema exatamente como o usuário selecionado. Use o SwitchContext para retornar.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mentor Preview */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Área do Mentor
              {mentorOptions.length > 0 && (
                <Badge variant="outline" className="ml-auto text-primary border-primary/50">
                  {mentorOptions.length} disponíveis
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Visualize o painel do mentor com todos os mentorados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-900/50 space-y-2">
              <p className="text-sm text-slate-300">O que você verá:</p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Dashboard com métricas dos mentorados</li>
                <li>• Lista completa de mentorados</li>
                <li>• Trilhas e progresso</li>
                <li>• Centro SOS e rankings</li>
              </ul>
            </div>

            <Button 
              onClick={handleMentorPreview}
              disabled={loading || mentorOptions.length === 0}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              {mentorOptions.length === 0 && !loading 
                ? 'Nenhum mentor disponível' 
                : 'Abrir Preview do Mentor'}
              {mentorOptions.length > 0 && <ExternalLink className="ml-2 h-3 w-3" />}
            </Button>
          </CardContent>
        </Card>

        {/* Mentee Preview */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              Área do Mentorado
              {menteeOptions.length > 0 && (
                <Badge variant="outline" className="ml-auto text-accent border-accent/50">
                  {menteeOptions.length} disponíveis
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Visualize a experiência individual de um mentorado específico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Selecione um mentorado:</label>
              <Select value={selectedMentee} onValueChange={setSelectedMentee}>
                <SelectTrigger className="bg-slate-900/50 border-slate-700">
                  <SelectValue placeholder={loading ? 'Carregando...' : 'Escolha um mentorado...'} />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <SelectItem value="loading" disabled>
                      Carregando mentorados...
                    </SelectItem>
                  ) : menteeOptions.length > 0 ? (
                    menteeOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {getMenteeLabel(m)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Nenhum mentorado cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/50 space-y-2">
              <p className="text-sm text-slate-300">O que você verá:</p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Dashboard pessoal do mentorado</li>
                <li>• Trilhas e progresso individual</li>
                <li>• CRM pessoal</li>
                <li>• Ranking (apenas posição, sem nomes)</li>
              </ul>
            </div>

            <Button 
              onClick={handleMenteePreview}
              disabled={!selectedMentee}
              className="w-full bg-accent hover:bg-accent/90"
            >
              <Eye className="mr-2 h-4 w-4" />
              Abrir Preview do Mentorado
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dev Tools Section */}
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
            <label className="text-sm text-slate-300">Memberships disponíveis:</label>
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
