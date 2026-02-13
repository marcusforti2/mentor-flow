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
import { Loader2, Search, Users, Calendar, Filter, ChevronLeft, ChevronRight, Settings2, AlertTriangle, LayoutGrid, List, ArrowUpDown } from "lucide-react";
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
type ViewMode = "kanban" | "table";
type SortField = "name" | "day" | "week" | "month" | "stage" | "joined_at";
type SortDir = "asc" | "desc";

export default function JornadaCS() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("journey");
  const [currentPage, setCurrentPage] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [sortField, setSortField] = useState<SortField>("day");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  
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
      
      // Fetch mentee memberships for this tenant (same source as Mentorados.tsx)
      const { data: menteeMemberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('id, user_id, status, created_at')
        .eq('tenant_id', tid)
        .eq('role', 'mentee')
        .eq('status', 'active');
      
      if (membershipsError) throw membershipsError;
      
      if (!menteeMemberships || menteeMemberships.length === 0) {
        setMentorados([]);
        setIsLoading(false);
        return;
      }
      
      const userIds = menteeMemberships.map(m => m.user_id);
      const membershipIds = menteeMemberships.map(m => m.id);
      
      // Fetch profiles and mentee_profiles in parallel
      const [profilesResult, menteeProfilesResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, avatar_url').in('user_id', userIds),
        supabase.from('mentee_profiles').select('membership_id, joined_at').in('membership_id', membershipIds),
      ]);
      
      const result: Mentorado[] = menteeMemberships.map(m => {
        const profile = profilesResult.data?.find(p => p.user_id === m.user_id) || null;
        const menteeProfile = menteeProfilesResult.data?.find(mp => mp.membership_id === m.id);
        
        return {
          id: m.id,
          user_id: m.user_id,
          status: m.status,
          joined_at: menteeProfile?.joined_at || m.created_at,
          profile,
        };
      });
      
      setMentorados(result);
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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedMentorados = useMemo(() => {
    const list = [...filteredMentorados];
    list.sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      switch (sortField) {
        case "name":
          va = a.profile?.full_name?.toLowerCase() || "";
          vb = b.profile?.full_name?.toLowerCase() || "";
          break;
        case "day":
          va = getJourneyDay(a.joined_at);
          vb = getJourneyDay(b.joined_at);
          break;
        case "week":
          va = getWeekInJourney(a.joined_at);
          vb = getWeekInJourney(b.joined_at);
          break;
        case "month":
          va = getMonthInJourney(a.joined_at);
          vb = getMonthInJourney(b.joined_at);
          break;
        case "stage":
          va = getStageForDay(a.joined_at).position;
          vb = getStageForDay(b.joined_at).position;
          break;
        case "joined_at":
          va = a.joined_at || "";
          vb = b.joined_at || "";
          break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredMentorados, sortField, sortDir]);

  const handleCardClick = (mentorado: Mentorado) => {
    navigate(`/mentor/mentorados?open=${mentorado.id}`);
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

          <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
            <Button 
              variant={viewMode === "kanban" ? "default" : "ghost"} 
              size="icon" 
              onClick={() => setViewMode("kanban")} 
              title="Visão Kanban"
              className="rounded-none"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "table" ? "default" : "ghost"} 
              size="icon" 
              onClick={() => setViewMode("table")} 
              title="Visão Lista"
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

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

      {/* Pagination for week/month - only in kanban */}
      {viewMode === "kanban" && filterMode !== "journey" && maxPages > 1 && (
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

      {viewMode === "kanban" ? (
        /* Kanban Board */
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
      ) : (
        /* Table View */
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <SortHeader field="name" label="Mentorado" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="joined_at" label="Início" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="day" label="Dia" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="week" label="Semana" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="month" label="Mês" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="stage" label="Etapa" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {sortedMentorados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum mentorado encontrado</p>
                    </td>
                  </tr>
                ) : (
                  sortedMentorados.map((mentorado) => {
                    const stage = getStageForDay(mentorado.joined_at);
                    const day = getJourneyDay(mentorado.joined_at);
                    const week = getWeekInJourney(mentorado.joined_at);
                    const month = getMonthInJourney(mentorado.joined_at);
                    const progress = stage.day_end > stage.day_start
                      ? Math.min(100, Math.round(((day - stage.day_start) / (stage.day_end - stage.day_start)) * 100))
                      : 100;

                    return (
                      <tr
                        key={mentorado.id}
                        onClick={() => handleCardClick(mentorado)}
                        className="border-b border-border/30 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-primary/20">
                              <AvatarImage src={mentorado.profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {mentorado.profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm text-foreground">{mentorado.profile?.full_name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground">{mentorado.profile?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {mentorado.joined_at ? format(new Date(mentorado.joined_at), "dd/MM/yy", { locale: ptBR }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-mono">{day}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{week}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{month}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("text-xs text-white border-0", stage.color)}>{stage.name}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={progress} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border/50 text-xs text-muted-foreground">
            {sortedMentorados.length} mentorado{sortedMentorados.length !== 1 ? "s" : ""} • Ordenado por {
              { name: "nome", day: "dia", week: "semana", month: "mês", stage: "etapa", joined_at: "data de início" }[sortField]
            } ({sortDir === "asc" ? "crescente" : "decrescente"})
          </div>
        </Card>
      )}

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
// Sortable table header
function SortHeader({ field, label, current, dir, onSort }: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const isActive = current === field;
  return (
    <th
      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("w-3 h-3", isActive ? "text-primary" : "opacity-40")} />
        {isActive && <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>}
      </div>
    </th>
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
