import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCreateMembership } from "@/hooks/useCreateMembership";
import { differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Search, 
  CheckCircle,
  Loader2,
  Mail,
  Calendar,
  Shield,
  Plus,
  FileUp,
  Edit3,
  Filter,
  TrendingUp,
  Eye,
  Phone,
  Building2,
  Target,
  ChevronRight,
  MessageCircle,
  Video,
  History,
  ExternalLink,
  ClipboardList,
  FolderOpen,
  Trash2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Formularios from "./Formularios";
import { MentoradoFilesManager } from "@/components/admin/MentoradoFilesManager";
import { MentoradoUploadModal } from "@/components/admin/MentoradoUploadModal";
import { WelcomeMessageCard } from "@/components/admin/WelcomeMessageCard";
import { Send } from "lucide-react";
import { MeetingRegistrar } from "@/components/campan/MeetingRegistrar";
import { CampanKanban } from "@/components/campan/CampanKanban";
import { MeetingHistoryList } from "@/components/campan/MeetingHistoryList";
import { MentoradoProfileStats } from "@/components/admin/MentoradoProfileStats";
import { MentoradoAIScore } from "@/components/admin/MentoradoAIScore";
import { MentoradoBusinessSummary } from "@/components/admin/MentoradoBusinessSummary";
import { MentoradoActivityTimeline } from "@/components/admin/MentoradoActivityTimeline";

interface Mentorado {
  id: string;
  membership_id: string;
  user_id: string;
  legacy_mentorado_id?: string | null;
  legacy_mentor_id?: string | null;
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
    business_type: string | null;
    maturity_level: string | null;
  } | null;
}

type JourneyFilter = 'all' | 'week' | 'month' | 'stage';
type StageFilter = 'all' | 'onboarding' | 'aprendizado' | 'aplicacao' | 'escala' | 'maestria';

const JOURNEY_STAGES = [
  { id: 'onboarding', name: 'Onboarding', minDay: 0, maxDay: 7, color: 'bg-blue-500' },
  { id: 'aprendizado', name: 'Aprendizado', minDay: 8, maxDay: 30, color: 'bg-purple-500' },
  { id: 'aplicacao', name: 'Aplicação', minDay: 31, maxDay: 90, color: 'bg-amber-500' },
  { id: 'escala', name: 'Escala', minDay: 91, maxDay: 180, color: 'bg-green-500' },
  { id: 'maestria', name: 'Maestria', minDay: 181, maxDay: 365, color: 'bg-rose-500' },
];

