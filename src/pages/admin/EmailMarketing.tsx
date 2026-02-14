import { useState, useEffect } from "react";
import DOMPurify from 'dompurify';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Loader2,
  Mail,
  Workflow,
  Sparkles,
  Play,
  Pause,
  Trash2,
  Edit3,
  LayoutTemplate,
  Zap,
  Clock,
  Users,
  TrendingUp,
  Copy,
  History,
  CheckCircle2,
  XCircle,
  Send,
} from "lucide-react";
import FlowEditor from "@/components/email/FlowEditor";
import TemplateEditor from "@/components/email/TemplateEditor";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmailFlow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  nodes: any;
  edges: any;
  created_at: string;
  audience_type?: string;
  audience_membership_ids?: string[];
  tenant_id?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
}

interface FlowStats {
  flow_id: string;
  total_executions: number;
  last_sent: string | null;
  success_count: number;
  error_count: number;
}

interface ExecutionRecord {
  id: string;
  flow_id: string;
  mentorado_id: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export default function EmailMarketing() {
  const [flows, setFlows] = useState<EmailFlow[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("flows");
  
  // Stats
  const [totalEmailsSent, setTotalEmailsSent] = useState(0);
  const [flowStatsMap, setFlowStatsMap] = useState<Map<string, FlowStats>>(new Map());
  
  // Flow editor state
  const [selectedFlow, setSelectedFlow] = useState<EmailFlow | null>(null);
  const [isFlowEditorOpen, setIsFlowEditorOpen] = useState(false);
  
  // Template editor state
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  
  // AI Campaign generator
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New flow dialog
  const [isNewFlowDialogOpen, setIsNewFlowDialogOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");

  // History dialog
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyFlowId, setHistoryFlowId] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<ExecutionRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    if (activeMembership && user) fetchData();
  }, [activeMembership, user]);

