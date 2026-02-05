import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  Search,
  Users,
  Target,
  TrendingUp,
  Building2,
  Phone,
  Mail,
  Calendar,
  Eye,
  Filter,
  BarChart3,
  Flame,
  Snowflake,
  ThermometerSun,
  ChevronRight,
} from "lucide-react";
import { LeadDetailSheet } from "@/components/crm/LeadDetailSheet";
import type { Lead } from "@/components/crm/LeadCard";

interface MentoradoWithLeads {
  id: string;
  user_id: string;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  leadsCount: number;
  hotLeads: number;
  closedLeads: number;
}

interface LeadWithMentorado extends Lead {
  mentorado_name: string | null;
  mentorado_id: string;
}

const temperatureConfig = {
  hot: { label: "Quente", color: "text-red-400", icon: Flame },
  warm: { label: "Morno", color: "text-amber-400", icon: ThermometerSun },
  cold: { label: "Frio", color: "text-blue-400", icon: Snowflake },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "Novo", color: "bg-slate-500" },
  contacted: { label: "Contato", color: "bg-blue-500" },
  proposal: { label: "Proposta", color: "bg-purple-500" },
  closed: { label: "Fechado", color: "bg-green-500" },
  lost: { label: "Perdido", color: "bg-red-500" },
};

