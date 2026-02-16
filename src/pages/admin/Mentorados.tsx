import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useJourneyStages } from "@/hooks/useJourneyStages";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";
import { 
  Users, UserCheck, Search, CheckCircle, Loader2, Mail, Plus,
  FileUp, Filter, TrendingUp, ChevronRight, Building2, ClipboardList
} from "lucide-react";
import Formularios from "./Formularios";
import { MentoradoUploadModal } from "@/components/admin/MentoradoUploadModal";
import { CreateMenteeModal } from "@/components/admin/CreateMenteeModal";

interface Mentorado {
  id: string;
  membership_id: string;
  user_id: string;
  status: string | null;
  joined_at: string | null;
  onboarding_completed: boolean | null;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  business_profile: {
    business_name: string | null;
  } | null;
}

type JourneyFilter = 'all' | 'week' | 'month' | 'stage';
type StageFilter = 'all' | string;

const Mentorados = () => {
  const navigate = useNavigate();
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [journeyFilter, setJourneyFilter] = useState<JourneyFilter>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const { toast } = useToast();
  const tenantId = activeMembership?.tenant_id;
  const { stages: journeyStages, getStageForDay } = useJourneyStages(tenantId);

  const fetchData = async () => {
    if (!user || !activeMembership) return;
    setIsLoading(true);
    try {
      const { data: menteeMemberships, error } = await supabase
        .from('memberships')
        .select('id, user_id, status, created_at')
        .eq('tenant_id', activeMembership.tenant_id)
        .eq('role', 'mentee')
        .eq('status', 'active');
      
      if (error) throw error;
      if (!menteeMemberships || menteeMemberships.length === 0) {
        setMentorados([]);
        setIsLoading(false);
        return;
      }
      
      const userIds = menteeMemberships.map(m => m.user_id);
      const membershipIds = menteeMemberships.map(m => m.id);
      
      const [profilesResult, menteeProfilesResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, avatar_url, phone').in('user_id', userIds),
        supabase.from('mentee_profiles').select('membership_id, onboarding_completed, joined_at, business_profile').in('membership_id', membershipIds),
      ]);
      
      const list: Mentorado[] = menteeMemberships.map(m => {
        const profile = profilesResult.data?.find(p => p.user_id === m.user_id) || null;
        const menteeProfile = menteeProfilesResult.data?.find(mp => mp.membership_id === m.id);
        const bp = menteeProfile?.business_profile as Record<string, unknown> | null;
        return {
          id: m.id,
          membership_id: m.id,
          user_id: m.user_id,
          status: m.status,
          joined_at: menteeProfile?.joined_at || m.created_at,
          onboarding_completed: menteeProfile?.onboarding_completed || false,
          profile,
          business_profile: bp ? { business_name: (bp.business_name as string) || null } : null,
        };
      });
      
      setMentorados(list);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user, activeMembership]);

  const getJourneyDay = (joinedAt: string | null) => joinedAt ? differenceInDays(new Date(), new Date(joinedAt)) : 0;
  const getJourneyWeek = (joinedAt: string | null) => joinedAt ? differenceInWeeks(new Date(), new Date(joinedAt)) + 1 : 0;
  const getJourneyMonth = (joinedAt: string | null) => joinedAt ? differenceInMonths(new Date(), new Date(joinedAt)) + 1 : 0;
  const getJourneyStage = (joinedAt: string | null) => getStageForDay(joinedAt);
  const getInitials = (name: string | null) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const filteredMentorados = mentorados.filter(m => {
    const matchesSearch = 
      (m.profile?.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (m.profile?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (m.business_profile?.business_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (journeyFilter === 'week' && weekFilter !== 'all' && getJourneyWeek(m.joined_at) !== parseInt(weekFilter)) return false;
    if (journeyFilter === 'month' && monthFilter !== 'all' && getJourneyMonth(m.joined_at) !== parseInt(monthFilter)) return false;
    if (journeyFilter === 'stage' && stageFilter !== 'all' && getJourneyStage(m.joined_at).stage_key !== stageFilter) return false;
    return true;
  });

  const avgDays = mentorados.length > 0 
    ? Math.round(mentorados.reduce((acc, m) => acc + getJourneyDay(m.joined_at), 0) / mentorados.length) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showFormEditor && activeMembership) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <Formularios mentorId={activeMembership.id} onBack={() => setShowFormEditor(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Mentorados</h1>
          <p className="text-muted-foreground">Gerencie sua base de mentorados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowFormEditor(true)} disabled={!activeMembership}>
            <ClipboardList className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Formulário Onboarding</span>
            <span className="sm:hidden">Onboarding</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(true)} disabled={!activeMembership}>
            <FileUp className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Importar Planilha</span>
            <span className="sm:hidden">Importar</span>
          </Button>
          <Button className="hidden md:flex gradient-gold text-primary-foreground" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Mentorado
          </Button>
        </div>
      </div>

      {/* Mobile FAB */}
      <Button 
        className="md:hidden fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/30 gradient-gold text-primary-foreground"
        size="icon"
        onClick={() => setIsAddDialogOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10"><UserCheck className="h-6 w-6 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{mentorados.filter(m => m.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10"><Users className="h-6 w-6 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{mentorados.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10"><TrendingUp className="h-6 w-6 text-purple-500" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgDays}</p>
                <p className="text-sm text-muted-foreground">Média dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10"><CheckCircle className="h-6 w-6 text-yellow-500" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{mentorados.filter(m => m.onboarding_completed).length}</p>
                <p className="text-sm text-muted-foreground">Onboarding OK</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 glass-card rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, email ou empresa..." className="pl-10 bg-secondary/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={journeyFilter} onValueChange={(v) => setJourneyFilter(v as JourneyFilter)}>
            <SelectTrigger className="w-[140px] bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="week">Por Semana</SelectItem>
              <SelectItem value="month">Por Mês</SelectItem>
              <SelectItem value="stage">Por Etapa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {journeyFilter === 'week' && (
          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger className="w-[140px] bg-secondary/50"><SelectValue placeholder="Semana" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {[...Array(12)].map((_, i) => (<SelectItem key={i} value={String(i + 1)}>Semana {i + 1}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
        {journeyFilter === 'month' && (
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[140px] bg-secondary/50"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {[...Array(12)].map((_, i) => (<SelectItem key={i} value={String(i + 1)}>Mês {i + 1}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
        {journeyFilter === 'stage' && (
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as StageFilter)}>
            <SelectTrigger className="w-[160px] bg-secondary/50"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {journeyStages.map((s) => (<SelectItem key={s.stage_key} value={s.stage_key}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid */}
      {filteredMentorados.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm || journeyFilter !== 'all' ? "Nenhum resultado encontrado" : "Nenhum mentorado ainda"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || journeyFilter !== 'all' ? "Tente ajustar os filtros." : "Adicione mentorados usando o botão acima."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMentorados.map((mentorado) => {
            const journeyDay = getJourneyDay(mentorado.joined_at);
            const stage = getJourneyStage(mentorado.joined_at);
            return (
              <Card 
                key={mentorado.id} 
                className="glass-card hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/mentor/mentorados/${mentorado.membership_id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={mentorado.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(mentorado.profile?.full_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${stage.color} border-2 border-card`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground truncate">{mentorado.profile?.full_name || "Sem nome"}</h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{mentorado.profile?.email}</span>
                      </div>
                      {mentorado.business_profile?.business_name && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{mentorado.business_profile.business_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Dia {journeyDay}</Badge>
                        <Badge className={`text-xs text-white border-0 ${stage.color}`}>{stage.name}</Badge>
                        {mentorado.onboarding_completed && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Mentee Modal */}
      <CreateMenteeModal
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchData}
        tenantId={activeMembership?.tenant_id}
      />

      {/* Upload Modal */}
      {activeMembership && (
        <MentoradoUploadModal
          open={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          tenantId={activeMembership.tenant_id}
          mentorMembershipId={activeMembership.id}
          mentorName=""
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Mentorados;
