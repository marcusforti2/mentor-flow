import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanColumn } from "@/components/crm/KanbanColumn";
import { LeadUploadModal } from "@/components/crm/LeadUploadModal";
import { LeadDetailSheet } from "@/components/crm/LeadDetailSheet";
import { BusinessProfileForm } from "@/components/crm/BusinessProfileForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { logActivity } from "@/hooks/useActivityLog";
import type { Lead } from "@/components/crm/LeadCard";
import {
  Loader2,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

const columns = [
  { status: "new", title: "Novos", color: "bg-slate-500" },
  { status: "contacted", title: "Contato", color: "bg-blue-500" },
  { status: "proposal", title: "Proposta", color: "bg-purple-500" },
  { status: "closed", title: "Fechados", color: "bg-green-500" },
  { status: "lost", title: "Perdidos", color: "bg-red-500" },
];

export default function MeuCRM() {
  const { toast } = useToast();
  const { activeMembership } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const membershipId = activeMembership?.id;
  const tenantId = activeMembership?.tenant_id;

  useEffect(() => {
    if (membershipId) {
      loadLeads();
    } else {
      setIsLoading(false);
    }
  }, [membershipId]);

  const loadLeads = async () => {
    if (!membershipId) return;
    
    try {
      setIsLoading(true);
      const { data: leadsData, error: leadsError } = await supabase
        .from("crm_prospections")
        .select("*")
        .eq("membership_id", membershipId)
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      setLeads((leadsData || []) as Lead[]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os leads.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("crm_prospections")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      // Log activity
      if (membershipId) {
        logActivity({
          membershipId,
          tenantId,
          actionType: 'lead_status_changed',
          description: `Lead movido para ${newStatus}`,
          metadata: { leadId, newStatus },
        });
      }

      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
      );
    } catch (error) {
      toast({ title: "Erro ao mover lead", variant: "destructive" });
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailSheetOpen(true);
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.temperature === "hot").length;
  const closedLeads = leads.filter((l) => l.status === "closed").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Meu CRM</h1>
          <p className="text-muted-foreground">Gerencie seus leads com inteligência</p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Sparkles className="w-4 h-4 mr-2" />
          Novo Lead com IA
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-muted/30 border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Total de Leads</span>
          </div>
          <span className="text-2xl font-bold">{totalLeads}</span>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-sm">Leads Quentes</span>
          </div>
          <span className="text-2xl font-bold text-red-400">{hotLeads}</span>
        </div>
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Fechados</span>
          </div>
          <span className="text-2xl font-bold text-green-400">{closedLeads}</span>
        </div>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="config">Meu Negócio</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Kanban */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((col) => (
              <KanbanColumn
                key={col.status}
                title={col.title}
                status={col.status}
                color={col.color}
                leads={filteredLeads.filter((lead) => lead.status === col.status)}
                onLeadClick={handleLeadClick}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="config">
          {membershipId && <BusinessProfileForm membershipId={membershipId} />}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {membershipId && (
        <LeadUploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onLeadCreated={() => {
            loadLeads();
            logActivity({
              membershipId,
              tenantId,
              actionType: 'lead_created',
              description: 'Novo lead cadastrado via IA',
              pointsEarned: 10,
            });
          }}
          membershipId={membershipId}
          tenantId={tenantId}
        />
      )}

      <LeadDetailSheet
        lead={selectedLead}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onUpdate={loadLeads}
      />
    </div>
  );
}
