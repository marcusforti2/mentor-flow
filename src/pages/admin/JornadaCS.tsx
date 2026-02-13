import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Users, Calendar, Filter, ChevronLeft, ChevronRight, Settings2, AlertTriangle } from "lucide-react";
import { differenceInDays, differenceInWeeks, differenceInMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useJourneyStages } from "@/hooks/useJourneyStages";
import { JourneyStageEditor } from "@/components/admin/JourneyStageEditor";
import { useNavigate } from "react-router-dom";

interface Mentorado {
  id: string;
  user_id: string;
  status: string | null;
  joined_at: string | null;
  last_activity_at?: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

type FilterMode = "week" | "month" | "journey";

export default function JornadaCS() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("journey");
  const [currentPage, setCurrentPage] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const tenantId = activeMembership?.tenant_id;
  const { stages, isLoading: stagesLoading, reload: reloadStages, getStageForDay, getJourneyDay } = useJourneyStages(tenantId);

  const fetchMentorados = async () => {
    if (!activeMembership) return;
    
    setIsLoading(true);
    
    try {
      const tid = activeMembership.tenant_id;
      const effectiveUserId = activeMembership.user_id;
      const role = activeMembership.role;
      
      let mentoradosData: any[] = [];
      
      if (role === 'mentor') {
        const { data: mentorData } = await supabase
          .from('mentors')
          .select('id')
          .eq('user_id', effectiveUserId)
          .single();
        
        if (mentorData) {
          const { data, error } = await supabase
            .from('mentorados')
            .select('id, user_id, status, joined_at')
            .eq('mentor_id', mentorData.id)
            .eq('status', 'active');
          if (error) throw error;
          mentoradosData = data || [];
        }
      } else {
        const { data: menteeMemberships } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('tenant_id', tid)
          .eq('role', 'mentee')
          .eq('status', 'active');
        
        if (menteeMemberships && menteeMemberships.length > 0) {
          const userIds = menteeMemberships.map(m => m.user_id);
          const { data, error } = await supabase
            .from('mentorados')
            .select('id, user_id, status, joined_at')
            .in('user_id', userIds)
            .eq('status', 'active');
          if (error) throw error;
          mentoradosData = data || [];
        }
      }
      
      if (mentoradosData.length > 0) {
        const userIds = mentoradosData.map(m => m.user_id);
        const [profilesResult, activityResult] = await Promise.all([
          supabase.from('profiles').select('user_id, full_name, email, avatar_url').in('user_id', userIds),
          supabase.from('activity_logs').select('membership_id, created_at').in('membership_id', userIds).order('created_at', { ascending: false }).limit(500),
        ]);
        
        setMentorados(mentoradosData.map(m => ({
          ...m,
          profile: profilesResult.data?.find(p => p.user_id === m.user_id) || null,
        })));
      } else {
        setMentorados([]);
      }
    } catch (error) {
      console.error('Error fetching mentorados:', error);
      toast({ title: "Erro ao carregar", description: "Não foi possível carregar os mentorados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorados();
  }, [activeMembership]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getWeekInJourney = (joinedAt: string | null): number => {
    if (!joinedAt) return 0;
    return differenceInWeeks(new Date(), new Date(joinedAt)) + 1;
  };

  const getMonthInJourney = (joinedAt: string | null): number => {
    if (!joinedAt) return 0;
    return differenceInMonths(new Date(), new Date(joinedAt)) + 1;
  };

  const filteredMentorados = mentorados.filter(m => 
    (m.profile?.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (m.profile?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const columns = useMemo(() => {
    if (filterMode === "journey") {
      return stages.map(stage => ({
        id: stage.stage_key,
        title: stage.name,
        color: stage.color,
        dayStart: stage.day_start,
        dayEnd: stage.day_end,
        mentorados: filteredMentorados.filter(m => {
          const days = getJourneyDay(m.joined_at);
          return days >= stage.day_start && days <= stage.day_end;
        })
      }));
    }
    
    if (filterMode === "month") {
      const startMonth = currentPage * 6;
      return Array.from({ length: 6 }, (_, i) => {
        const monthNum = startMonth + i + 1;
        if (monthNum > 12) return null;
        return {
          id: `month-${monthNum}`,
          title: `Mês ${monthNum}`,
          color: getMonthColor(monthNum),
          mentorados: filteredMentorados.filter(m => getMonthInJourney(m.joined_at) === monthNum)
        };
      }).filter(Boolean);
    }
    
    const startWeek = currentPage * 8;
    return Array.from({ length: 8 }, (_, i) => {
      const weekNum = startWeek + i + 1;
      if (weekNum > 52) return null;
      return {
        id: `week-${weekNum}`,
        title: `Semana ${weekNum}`,
        color: getWeekColor(weekNum),
        mentorados: filteredMentorados.filter(m => getWeekInJourney(m.joined_at) === weekNum)
      };
    }).filter(Boolean);
  }, [filterMode, filteredMentorados, currentPage, stages]);

  const maxPages = filterMode === "week" ? Math.ceil(52 / 8) : filterMode === "month" ? Math.ceil(12 / 6) : 0;

  const handleCardClick = (mentorado: Mentorado) => {
    // Navigate to mentorados page - the detail sheet will open there
    navigate('/mentor/mentorados');
  };

  if (isLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Jornada CS</h1>
          <p className="text-muted-foreground">Acompanhe seus mentorados em cada etapa da jornada</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mentorado..."
              className="pl-10 w-64 bg-secondary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={filterMode} onValueChange={(v) => { setFilterMode(v as FilterMode); setCurrentPage(0); }}>
            <SelectTrigger className="w-40 bg-secondary/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="journey">Por Jornada</SelectItem>
              <SelectItem value="week">Por Semana</SelectItem>
              <SelectItem value="month">Por Mês</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => setIsEditorOpen(true)} title="Configurar Etapas">
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mentorados.length}</p>
                <p className="text-xs text-muted-foreground">Mentorados ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {stages.slice(0, 3).map((stage) => {
          const count = mentorados.filter(m => {
            const days = getJourneyDay(m.joined_at);
            return days >= stage.day_start && days <= stage.day_end;
          }).length;
          return (
            <Card key={stage.stage_key} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={cn("p-3 rounded-xl", stage.color.replace("bg-", "bg-") + "/10")}>
                    <Calendar className={cn("h-5 w-5", stage.color.replace("bg-", "text-"))} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{stage.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination for week/month */}
      {filterMode !== "journey" && maxPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {filterMode === "week" 
              ? `Semanas ${currentPage * 8 + 1}-${Math.min((currentPage + 1) * 8, 52)}`
              : `Meses ${currentPage * 6 + 1}-${Math.min((currentPage + 1) * 6, 12)}`}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(maxPages - 1, p + 1))} disabled={currentPage >= maxPages - 1}>
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {columns.map((column: any) => (
          <Card key={column.id} className="glass-card">
            <div className="flex items-center gap-3 p-4 border-b border-border/50">
              <div className={cn("w-3 h-3 rounded-full", column.color)} />
              <h3 className="font-semibold">{column.title}</h3>
              {column.dayStart !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {column.dayStart}-{column.dayEnd}d
                </span>
              )}
              <Badge variant="secondary" className="ml-auto">
                {column.mentorados.length}
              </Badge>
            </div>

            <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {column.mentorados.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum mentorado</p>
                </div>
              ) : (
                column.mentorados.map((mentorado: Mentorado) => (
                  <MentoradoCard
                    key={mentorado.id}
                    mentorado={mentorado}
                    stage={getStageForDay(mentorado.joined_at)}
                    journeyDay={getJourneyDay(mentorado.joined_at)}
                    onClick={() => handleCardClick(mentorado)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stage Editor Sheet */}
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurar Etapas da Jornada</SheetTitle>
            <SheetDescription>Personalize as etapas da jornada CS do seu programa de mentoria.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {tenantId && (
              <JourneyStageEditor
                tenantId={tenantId}
                onSaved={() => {
                  reloadStages();
                  setIsEditorOpen(false);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Mentorado Card Component with progress and glow
function MentoradoCard({ 
  mentorado, stage, journeyDay, onClick 
}: { 
  mentorado: Mentorado; 
  stage: { name: string; color: string; day_start: number; day_end: number };
  journeyDay: number;
  onClick: () => void;
}) {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const stageProgress = stage.day_end > stage.day_start
    ? Math.min(100, Math.round(((journeyDay - stage.day_start) / (stage.day_end - stage.day_start)) * 100))
    : 100;

  // Determine glow color from stage
  const glowColor = stage.color
    .replace("bg-blue-500", "rgba(59,130,246,0.25)")
    .replace("bg-purple-500", "rgba(168,85,247,0.25)")
    .replace("bg-amber-500", "rgba(245,158,11,0.25)")
    .replace("bg-green-500", "rgba(34,197,94,0.25)")
    .replace("bg-rose-500", "rgba(244,63,94,0.25)")
    .replace(/bg-\w+-500/g, "rgba(212,175,55,0.2)");

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 cursor-pointer shadow-sm group hover:bg-white/10 hover:border-primary/50"
      style={{
        boxShadow: undefined,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 20px ${glowColor}`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={mentorado.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(mentorado.profile?.full_name || null)}
            </AvatarFallback>
          </Avatar>
          <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card", stage.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">
            {mentorado.profile?.full_name || "Sem nome"}
          </h4>
          <p className="text-sm text-muted-foreground truncate">
            {mentorado.profile?.email}
          </p>
        </div>
      </div>
      
      {/* Progress within stage */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" className="font-medium text-xs">Dia {journeyDay}</Badge>
          <span>{stageProgress}%</span>
        </div>
        <Progress value={stageProgress} className="h-1.5" />
      </div>

      {mentorado.joined_at && (
        <div className="mt-2 flex items-center justify-between">
          <Badge className={cn("text-xs text-white border-0", stage.color)}>{stage.name}</Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(mentorado.joined_at), "dd/MM/yy", { locale: ptBR })}
          </span>
        </div>
      )}
    </div>
  );
}

function getWeekColor(week: number): string {
  if (week <= 4) return "bg-blue-500";
  if (week <= 8) return "bg-purple-500";
  if (week <= 12) return "bg-amber-500";
  if (week <= 24) return "bg-green-500";
  return "bg-primary";
}

function getMonthColor(month: number): string {
  if (month <= 1) return "bg-blue-500";
  if (month <= 3) return "bg-purple-500";
  if (month <= 6) return "bg-amber-500";
  if (month <= 9) return "bg-green-500";
  return "bg-primary";
}
