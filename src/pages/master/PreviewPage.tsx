import { useState, useEffect, useRef } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Eye, Users, User, Loader2, Rocket, RefreshCw, CheckCircle, 
  ArrowRight, Briefcase, TrendingUp, BarChart3, Flame, Snowflake, Sun
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SandboxMember {
  id: string;
  role: string;
  tenant_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  leads_count?: number;
  activity_level?: 'alta' | 'media' | 'baixa' | 'inativa';
  points?: number;
  temperature?: string;
}

interface SandboxStats {
  trails: number;
  leads: number;
  meetings: number;
  mentorados: number;
}

const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';

export default function PreviewPage() {
  const { switchMembership } = useTenant();
  const [mentees, setMentees] = useState<SandboxMember[]>([]);
  const [mentor, setMentor] = useState<SandboxMember | null>(null);
  const [stats, setStats] = useState<SandboxStats>({ trails: 0, leads: 0, meetings: 0, mentorados: 0 });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [entering, setEntering] = useState<string | null>(null);
  const autoSeeded = useRef(false);

  const fetchSandboxData = async () => {
    setLoading(true);
    try {
      const { data: membData, error } = await supabase
        .from('memberships')
        .select('id, role, status, tenant_id, user_id, tenants(name)')
        .eq('tenant_id', SANDBOX_TENANT_ID)
        .in('role', ['mentee', 'mentor'])
        .eq('status', 'active');

      if (error) {
        console.error('[PreviewPage] Error:', error);
        setLoading(false);
        return;
      }

      if (!membData || membData.length === 0) {
        setMentees([]);
        setMentor(null);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(membData.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const members: SandboxMember[] = membData.map(m => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          role: m.role,
          tenant_id: m.tenant_id,
          user_id: m.user_id,
          user_name: profile?.full_name || null,
          user_email: profile?.email || null,
        };
      });

      const mentorMember = members.find(m => m.role === 'mentor') || null;
      const menteeMemberships = members.filter(m => m.role === 'mentee');
      
      if (menteeMemberships.length > 0) {
        const menteeIds = menteeMemberships.map(m => m.id);
        
        const [prospectionsRes, activitiesRes, pointsRes] = await Promise.all([
          supabase.from('crm_prospections').select('membership_id, temperature').in('membership_id', menteeIds),
          supabase.from('activity_logs').select('membership_id').in('membership_id', menteeIds),
          supabase.from('activity_logs').select('membership_id, points_earned').in('membership_id', menteeIds),
        ]);
        
        const leadsPerMembership = new Map<string, number>();
        const tempPerMembership = new Map<string, string>();
        prospectionsRes.data?.forEach(p => {
          if (p.membership_id) {
            leadsPerMembership.set(p.membership_id, (leadsPerMembership.get(p.membership_id) || 0) + 1);
            if (p.temperature) tempPerMembership.set(p.membership_id, p.temperature);
          }
        });
        
        const actPerMembership = new Map<string, number>();
        activitiesRes.data?.forEach(a => {
          if (a.membership_id) {
            actPerMembership.set(a.membership_id, (actPerMembership.get(a.membership_id) || 0) + 1);
          }
        });
        
        const ptsPerMembership = new Map<string, number>();
        pointsRes.data?.forEach(p => {
          if (p.membership_id && p.points_earned) {
            ptsPerMembership.set(p.membership_id, (ptsPerMembership.get(p.membership_id) || 0) + p.points_earned);
          }
        });
        
        menteeMemberships.forEach(m => {
          m.leads_count = leadsPerMembership.get(m.id) || 0;
          m.temperature = tempPerMembership.get(m.id);
          m.points = ptsPerMembership.get(m.id) || 0;
          const actCount = actPerMembership.get(m.id) || 0;
          m.activity_level = actCount > 15 ? 'alta' : actCount > 5 ? 'media' : actCount > 0 ? 'baixa' : 'inativa';
        });
      }

      setMentor(mentorMember);
      setMentees(menteeMemberships);

      const [trailsRes, leadsRes, meetingsRes] = await Promise.all([
        supabase.from('trails').select('id', { count: 'exact', head: true }).eq('tenant_id', SANDBOX_TENANT_ID),
        supabase.from('crm_prospections').select('id', { count: 'exact', head: true }).eq('tenant_id', SANDBOX_TENANT_ID),
        supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('tenant_id', SANDBOX_TENANT_ID),
      ]);

      setStats({
        trails: trailsRes.count || 0,
        leads: leadsRes.count || 0,
        meetings: meetingsRes.count || 0,
        mentorados: menteeMemberships.length,
      });
    } catch (err) {
      console.error('[PreviewPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSandboxData();
  }, []);

  useEffect(() => {
    if (!loading && !mentor && mentees.length === 0 && !seeding && !autoSeeded.current) {
      autoSeeded.current = true;
      handleSeedSandbox();
    }
  }, [loading, mentor, mentees.length, seeding]);

  const handleSeedSandbox = async () => {
    setSeeding(true);
    try {
      toast.info('Preparando ambiente de preview... Isso pode levar até 30 segundos.');
      const { data, error } = await supabase.functions.invoke('seed-sandbox', { body: {} });
      if (error) { console.error('[PreviewPage] Seed error:', error); toast.error('Erro ao preparar o preview: ' + error.message); return; }
      if (data?.error) { toast.error('Erro: ' + data.error); return; }
      toast.success(`Preview preparado! ${data.mentees_created || 0} mentorados criados.`);
      await fetchSandboxData();
    } catch (err: any) {
      console.error('[PreviewPage] Seed error:', err);
      toast.error('Erro ao preparar o preview');
    } finally {
      setSeeding(false);
    }
  };

  const handleEnterAs = async (membershipId: string) => {
    setEntering(membershipId);
    try { await switchMembership(membershipId); } catch (e) { console.error('[PreviewPage] Enter error:', e); toast.error('Erro ao entrar no preview'); } finally { setEntering(null); }
  };

  const getActivityColor = (level?: string) => {
    switch (level) {
      case 'alta': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30';
      case 'media': return 'text-blue-600 bg-blue-500/10 border-blue-500/30';
      case 'baixa': return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
      default: return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const getActivityLabel = (level?: string) => {
    switch (level) {
      case 'alta': return 'Alta';
      case 'media': return 'Média';
      case 'baixa': return 'Baixa';
      default: return 'Inativa';
    }
  };

  const getTemperatureIcon = (temp?: string) => {
    switch (temp) {
      case 'hot': return <Flame className="h-3 w-3 text-red-500" />;
      case 'warm': return <Sun className="h-3 w-3 text-amber-500" />;
      case 'cold': return <Snowflake className="h-3 w-3 text-blue-500" />;
      default: return null;
    }
  };

  const hasSandboxData = mentor || mentees.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando ambiente de preview...</p>
      </div>
    );
  }

  if (seeding) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Rocket className="h-12 w-12 text-primary animate-bounce" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Preparando demonstração...</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Criando mentor, 10 mentorados, trilhas, leads de CRM, reuniões e dados de atividade.
            Isso leva cerca de 30 segundos.
          </p>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary mt-4" />
      </div>
    );
  }

  if (!hasSandboxData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <Rocket className="h-16 w-16 text-primary/50" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Ambiente de Preview</h2>
          <p className="text-sm text-muted-foreground mt-2">Nenhum dado encontrado no sandbox.</p>
        </div>
        <Button onClick={handleSeedSandbox} size="lg" className="px-8">
          <Rocket className="mr-2 h-5 w-5" />
          Preparar Preview
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Preview do Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Escolha um perfil para explorar a plataforma com dados reais
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedSandbox}
          disabled={seeding}
        >
          {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Recriar dados
        </Button>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Mentorados', value: stats.mentorados, icon: Users },
          { label: 'Trilhas', value: stats.trails, icon: BarChart3 },
          { label: 'Leads CRM', value: stats.leads, icon: TrendingUp },
          { label: 'Reuniões', value: stats.meetings, icon: Briefcase },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mentor Card */}
      {mentor && (
        <Card 
          className="border-primary/20 hover:border-primary/40 transition-all cursor-pointer group"
          onClick={() => handleEnterAs(mentor.id)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary/30">
                  {(mentor.user_name || 'M')[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {mentor.user_name || 'Mentor Demo'}
                    </h2>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                      MENTOR
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Dashboard completo • {stats.mentorados} mentorados • CRM • Trilhas • Calendário
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {entering === mentor.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Entrar</span>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mentorados Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Mentorados</h2>
          <span className="text-sm text-muted-foreground">— clique para entrar como qualquer um</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mentees.map((m) => (
            <Card 
              key={m.id}
              className="hover:border-accent/30 transition-all cursor-pointer group"
              onClick={() => handleEnterAs(m.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm border border-accent/20">
                      {(m.user_name || '?')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.user_name || m.user_email || 'Mentorado'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${getActivityColor(m.activity_level)}`}>
                          {getActivityLabel(m.activity_level)}
                        </Badge>
                        {m.leads_count !== undefined && m.leads_count > 0 && (
                          <span className="text-[10px] text-muted-foreground">{m.leads_count} leads</span>
                        )}
                        {getTemperatureIcon(m.temperature)}
                        {m.points !== undefined && m.points > 0 && (
                          <span className="text-[10px] text-amber-500">★ {m.points}pts</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {entering === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
        <CheckCircle className="h-3 w-3" />
        <span>Preview usa impersonation auditada. Use o banner âmbar no topo para retornar ao Master.</span>
      </div>
    </div>
  );
}