const Mentorados = () => {
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [journeyFilter, setJourneyFilter] = useState<JourneyFilter>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  
  // View state
  const [showFormEditor, setShowFormEditor] = useState(false);
  
  // Add mentorado dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<'manual' | 'form' | null>(null);
  
  // Manual add form
  const [manualForm, setManualForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    business_name: '',
    business_type: '',
    maturity_level: '',
    notes: ''
  });
  
  // Detail sheet
  const [selectedMentorado, setSelectedMentorado] = useState<Mentorado | null>(null);
  
  // Upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Legacy mentor ID from mentors table (needed for mentorado_files, mentorado_invites)
  const [legacyMentorId, setLegacyMentorId] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [campanRefreshKey, setCampanRefreshKey] = useState(0);
  const [meetingRefreshKey, setMeetingRefreshKey] = useState(0);

  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const { toast } = useToast();
  const createMembership = useCreateMembership();

  const handleDeleteMentorado = async (mentorado: Mentorado) => {
    setIsDeleting(true);
    try {
      // 1. Suspend the membership
      const { error: membershipError } = await supabase
        .from('memberships')
        .update({ status: 'suspended' })
        .eq('id', mentorado.membership_id);
      
      if (membershipError) throw membershipError;

      // 2. Deactivate mentor-mentee assignment
      await supabase
        .from('mentor_mentee_assignments')
        .update({ status: 'inactive' })
        .eq('mentee_membership_id', mentorado.membership_id);

      // 3. Update local state
      setMentorados(prev => prev.filter(m => m.id !== mentorado.id));
      setSelectedMentorado(null);

      toast({
        title: "Mentorado removido",
        description: `${mentorado.profile?.full_name || 'Mentorado'} foi desativado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error deleting mentorado:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível remover o mentorado.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchData = async () => {
    if (!user || !activeMembership) return;
    
    setIsLoading(true);
    
    try {
      const tenantId = activeMembership.tenant_id;
      
      // Fetch the legacy mentor ID from mentors table
      const { data: mentorRecord } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (mentorRecord) {
        setLegacyMentorId(mentorRecord.id);
      }
      
      // Fetch mentee memberships for this tenant
      const { data: menteeMemberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('id, user_id, status, created_at')
        .eq('tenant_id', tenantId)
        .eq('role', 'mentee');
      
      if (membershipsError) throw membershipsError;
      
      if (!menteeMemberships || menteeMemberships.length === 0) {
        setMentorados([]);
        setIsLoading(false);
        return;
      }
      
      const userIds = menteeMemberships.map(m => m.user_id);
      const membershipIds = menteeMemberships.map(m => m.id);
      
      // Fetch profiles, mentee_profiles, and legacy mentorados in parallel
      const [profilesResult, menteeProfilesResult, legacyMentoradosResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url, phone')
          .in('user_id', userIds),
        supabase
          .from('mentee_profiles')
          .select('membership_id, onboarding_completed, joined_at, business_profile')
          .in('membership_id', membershipIds),
        supabase
          .from('mentorados')
          .select('id, user_id, mentor_id')
          .in('user_id', userIds)
      ]);
      
      const mentoradosWithData: Mentorado[] = menteeMemberships.map(m => {
        const profile = profilesResult.data?.find(p => p.user_id === m.user_id) || null;
        const menteeProfile = menteeProfilesResult.data?.find(mp => mp.membership_id === m.id);
        const legacyMentorado = legacyMentoradosResult.data?.find(lm => lm.user_id === m.user_id);
        const bp = menteeProfile?.business_profile as Record<string, unknown> | null;
        
        return {
          id: m.id,
          membership_id: m.id,
          user_id: m.user_id,
          legacy_mentorado_id: legacyMentorado?.id || null,
          legacy_mentor_id: legacyMentorado?.mentor_id || null,
          status: m.status,
          joined_at: menteeProfile?.joined_at || m.created_at,
          onboarding_completed: menteeProfile?.onboarding_completed || false,
          profile,
          business_profile: bp ? {
            business_name: (bp.business_name as string) || null,
            business_type: (bp.business_type as string) || null,
            maturity_level: (bp.maturity_level as string) || null,
          } : null,
        };
      });
      
      setMentorados(mentoradosWithData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de mentorados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, activeMembership]);

  const getJourneyDay = (joinedAt: string | null) => {
    if (!joinedAt) return 0;
    return differenceInDays(new Date(), new Date(joinedAt));
  };

  const getJourneyWeek = (joinedAt: string | null) => {
    if (!joinedAt) return 0;
    return differenceInWeeks(new Date(), new Date(joinedAt)) + 1;
  };

  const getJourneyMonth = (joinedAt: string | null) => {
    if (!joinedAt) return 0;
    return differenceInMonths(new Date(), new Date(joinedAt)) + 1;
  };

  const getJourneyStage = (joinedAt: string | null) => {
    const days = getJourneyDay(joinedAt);
    return JOURNEY_STAGES.find(s => days >= s.minDay && days <= s.maxDay) || JOURNEY_STAGES[4];
  };

  const handleManualAdd = async () => {
    if (!user || !activeMembership || !manualForm.full_name || !manualForm.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Only pass mentor_membership_id when the active role is actually 'mentor'
      // For master_admin/admin, the backend will auto-find a mentor in the tenant
      const mentorId = activeMembership.role === 'mentor' ? activeMembership.id : undefined;
      
      await createMembership.mutateAsync({
        tenant_id: activeMembership.tenant_id,
        email: manualForm.email,
        full_name: manualForm.full_name,
        phone: manualForm.phone || undefined,
        role: 'mentee',
        mentor_membership_id: mentorId,
      });
      
      setIsAddDialogOpen(false);
      setManualForm({
        full_name: '',
        email: '',
        phone: '',
        business_name: '',
        business_type: '',
        maturity_level: '',
        notes: ''
      });
      await fetchData();
    } catch (error: any) {
      console.error('Error adding mentorado:', error);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Apply all filters
  const filteredMentorados = mentorados.filter(m => {
    const matchesSearch = 
      (m.profile?.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (m.profile?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (m.business_profile?.business_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (journeyFilter === 'week' && weekFilter !== 'all') {
      const week = getJourneyWeek(m.joined_at);
      if (week !== parseInt(weekFilter)) return false;
    }
    
    if (journeyFilter === 'month' && monthFilter !== 'all') {
      const month = getJourneyMonth(m.joined_at);
      if (month !== parseInt(monthFilter)) return false;
    }
    
    if (journeyFilter === 'stage' && stageFilter !== 'all') {
      const stage = getJourneyStage(m.joined_at);
      if (stage.id !== stageFilter) return false;
    }
    
    return true;
  });

  // Stats
  const avgDays = mentorados.length > 0 
    ? Math.round(mentorados.reduce((acc, m) => acc + getJourneyDay(m.joined_at), 0) / mentorados.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show form editor view
  if (showFormEditor && activeMembership) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <Formularios 
          mentorId={legacyMentorId || activeMembership.id} 
          onBack={() => setShowFormEditor(false)} 
        />
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
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFormEditor(true)}
            disabled={!activeMembership}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Formulário Onboarding
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setIsUploadModalOpen(true)}
            disabled={!activeMembership}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Importar Planilha
          </Button>
           
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Mentorado
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Mentorado</DialogTitle>
              <DialogDescription>
                Escolha como deseja adicionar um novo mentorado
              </DialogDescription>
            </DialogHeader>
            
            {!addMethod ? (
              <div className="grid gap-4 py-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start gap-2"
                  onClick={() => setAddMethod('form')}
                >
                  <div className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Enviar Formulário de Onboarding</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-left">
                    Gere um link de cadastro com o formulário completo de onboarding
                  </span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start gap-2"
                  onClick={() => setAddMethod('manual')}
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Preencher Manualmente</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-left">
                    Cadastre um mentorado preenchendo os dados você mesmo
                  </span>
                </Button>
              </div>
            ) : addMethod === 'form' ? (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Copie o link abaixo e envie para o seu mentorado. Ele preencherá o formulário de onboarding completo com perguntas personalizadas.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/onboarding?mentor=${activeMembership?.id || ''}`}
                      className="bg-background"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/onboarding?mentor=${activeMembership?.id}`);
                        toast({ title: "Link copiado!" });
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setAddMethod(null)} className="w-full">
                  Voltar
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      value={manualForm.full_name}
                      onChange={(e) => setManualForm({...manualForm, full_name: e.target.value})}
                      placeholder="João Silva"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={manualForm.email}
                      onChange={(e) => setManualForm({...manualForm, email: e.target.value})}
                      placeholder="joao@email.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp</Label>
                    <Input
                      id="phone"
                      value={manualForm.phone}
                      onChange={(e) => setManualForm({...manualForm, phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Nome do Negócio</Label>
                    <Input
                      id="business_name"
                      value={manualForm.business_name}
                      onChange={(e) => setManualForm({...manualForm, business_name: e.target.value})}
                      placeholder="Empresa XYZ"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setAddMethod(null)} className="flex-1">
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleManualAdd} 
                    disabled={createMembership.isPending}
                    className="flex-1 gradient-gold text-primary-foreground"
                  >
                    {createMembership.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {mentorados.filter(m => m.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
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
              <div className="p-3 rounded-xl bg-purple-500/10">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
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
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <CheckCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {mentorados.filter(m => m.onboarding_completed).length}
                </p>
                <p className="text-sm text-muted-foreground">Onboarding OK</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 glass-card rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            className="pl-10 bg-secondary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={journeyFilter} onValueChange={(v) => setJourneyFilter(v as JourneyFilter)}>
            <SelectTrigger className="w-[140px] bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
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
            <SelectTrigger className="w-[140px] bg-secondary/50">
              <SelectValue placeholder="Semana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {[...Array(12)].map((_, i) => (
                <SelectItem key={i} value={String(i + 1)}>Semana {i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {journeyFilter === 'month' && (
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[140px] bg-secondary/50">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {[...Array(12)].map((_, i) => (
                <SelectItem key={i} value={String(i + 1)}>Mês {i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {journeyFilter === 'stage' && (
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as StageFilter)}>
            <SelectTrigger className="w-[160px] bg-secondary/50">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {JOURNEY_STAGES.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mentorados Grid */}
      {filteredMentorados.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm || journeyFilter !== 'all' ? "Nenhum resultado encontrado" : "Nenhum mentorado ainda"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || journeyFilter !== 'all' 
                ? "Tente ajustar os filtros de busca."
                : "Adicione mentorados usando o botão acima."}
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
                onClick={() => setSelectedMentorado(mentorado)}
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
                        <h3 className="font-semibold text-foreground truncate">
                          {mentorado.profile?.full_name || "Sem nome"}
                        </h3>
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
                        <Badge variant="outline" className="text-xs">
                          Dia {journeyDay}
                        </Badge>
                        <Badge className={`text-xs text-white border-0 ${stage.color}`}>
                          {stage.name}
                        </Badge>
                        {mentorado.onboarding_completed && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedMentorado} onOpenChange={() => setSelectedMentorado(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedMentorado && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedMentorado.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(selectedMentorado.profile?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedMentorado.profile?.full_name || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground font-normal">{selectedMentorado.profile?.email}</p>
                  </div>
                </SheetTitle>
                <SheetDescription>
                  Detalhes do mentorado
                </SheetDescription>
              </SheetHeader>
              
              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="info" className="text-xs">Perfil</TabsTrigger>
                  <TabsTrigger value="meetings" className="text-xs">
                    <Video className="h-3 w-3 mr-1" />
                    Reuniões
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs">
                    <ClipboardList className="h-3 w-3 mr-1" />
                    Tarefas
                  </TabsTrigger>
                </TabsList>

                {/* === TAB: Perfil === */}
                <TabsContent value="info" className="space-y-5 mt-4">
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    {selectedMentorado.profile?.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          const phone = selectedMentorado.profile?.phone?.replace(/\D/g, '');
                          window.open(`https://wa.me/55${phone}`, '_blank');
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                        WhatsApp
                      </Button>
                    )}
                    {selectedMentorado.profile?.email && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(`mailto:${selectedMentorado.profile?.email}`, '_blank')}
                      >
                        <Mail className="h-3.5 w-3.5 mr-1.5" />
                        Email
                      </Button>
                    )}
                  </div>

                  {/* Journey Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Dia na Jornada</p>
                        <p className="text-2xl font-bold">{getJourneyDay(selectedMentorado.joined_at)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Etapa</p>
                        <Badge className={`mt-1 text-white border-0 ${getJourneyStage(selectedMentorado.joined_at).color}`}>
                          {getJourneyStage(selectedMentorado.joined_at).name}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  {/* KPIs */}
                  <MentoradoProfileStats
                    membershipId={selectedMentorado.membership_id}
                    legacyMentoradoId={selectedMentorado.legacy_mentorado_id}
                  />

                  {/* AI Score */}
                  <MentoradoAIScore
                    legacyMentoradoId={selectedMentorado.legacy_mentorado_id}
                    membershipId={selectedMentorado.membership_id}
                  />

                  {/* Business Summary */}
                  <MentoradoBusinessSummary
                    legacyMentoradoId={selectedMentorado.legacy_mentorado_id}
                  />

                  {/* Activity Timeline */}
                  <MentoradoActivityTimeline
                    membershipId={selectedMentorado.membership_id}
                  />
                  
                  {/* Contact Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Contato</h4>
                    {selectedMentorado.profile?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedMentorado.profile.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedMentorado.profile?.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Entrou em {formatDate(selectedMentorado.joined_at)}</span>
                    </div>
                  </div>

                  {/* Files Manager */}
                  <MentoradoFilesManager
                    mentoradoId={selectedMentorado.legacy_mentorado_id}
                    mentorId={selectedMentorado.legacy_mentor_id}
                    mentoradoName={selectedMentorado.profile?.full_name || 'Mentorado'}
                    tenantId={activeMembership?.tenant_id}
                    ownerMembershipId={selectedMentorado.membership_id}
                  />

                  {/* Delete Button */}
                  <div className="pt-4 border-t border-destructive/20">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full" disabled={isDeleting}>
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                          Excluir Mentorado
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir mentorado?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso vai desativar o acesso de <strong>{selectedMentorado.profile?.full_name || 'este mentorado'}</strong> à plataforma. 
                            Os dados não serão apagados permanentemente e podem ser reativados depois.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteMentorado(selectedMentorado)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Confirmar Exclusão
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TabsContent>

                {/* === TAB: Reuniões === */}
                <TabsContent value="meetings" className="space-y-3 mt-4">
                  {activeMembership && (
                    <>
                      <MeetingRegistrar
                        mentoradoMembershipId={selectedMentorado.membership_id}
                        mentorMembershipId={activeMembership.id}
                        tenantId={activeMembership.tenant_id}
                        onMeetingSaved={() => setMeetingRefreshKey(k => k + 1)}
                      />
                      <MeetingHistoryList
                        mentoradoMembershipId={selectedMentorado.membership_id}
                        mentorMembershipId={activeMembership.id}
                        tenantId={activeMembership.tenant_id}
                        refreshKey={meetingRefreshKey}
                        onTasksSaved={() => setCampanRefreshKey(k => k + 1)}
                      />
                    </>
                  )}
                </TabsContent>

                {/* === TAB: Tarefas === */}
                <TabsContent value="tasks" className="space-y-3 mt-4">
                  {activeMembership && (
                    <CampanKanban
                      mentoradoMembershipId={selectedMentorado.membership_id}
                      mentorMembershipId={activeMembership.id}
                      tenantId={activeMembership.tenant_id}
                      refreshKey={campanRefreshKey}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

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