export default function CRMMentorados() {
  const { toast } = useToast();
  const { activeMembership } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [mentorados, setMentorados] = useState<MentoradoWithLeads[]>([]);
  const [allLeads, setAllLeads] = useState<LeadWithMentorado[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentorado, setSelectedMentorado] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTemperature, setSelectedTemperature] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeMembership]);

  const loadData = async () => {
    if (!activeMembership?.tenant_id) return;

    setIsLoading(true);
    try {
      // Load all mentorados in the tenant (using legacy table for now)
      // TODO: Migrate to memberships model
      const { data: mentoradosData, error: mentoradosError } = await supabase
        .from("mentorados")
        .select(`
          id,
          user_id,
          mentor_id
        `);

      if (mentoradosError) throw mentoradosError;

      if (!mentoradosData || mentoradosData.length === 0) {
        setMentorados([]);
        setAllLeads([]);
        setIsLoading(false);
        return;
      }

      const mentoradoIds = mentoradosData.map((m) => m.id);
      const userIds = mentoradosData.map((m) => m.user_id);

      // Fetch profiles for mentorados
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);

      // Fetch all leads from these mentorados
      const { data: leadsData, error: leadsError } = await supabase
        .from("crm_prospections")
        .select("*")
        .in("mentorado_id", mentoradoIds)
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      // Map mentorados with their lead counts
      const mentoradosWithStats: MentoradoWithLeads[] = mentoradosData.map((m) => {
        const profile = profiles?.find((p) => p.user_id === m.user_id) || null;
        const mentoradoLeads = leadsData?.filter((l) => l.mentorado_id === m.id) || [];
        
        return {
          id: m.id,
          user_id: m.user_id,
          profile,
          leadsCount: mentoradoLeads.length,
          hotLeads: mentoradoLeads.filter((l) => l.temperature === "hot").length,
          closedLeads: mentoradoLeads.filter((l) => l.status === "closed").length,
        };
      });

      // Map leads with mentorado names
      const leadsWithMentorado: LeadWithMentorado[] = (leadsData || []).map((lead) => {
        const mentorado = mentoradosData.find((m) => m.id === lead.mentorado_id);
        const profile = profiles?.find((p) => p.user_id === mentorado?.user_id);
        return {
          ...lead,
          mentorado_name: profile?.full_name || "Desconhecido",
          mentorado_id: lead.mentorado_id,
        } as LeadWithMentorado;
      });

      setMentorados(mentoradosWithStats.filter((m) => m.leadsCount > 0 || m.profile));
      setAllLeads(leadsWithMentorado);
    } catch (error) {
      console.error("Error loading CRM data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do CRM.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter leads
  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead) => {
      // Search filter
      const matchesSearch =
        lead.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.mentorado_name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Mentorado filter
      const matchesMentorado =
        selectedMentorado === "all" || lead.mentorado_id === selectedMentorado;

      // Status filter
      const matchesStatus =
        selectedStatus === "all" || lead.status === selectedStatus;

      // Temperature filter
      const matchesTemperature =
        selectedTemperature === "all" || lead.temperature === selectedTemperature;

      return matchesSearch && matchesMentorado && matchesStatus && matchesTemperature;
    });
  }, [allLeads, searchQuery, selectedMentorado, selectedStatus, selectedTemperature]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const hot = filteredLeads.filter((l) => l.temperature === "hot").length;
    const closed = filteredLeads.filter((l) => l.status === "closed").length;
    const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { total, hot, closed, conversionRate };
  }, [filteredLeads]);

  const handleLeadClick = (lead: LeadWithMentorado) => {
    setSelectedLead(lead);
    setDetailSheetOpen(true);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">CRM dos Mentorados</h1>
          <p className="text-muted-foreground">
            Visão completa de todos os leads e prospecções
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Total de Leads</span>
            </div>
            <span className="text-2xl font-bold">{stats.total}</span>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <Flame className="w-4 h-4" />
              <span className="text-sm">Leads Quentes</span>
            </div>
            <span className="text-2xl font-bold text-red-400">{stats.hot}</span>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Fechados</span>
            </div>
            <span className="text-2xl font-bold text-green-400">{stats.closed}</span>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Taxa Conversão</span>
            </div>
            <span className="text-2xl font-bold text-primary">{stats.conversionRate}%</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Todos os Leads</TabsTrigger>
          <TabsTrigger value="mentorados">Por Mentorado</TabsTrigger>
        </TabsList>

        {/* All Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads ou mentorados..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedMentorado} onValueChange={setSelectedMentorado}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por mentorado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os mentorados</SelectItem>
                {mentorados.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.profile?.full_name || "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTemperature} onValueChange={setSelectedTemperature}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Temperatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="hot">Quente</SelectItem>
                <SelectItem value="warm">Morno</SelectItem>
                <SelectItem value="cold">Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Leads Table */}
          {filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
                <p className="text-muted-foreground text-sm">
                  {allLeads.length === 0
                    ? "Os mentorados ainda não cadastraram leads no CRM."
                    : "Nenhum lead corresponde aos filtros selecionados."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Mentorado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Temperatura</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const temp = temperatureConfig[lead.temperature as keyof typeof temperatureConfig] || temperatureConfig.cold;
                    const status = statusConfig[lead.status || "new"] || statusConfig.new;
                    const TempIcon = temp.icon;

                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleLeadClick(lead)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {getInitials(lead.contact_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{lead.contact_name}</p>
                              {lead.company && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {lead.company}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{lead.mentorado_name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", status.color, "text-white border-0")}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={cn("flex items-center gap-1", temp.color)}>
                            <TempIcon className="w-4 h-4" />
                            <span className="text-sm">{temp.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.created_at && (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(lead.created_at), "dd MMM yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* By Mentorado Tab */}
        <TabsContent value="mentorados" className="space-y-4">
          {mentorados.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum mentorado encontrado</h3>
                <p className="text-muted-foreground text-sm">
                  Ainda não há mentorados cadastrados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mentorados.map((mentorado) => (
                <Card
                  key={mentorado.id}
                  className={cn(
                    "cursor-pointer hover:border-primary/50 transition-all",
                    selectedMentorado === mentorado.id && "border-primary"
                  )}
                  onClick={() => {
                    setSelectedMentorado(mentorado.id);
                    // Switch to leads tab with filter
                    const tabsElement = document.querySelector('[data-state="inactive"][value="leads"]');
                    if (tabsElement) {
                      (tabsElement as HTMLElement).click();
                    }
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={mentorado.profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {getInitials(mentorado.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {mentorado.profile?.full_name || "Sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {mentorado.profile?.email}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{mentorado.leadsCount}</p>
                        <p className="text-[10px] text-muted-foreground">Leads</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <p className="text-lg font-bold text-red-400">{mentorado.hotLeads}</p>
                        <p className="text-[10px] text-red-400">Quentes</p>
                      </div>
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <p className="text-lg font-bold text-green-400">{mentorado.closedLeads}</p>
                        <p className="text-[10px] text-green-400">Fechados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLead}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onUpdate={loadData}
      />
    </div>
  );
}
