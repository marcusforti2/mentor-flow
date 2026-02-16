import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useJourneyStages } from "@/hooks/useJourneyStages";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Edit3, MessageCircle, Mail, Phone, Calendar, Brain, Video, ClipboardList, FolderOpen, Instagram, Linkedin, Globe } from "lucide-react";
import { DangerZoneDelete } from "@/components/admin/DangerZoneDelete";
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
import { MentoradoFilesManager } from "@/components/admin/MentoradoFilesManager";
import { MeetingRegistrar } from "@/components/campan/MeetingRegistrar";
import { TaskListView } from "@/components/campan/TaskListView";
import { TranscriptionTaskExtractor } from "@/components/campan/TranscriptionTaskExtractor";
import { MeetingHistoryList } from "@/components/campan/MeetingHistoryList";
import { MentoradoProfileStats } from "@/components/admin/MentoradoProfileStats";
import { MentoradoAIScore } from "@/components/admin/MentoradoAIScore";
import { MentoradoBusinessSummary } from "@/components/admin/MentoradoBusinessSummary";
import { MentoradoActivityTimeline } from "@/components/admin/MentoradoActivityTimeline";
import { MentoradoBehavioralAnalysis } from "@/components/admin/MentoradoBehavioralAnalysis";
import { EditMenteeModal } from "@/components/admin/EditMenteeModal";

interface MentoradoData {
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
    instagram?: string | null;
    linkedin?: string | null;
    website?: string | null;
    bio?: string | null;
  } | null;
  business_profile_full: Record<string, unknown> | null;
}

const MentoradoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const { toast } = useToast();
  const tenantId = activeMembership?.tenant_id;
  const { getStageForDay } = useJourneyStages(tenantId);

  const [mentorado, setMentorado] = useState<MentoradoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [campanRefreshKey, setCampanRefreshKey] = useState(0);
  const [meetingRefreshKey, setMeetingRefreshKey] = useState(0);

  const fetchMentorado = useCallback(async () => {
    if (!id || !activeMembership) return;
    setIsLoading(true);
    try {
      const { data: membership, error } = await supabase
        .from("memberships")
        .select("id, user_id, status, created_at")
        .eq("id", id)
        .eq("tenant_id", activeMembership.tenant_id)
        .eq("role", "mentee")
        .maybeSingle();

      if (error || !membership) {
        toast({ title: "Mentorado não encontrado", variant: "destructive" });
        navigate("/mentor/mentorados", { replace: true });
        return;
      }

      const [profileRes, menteeRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email, avatar_url, phone, instagram, linkedin, website, bio").eq("user_id", membership.user_id).maybeSingle(),
        supabase.from("mentee_profiles").select("membership_id, onboarding_completed, joined_at, business_profile").eq("membership_id", membership.id).maybeSingle(),
      ]);

      const bp = menteeRes.data?.business_profile as Record<string, unknown> | null;

      setMentorado({
        id: membership.id,
        membership_id: membership.id,
        user_id: membership.user_id,
        status: membership.status,
        joined_at: menteeRes.data?.joined_at || membership.created_at,
        onboarding_completed: menteeRes.data?.onboarding_completed || false,
        profile: profileRes.data || null,
        business_profile_full: bp || null,
      });
    } catch (err) {
      console.error("Error fetching mentorado:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id, activeMembership]);

  useEffect(() => { fetchMentorado(); }, [fetchMentorado]);

  const handleDelete = async () => {
    if (!mentorado) return;
    setIsDeleting(true);
    try {
      await supabase.from("memberships").update({ status: "suspended" }).eq("id", mentorado.membership_id);
      await supabase.from("mentor_mentee_assignments").update({ status: "inactive" }).eq("mentee_membership_id", mentorado.membership_id);
      toast({ title: "Mentorado removido", description: `${mentorado.profile?.full_name || "Mentorado"} foi desativado.` });
      navigate("/mentor/mentorados", { replace: true });
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!mentorado || !activeMembership) return null;

  const day = differenceInDays(new Date(), new Date(mentorado.joined_at || new Date()));
  const stage = getStageForDay(mentorado.joined_at);
  const stageProgress = stage.day_end > stage.day_start
    ? Math.min(100, Math.round(((day - stage.day_start) / (stage.day_end - stage.day_start)) * 100))
    : 100;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/mentor/mentorados")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarImage src={mentorado.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(mentorado.profile?.full_name || null)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground truncate">
              {mentorado.profile?.full_name || "Sem nome"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{mentorado.profile?.email}</span>
              <Badge variant="outline" className="text-xs">Dia {day}</Badge>
              <Badge className={`text-xs text-white border-0 ${stage.color}`}>{stage.name}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={() => setIsEditModalOpen(true)}>
            <Edit3 className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          {mentorado.profile?.phone && (
            <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/55${mentorado.profile?.phone?.replace(/\D/g, "")}`, "_blank")}>
              <MessageCircle className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          )}
          {mentorado.profile?.email && (
            <Button size="sm" variant="outline" onClick={() => window.open(`mailto:${mentorado.profile?.email}`, "_blank")}>
              <Mail className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Email</span>
            </Button>
          )}
        </div>
      </div>

      {/* Journey Progress Bar */}
      <Card className="glass-card">
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso na etapa: <strong className="text-foreground">{stage.name}</strong></span>
            <span className="font-medium">Dia {day} de {stage.day_end} ({stageProgress}%)</span>
          </div>
          <Progress value={stageProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Tabs - Full Width */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-11">
          <TabsTrigger value="info" className="text-sm">Perfil</TabsTrigger>
          <TabsTrigger value="analysis" className="text-sm">
            <Brain className="h-4 w-4 mr-1.5" />
            Análise
          </TabsTrigger>
          <TabsTrigger value="meetings" className="text-sm">
            <Video className="h-4 w-4 mr-1.5" />
            Reuniões
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-sm">
            <ClipboardList className="h-4 w-4 mr-1.5" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="files" className="text-sm">
            <FolderOpen className="h-4 w-4 mr-1.5" />
            Arquivos
          </TabsTrigger>
        </TabsList>

        {/* === TAB: Perfil === */}
        <TabsContent value="info" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <MentoradoProfileStats
                membershipId={mentorado.membership_id}
                legacyMentoradoId={null}
              />
              <MentoradoAIScore
                legacyMentoradoId={null}
                membershipId={mentorado.membership_id}
              />
              <MentoradoBusinessSummary legacyMentoradoId={mentorado.membership_id} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Contact Info */}
              <Card className="glass-card">
                <CardContent className="pt-5 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Contato & Info</h4>
                  {mentorado.profile?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{mentorado.profile.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{mentorado.profile?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Entrou em {mentorado.joined_at ? format(new Date(mentorado.joined_at), "dd MMM yyyy", { locale: ptBR }) : "N/A"}</span>
                  </div>
                  {mentorado.profile?.instagram && (
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                      <a href={`https://instagram.com/${mentorado.profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{mentorado.profile.instagram}</a>
                    </div>
                  )}
                  {mentorado.profile?.linkedin && (
                    <div className="flex items-center gap-2 text-sm">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a href={mentorado.profile.linkedin.startsWith('http') ? mentorado.profile.linkedin : `https://${mentorado.profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">{mentorado.profile.linkedin}</a>
                    </div>
                  )}
                  {mentorado.profile?.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={mentorado.profile.website.startsWith('http') ? mentorado.profile.website : `https://${mentorado.profile.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">{mentorado.profile.website}</a>
                    </div>
                  )}
                  {mentorado.profile?.bio && (
                    <p className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-2">{mentorado.profile.bio}</p>
                  )}
                </CardContent>
              </Card>

              <MentoradoActivityTimeline membershipId={mentorado.membership_id} />

              {/* Danger Zone - hidden inside collapsible */}
              <DangerZoneDelete
                name={mentorado.profile?.full_name || "Mentorado"}
                isDeleting={isDeleting}
                onConfirmDelete={handleDelete}
              />
            </div>
          </div>
        </TabsContent>

        {/* === TAB: Análise IA === */}
        <TabsContent value="analysis" className="mt-6">
          <MentoradoBehavioralAnalysis
            menteeMembershipId={mentorado.membership_id}
            mentorMembershipId={activeMembership.id}
            tenantId={activeMembership.tenant_id}
            menteeName={mentorado.profile?.full_name || "Mentorado"}
          />
        </TabsContent>

        {/* === TAB: Reuniões === */}
        <TabsContent value="meetings" className="mt-6 space-y-6">
          <MeetingRegistrar
            mentoradoMembershipId={mentorado.membership_id}
            mentorMembershipId={activeMembership.id}
            tenantId={activeMembership.tenant_id}
            onMeetingSaved={() => setMeetingRefreshKey(k => k + 1)}
          />
          <MeetingHistoryList
            mentoradoMembershipId={mentorado.membership_id}
            mentorMembershipId={activeMembership.id}
            tenantId={activeMembership.tenant_id}
            refreshKey={meetingRefreshKey}
            onTasksSaved={() => setCampanRefreshKey(k => k + 1)}
          />
        </TabsContent>

        {/* === TAB: Tarefas === */}
        <TabsContent value="tasks" className="mt-6 space-y-6">
          <TranscriptionTaskExtractor
            mentoradoMembershipId={mentorado.membership_id}
            mentorMembershipId={activeMembership.id}
            tenantId={activeMembership.tenant_id}
            onTasksSaved={() => setCampanRefreshKey(k => k + 1)}
          />
          <TaskListView
            mentoradoMembershipId={mentorado.membership_id}
            mentorMembershipId={activeMembership.id}
            tenantId={activeMembership.tenant_id}
            refreshKey={campanRefreshKey}
          />
        </TabsContent>

        {/* === TAB: Arquivos === */}
        <TabsContent value="files" className="mt-6">
          <MentoradoFilesManager
            mentoradoId={null}
            mentorId={null}
            mentoradoName={mentorado.profile?.full_name || "Mentorado"}
            tenantId={activeMembership.tenant_id}
            ownerMembershipId={mentorado.membership_id}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <EditMenteeModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        menteeData={{
          membership_id: mentorado.membership_id,
          user_id: mentorado.user_id,
          profile: mentorado.profile,
          joined_at: mentorado.joined_at,
          business_profile_full: mentorado.business_profile_full,
        }}
        onSuccess={fetchMentorado}
      />
    </div>
  );
};

export default MentoradoDetail;
