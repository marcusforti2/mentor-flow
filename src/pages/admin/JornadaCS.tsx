import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Search, 
  Users,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { differenceInDays, differenceInWeeks, differenceInMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Mentorado {
  id: string;
  user_id: string;
  status: string | null;
  joined_at: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

type FilterMode = "week" | "month" | "journey";

interface JourneyStage {
  id: string;
  name: string;
  dayStart: number;
  dayEnd: number;
  color: string;
}

// Default journey stages
const defaultJourneyStages: JourneyStage[] = [
  { id: "onboarding", name: "Onboarding", dayStart: 0, dayEnd: 7, color: "bg-blue-500" },
  { id: "learning", name: "Aprendizado", dayStart: 8, dayEnd: 30, color: "bg-purple-500" },
  { id: "applying", name: "Aplicação", dayStart: 31, dayEnd: 60, color: "bg-yellow-500" },
  { id: "scaling", name: "Escala", dayStart: 61, dayEnd: 90, color: "bg-green-500" },
  { id: "mastery", name: "Maestria", dayStart: 91, dayEnd: 365, color: "bg-primary" },
];

export default function JornadaCS() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("week");
  const [currentPage, setCurrentPage] = useState(0);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMentorados = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (mentorData) {
        const { data: mentoradosData, error: mentoradosError } = await supabase
          .from('mentorados')
          .select('id, user_id, status, joined_at')
          .eq('mentor_id', mentorData.id)
          .eq('status', 'active');
        
        if (mentoradosError) throw mentoradosError;
        
        if (mentoradosData && mentoradosData.length > 0) {
          const userIds = mentoradosData.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, avatar_url')
            .in('user_id', userIds);
          
          const mentoradosWithProfiles = mentoradosData.map(m => ({
            ...m,
            profile: profiles?.find(p => p.user_id === m.user_id) || null
          }));
          
          setMentorados(mentoradosWithProfiles);
        } else {
          setMentorados([]);
        }
      }
    } catch (error) {
      console.error('Error fetching mentorados:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os mentorados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorados();
  }, [user]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getDaysInJourney = (joinedAt: string | null): number => {
    if (!joinedAt) return 0;
    return differenceInDays(new Date(), new Date(joinedAt));
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

  // Generate columns based on filter mode
  const columns = useMemo(() => {
    if (filterMode === "journey") {
      return defaultJourneyStages.map(stage => ({
        id: stage.id,
        title: stage.name,
        color: stage.color,
        mentorados: filteredMentorados.filter(m => {
          const days = getDaysInJourney(m.joined_at);
          return days >= stage.dayStart && days <= stage.dayEnd;
        })
      }));
    }
    
    if (filterMode === "month") {
      const monthsToShow = 12;
      const startMonth = currentPage * 6;
      return Array.from({ length: 6 }, (_, i) => {
        const monthNum = startMonth + i + 1;
        if (monthNum > monthsToShow) return null;
        return {
          id: `month-${monthNum}`,
          title: `Mês ${monthNum}`,
          color: getMonthColor(monthNum),
          mentorados: filteredMentorados.filter(m => getMonthInJourney(m.joined_at) === monthNum)
        };
      }).filter(Boolean);
    }
    
    // Week view (default)
    const weeksToShow = 52;
    const startWeek = currentPage * 8;
    return Array.from({ length: 8 }, (_, i) => {
      const weekNum = startWeek + i + 1;
      if (weekNum > weeksToShow) return null;
      return {
        id: `week-${weekNum}`,
        title: `Semana ${weekNum}`,
        color: getWeekColor(weekNum),
        mentorados: filteredMentorados.filter(m => getWeekInJourney(m.joined_at) === weekNum)
      };
    }).filter(Boolean);
  }, [filterMode, filteredMentorados, currentPage]);

  const maxPages = filterMode === "week" ? Math.ceil(52 / 8) : filterMode === "month" ? Math.ceil(12 / 6) : 0;

  if (isLoading) {
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
              <SelectItem value="week">Por Semana</SelectItem>
              <SelectItem value="month">Por Mês</SelectItem>
              <SelectItem value="journey">Por Jornada</SelectItem>
            </SelectContent>
          </Select>
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
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mentorados.filter(m => getDaysInJourney(m.joined_at) <= 7).length}
                </p>
                <p className="text-xs text-muted-foreground">Na 1ª semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mentorados.filter(m => getDaysInJourney(m.joined_at) >= 90).length}
                </p>
                <p className="text-xs text-muted-foreground">+90 dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Calendar className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(mentorados.reduce((acc, m) => acc + getDaysInJourney(m.joined_at), 0) / (mentorados.length || 1))}
                </p>
                <p className="text-xs text-muted-foreground">Média de dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pagination controls for week/month views */}
      {filterMode !== "journey" && maxPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {filterMode === "week" 
              ? `Semanas ${currentPage * 8 + 1}-${Math.min((currentPage + 1) * 8, 52)}`
              : `Meses ${currentPage * 6 + 1}-${Math.min((currentPage + 1) * 6, 12)}`
            }
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(maxPages - 1, p + 1))}
            disabled={currentPage >= maxPages - 1}
          >
            Próximo
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {columns.map((column: any) => (
            <div
              key={column.id}
              className="flex flex-col min-w-[280px] max-w-[320px] bg-muted/30 rounded-xl"
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 p-3 border-b border-border/50">
                <div className={cn("w-3 h-3 rounded-full", column.color)} />
                <span className="font-medium text-sm">{column.title}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {column.mentorados.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-400px)]">
                {column.mentorados.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum mentorado
                  </div>
                ) : (
                  column.mentorados.map((mentorado: Mentorado) => (
                    <MentoradoCard key={mentorado.id} mentorado={mentorado} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

// Mentorado Card Component
function MentoradoCard({ mentorado }: { mentorado: Mentorado }) {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getDaysInJourney = (joinedAt: string | null): number => {
    if (!joinedAt) return 0;
    return differenceInDays(new Date(), new Date(joinedAt));
  };

  const days = getDaysInJourney(mentorado.joined_at);

  return (
    <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={mentorado.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(mentorado.profile?.full_name || null)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {mentorado.profile?.full_name || "Sem nome"}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {mentorado.profile?.email}
            </p>
          </div>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs">
          <Badge variant="outline" className="text-xs">
            Dia {days}
          </Badge>
          {mentorado.joined_at && (
            <span className="text-muted-foreground">
              {format(new Date(mentorado.joined_at), "dd/MM/yy", { locale: ptBR })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions for colors
function getWeekColor(week: number): string {
  if (week <= 4) return "bg-blue-500";
  if (week <= 8) return "bg-purple-500";
  if (week <= 12) return "bg-yellow-500";
  if (week <= 24) return "bg-green-500";
  return "bg-primary";
}

function getMonthColor(month: number): string {
  if (month <= 1) return "bg-blue-500";
  if (month <= 3) return "bg-purple-500";
  if (month <= 6) return "bg-yellow-500";
  if (month <= 9) return "bg-green-500";
  return "bg-primary";
}