  const fetchData = async () => {
    if (!activeMembership || !user) return;
    setIsLoading(true);
    try {
      const tenantId = activeMembership.tenant_id;
      // Use membership ID as the owner reference
      const ownerMembershipId = activeMembership.id;
      setMentorId(ownerMembershipId);

      // Fetch flows by tenant_id (covers all flows for this tenant)
      const { data: flowsData } = await supabase
        .from('email_flows')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      setFlows(flowsData || []);

      // Fetch templates by tenant_id
      const { data: templatesData } = await supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      setTemplates(templatesData || []);

      // Fetch execution stats
      if (flowsData && flowsData.length > 0) {
        const flowIds = flowsData.map(f => f.id);
        const { data: executions } = await supabase
          .from('email_flow_executions')
          .select('id, flow_id, status, started_at')
          .in('flow_id', flowIds);

        if (executions) {
          setTotalEmailsSent(executions.length);
          const statsMap = new Map<string, FlowStats>();
          for (const exec of executions) {
            const existing = statsMap.get(exec.flow_id);
            if (existing) {
              existing.total_executions++;
              if (exec.status === 'completed') existing.success_count++;
              else if (exec.status === 'failed') existing.error_count++;
              if (exec.started_at && (!existing.last_sent || exec.started_at > existing.last_sent)) {
                existing.last_sent = exec.started_at;
              }
            } else {
              statsMap.set(exec.flow_id, {
                flow_id: exec.flow_id,
                total_executions: 1,
                last_sent: exec.started_at,
                success_count: exec.status === 'completed' ? 1 : 0,
                error_count: exec.status === 'failed' ? 1 : 0,
              });
            }
          }
          setFlowStatsMap(statsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFlow = async () => {
    if (!mentorId || !newFlowName.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('email_flows')
        .insert({
          mentor_id: mentorId,
          tenant_id: activeMembership.tenant_id,
          name: newFlowName,
          description: newFlowDescription || null,
          nodes: [],
          edges: [],
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setFlows([data, ...flows]);
      setIsNewFlowDialogOpen(false);
      setNewFlowName("");
      setNewFlowDescription("");
      
      setSelectedFlow(data);
      setIsFlowEditorOpen(true);
      
      toast({ title: "Fluxo criado!" });
    } catch (error: any) {
      toast({ title: "Erro ao criar fluxo", description: error.message, variant: "destructive" });
    }
  };

  const handleDuplicateFlow = async (flow: EmailFlow) => {
    if (!mentorId) return;
    try {
      const { data, error } = await supabase
        .from('email_flows')
        .insert({
          mentor_id: mentorId,
          tenant_id: activeMembership.tenant_id,
          name: `Cópia de ${flow.name}`,
          description: flow.description,
          nodes: flow.nodes,
          edges: flow.edges,
          audience_type: flow.audience_type,
          audience_membership_ids: flow.audience_membership_ids,
          is_active: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      setFlows([data, ...flows]);
      toast({ title: "Fluxo duplicado!" });
    } catch (error: any) {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleFlowActive = async (flowId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('email_flows')
        .update({ is_active: !currentState })
        .eq('id', flowId);
      
      if (error) throw error;
      
      setFlows(flows.map(f => f.id === flowId ? { ...f, is_active: !currentState } : f));
      toast({ title: !currentState ? "Fluxo ativado!" : "Fluxo pausado" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    try {
      const { error } = await supabase
        .from('email_flows')
        .delete()
        .eq('id', flowId);
      
      if (error) throw error;
      
      setFlows(flows.filter(f => f.id !== flowId));
      toast({ title: "Fluxo removido" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleOpenHistory = async (flowId: string) => {
    setHistoryFlowId(flowId);
    setIsHistoryOpen(true);
    setIsHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('email_flow_executions')
        .select('*')
        .eq('flow_id', flowId)
        .order('started_at', { ascending: false })
        .limit(50);
      setHistoryRecords(data || []);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Digite uma descrição para a campanha", variant: "destructive" });
      return;
    }
    if (!mentorId) {
      toast({ title: "Erro: Mentor não encontrado", variant: "destructive" });
      return;
    }
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-email-campaign', {
        body: { prompt: aiPrompt, mentorId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.flow) {
        setFlows([data.flow, ...flows]);
        toast({ title: "Campanha gerada com sucesso!", description: data.flow.name });
      }
      if (data?.template) {
        setTemplates([data.template, ...templates]);
      }
      
      setIsAIDialogOpen(false);
      setAiPrompt("");
    } catch (error: any) {
      toast({ title: "Erro ao gerar campanha", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveFlow = async (flowId: string, nodes: any[], edges: any[], audienceType?: string, audienceMembershipIds?: string[], name?: string, description?: string) => {
    try {
      const updateData: any = { nodes, edges };
      if (audienceType !== undefined) updateData.audience_type = audienceType;
      if (audienceMembershipIds !== undefined) updateData.audience_membership_ids = audienceMembershipIds;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const { error } = await supabase
        .from('email_flows')
        .update(updateData)
        .eq('id', flowId);
      
      if (error) throw error;
      
      setFlows(flows.map(f => f.id === flowId ? { ...f, nodes, edges, audience_type: audienceType || f.audience_type, audience_membership_ids: audienceMembershipIds || f.audience_membership_ids, name: name || f.name, description: description !== undefined ? description : f.description } : f));
      toast({ title: "Fluxo salvo!" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Flow Editor View
  if (isFlowEditorOpen && selectedFlow) {
    return (
      <FlowEditor
        flow={selectedFlow}
        templates={templates}
        tenantId={activeMembership?.tenant_id}
        onSave={(nodes, edges, audienceType, audienceMembershipIds, name, description) => handleSaveFlow(selectedFlow.id, nodes, edges, audienceType, audienceMembershipIds, name, description)}
        onClose={() => {
          setIsFlowEditorOpen(false);
          setSelectedFlow(null);
        }}
      />
    );
  }

  // Template Editor View
  if (isTemplateEditorOpen && selectedTemplate) {
    return (
      <TemplateEditor
        template={selectedTemplate}
        mentorId={mentorId!}
        onSave={() => {
          fetchData();
          setIsTemplateEditorOpen(false);
          setSelectedTemplate(null);
        }}
        onClose={() => {
          setIsTemplateEditorOpen(false);
          setSelectedTemplate(null);
        }}
      />
    );
  }

  const successRate = totalEmailsSent > 0
    ? Math.round(([...flowStatsMap.values()].reduce((acc, s) => acc + s.success_count, 0) / totalEmailsSent) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Email Marketing</h1>
          <p className="text-muted-foreground">Crie fluxos de automação e campanhas inteligentes</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Criar com IA
          </Button>
          <Button className="gradient-gold text-primary-foreground" onClick={() => setIsNewFlowDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fluxo
          </Button>
        </div>
      </div>

      {/* Stats - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{flows.length}</p>
                <p className="text-xs text-muted-foreground">Fluxos Criados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{flows.filter(f => f.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Fluxos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Send className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEmailsSent}</p>
                <p className="text-xs text-muted-foreground">Emails Enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="flows" className="gap-2">
            <Workflow className="h-4 w-4" />
            Fluxos de Automação
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="mt-6">
          {flows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Workflow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum fluxo criado</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Crie seu primeiro fluxo de automação ou use a IA para gerar uma campanha
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Criar com IA
                  </Button>
                  <Button onClick={() => setIsNewFlowDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Manualmente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flows.map(flow => {
                const stats = flowStatsMap.get(flow.id);
                return (
                  <Card key={flow.id} className="group hover:border-primary/50 transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{flow.name}</CardTitle>
                          {flow.description && (
                            <p className="text-sm text-muted-foreground mt-1">{flow.description}</p>
                          )}
                        </div>
                        <Badge variant={flow.is_active ? "default" : "secondary"}>
                          {flow.is_active ? "Ativo" : "Pausado"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {flow.nodes?.length || 0} etapas
                        </span>
                        {stats && (
                          <>
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {stats.total_executions} envios
                            </span>
                          </>
                        )}
                      </div>
                      {stats?.last_sent && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Último envio: {format(new Date(stats.last_sent), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedFlow(flow);
                            setIsFlowEditorOpen(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Histórico"
                          onClick={() => handleOpenHistory(flow.id)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Duplicar"
                          onClick={() => handleDuplicateFlow(flow)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={flow.is_active ? "secondary" : "default"}
                          size="sm"
                          onClick={() => handleToggleFlowActive(flow.id, flow.is_active)}
                        >
                          {flow.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:text-destructive"
                          onClick={() => handleDeleteFlow(flow.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutTemplate className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum template</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Templates serão criados automaticamente ao usar a IA ou ao adicionar etapas de email nos fluxos
                </p>
                <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar com IA
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <Card key={template.id} className="group hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsTemplateEditorOpen(true);
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Assunto:</strong> {template.subject}
                    </p>
                    <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(template.body_html.substring(0, 200) + '...') }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Flow Dialog */}
      <Dialog open={isNewFlowDialogOpen} onOpenChange={setIsNewFlowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Fluxo</DialogTitle>
            <DialogDescription>Dê um nome para seu fluxo de automação</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Fluxo *</Label>
              <Input value={newFlowName} onChange={(e) => setNewFlowName(e.target.value)} placeholder="Ex: Boas-vindas Novos Mentorados" />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={newFlowDescription} onChange={(e) => setNewFlowDescription(e.target.value)} placeholder="Descreva o objetivo deste fluxo" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewFlowDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateFlow} disabled={!newFlowName.trim()}>Criar Fluxo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Campaign Dialog */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Criar Campanha com IA
            </DialogTitle>
            <DialogDescription>Descreva a campanha que você quer criar e a IA irá gerar o fluxo completo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ex: Quero criar uma campanha de boas-vindas para novos mentorados com 5 emails ao longo de 15 dias..." rows={5} className="resize-none" />
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Sugestões de campanhas:</p>
              <div className="flex flex-wrap gap-2">
                {["Boas-vindas para novos mentorados", "Reengajamento de inativos", "Parabéns por conclusão de trilha", "Lembrete de encontro ao vivo", "Campanha de renovação"].map(suggestion => (
                  <Button key={suggestion} variant="outline" size="sm" className="text-xs" onClick={() => setAiPrompt(suggestion)}>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAIDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerateWithAI} disabled={!aiPrompt.trim() || isGenerating}>
              {isGenerating ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando...</>) : (<><Sparkles className="h-4 w-4 mr-2" />Gerar Campanha</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Envios
            </DialogTitle>
            <DialogDescription>
              {historyFlowId && flows.find(f => f.id === historyFlowId)?.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[360px]">
            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum envio registrado</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {historyRecords.map(record => (
                  <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    {record.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : record.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{record.mentorado_id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">
                        {record.started_at ? format(new Date(record.started_at), "dd/MM/yy HH:mm", { locale: ptBR }) : '—'}
                      </p>
                    </div>
                    <Badge variant={record.status === 'completed' ? 'default' : record.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                      {record.status === 'completed' ? 'Enviado' : record.status === 'failed' ? 'Falhou' : record.status || 'Pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
