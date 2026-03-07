import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageCircle, Plus, Loader2, Send, Settings, Users, CheckCircle2, XCircle,
  Sparkles, Clock, Eye, Trash2, Phone, TrendingUp, Zap, Brain, Rocket, Bot, FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const WhatsAppAutomationTab = lazy(() => import("@/components/whatsapp/WhatsAppAutomationTab").then(m => ({ default: m.WhatsAppAutomationTab })));
import { WhatsAppDashboard } from "@/components/whatsapp/WhatsAppDashboard";
import { WhatsAppQuickSend } from "@/components/whatsapp/WhatsAppQuickSend";
import { WhatsAppIntelligence } from "@/components/whatsapp/WhatsAppIntelligence";
import { WhatsAppAutoReply } from "@/components/whatsapp/WhatsAppAutoReply";
import { WhatsAppDailySummary } from "@/components/whatsapp/WhatsAppDailySummary";

interface WhatsAppConfig {
  id: string;
  tenant_id: string;
  ultramsg_instance_id: string | null;
  ultramsg_token: string | null;
  is_active: boolean;
  sender_name: string | null;
}

interface Campaign {
  id: string;
  name: string;
  message_template: string;
  audience_type: string;
  audience_membership_ids: string[];
  use_ai_personalization: boolean;
  status: string;
  sent_count: number;
  error_count: number;
  sent_at: string | null;
  created_at: string;
}

interface MessageLog {
  id: string;
  recipient_name: string | null;
  recipient_phone: string;
  message_body: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Mentee {
  id: string;
  user_id: string;
  profile?: { full_name: string | null; phone: string | null };
}

export default function WhatsAppCampaigns() {
  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  // Config
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    message_template: "Olá {{nome}}! 👋\n\nEspero que esteja bem! ",
    audience_type: "all_mentees",
    audience_membership_ids: [] as string[],
    use_ai_personalization: true,
  });
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);
  const [aiMsgObjective, setAiMsgObjective] = useState("");

  // Mentees
  const [mentees, setMentees] = useState<Mentee[]>([]);

  // Logs
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Stats
  const [totalSent, setTotalSent] = useState(0);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [activeFlows, setActiveFlows] = useState(0);

  useEffect(() => {
    if (activeMembership && user) fetchAll();
  }, [activeMembership, user]);

  const fetchAll = async () => {
    if (!activeMembership) return;
    setIsLoading(true);
    const tenantId = activeMembership.tenant_id;

    try {
      // Fetch config via masked view
      const { data: cfgData } = await supabase
        .from("whatsapp_config_safe" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (cfgData) {
        const safe = cfgData as any;
        setConfig({
          id: safe.id,
          tenant_id: safe.tenant_id,
          ultramsg_instance_id: safe.ultramsg_instance_id,
          ultramsg_token: safe.ultramsg_token_masked,
          is_active: safe.is_active,
          sender_name: safe.sender_name,
        } as any);
      }

      // Fetch campaigns
      const { data: campData } = await supabase
        .from("whatsapp_campaigns" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      setCampaigns((campData as any[]) || []);
      setTotalCampaigns((campData as any[])?.length || 0);

      // Stats
      const { count } = await supabase
        .from("whatsapp_message_logs" as any)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "sent");

      setTotalSent(count || 0);

      // Active flows count
      const { count: flowCount } = await supabase
        .from("whatsapp_automation_flows" as any)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      setActiveFlows(flowCount || 0);

      // Fetch mentees
      const { data: memberships } = await supabase
        .from("memberships")
        .select("id, user_id")
        .eq("tenant_id", tenantId)
        .eq("role", "mentee")
        .eq("status", "active");

      if (memberships && memberships.length > 0) {
        const userIds = memberships.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
        setMentees(
          memberships.map((m) => ({
            id: m.id,
            user_id: m.user_id,
            profile: profileMap.get(m.user_id) || null,
          })) as Mentee[]
        );
      }

      // Fetch recent logs for dashboard
      const { data: recentLogs } = await supabase
        .from("whatsapp_message_logs" as any)
        .select("status")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100);

      setLogs((recentLogs as any[]) || []);
    } catch (err) {
      console.error("Error loading WhatsApp data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndSendCampaign = async () => {
    if (!activeMembership || !newCampaign.name.trim() || !newCampaign.message_template.trim()) {
      toast({ title: "Preencha nome e mensagem", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const tenantId = activeMembership.tenant_id;

      const { data: campaign, error: campErr } = await supabase
        .from("whatsapp_campaigns" as any)
        .insert({
          tenant_id: tenantId,
          owner_membership_id: activeMembership.id,
          name: newCampaign.name,
          message_template: newCampaign.message_template,
          audience_type: newCampaign.audience_type,
          audience_membership_ids: newCampaign.audience_membership_ids,
          use_ai_personalization: newCampaign.use_ai_personalization,
          status: "sending",
        } as any)
        .select()
        .single();

      if (campErr) throw campErr;
      const campData = campaign as any;

      const { data: result, error: sendErr } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          tenant_id: tenantId,
          campaign_id: campData.id,
          message_template: newCampaign.message_template,
          audience_type: newCampaign.audience_type,
          audience_membership_ids: newCampaign.audience_membership_ids.length > 0
            ? newCampaign.audience_membership_ids
            : undefined,
          use_ai_personalization: newCampaign.use_ai_personalization,
        },
      });

      if (sendErr) throw sendErr;

      toast({
        title: "Campanha enviada! 🚀",
        description: `${result.sent || 0} mensagens enviadas, ${result.errors || 0} erros`,
      });

      setIsNewCampaignOpen(false);
      setNewCampaign({
        name: "",
        message_template: "Olá {{nome}}! 👋\n\nEspero que esteja bem! ",
        audience_type: "all_mentees",
        audience_membership_ids: [],
        use_ai_personalization: true,
      });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Erro ao enviar campanha", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await supabase.from("whatsapp_campaigns" as any).delete().eq("id", id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Campanha removida" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerateCampaignMsg = async () => {
    if (!aiMsgObjective.trim()) {
      toast({ title: "Descreva o objetivo da mensagem", variant: "destructive" });
      return;
    }
    setIsGeneratingMsg(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-whatsapp-flow", {
        body: {
          objective: aiMsgObjective,
          target_audience: "mentorados",
          tone: "motivacional e profissional",
          num_steps: 1,
          context: "Campanha de mensagem única de WhatsApp.",
        },
      });
      if (error) throw error;
      if (data?.flow) {
        const msg = data.flow.steps?.[0]?.message_template || "";
        const name = data.flow.name || "";
        setNewCampaign(prev => ({
          ...prev,
          name: prev.name || name,
          message_template: msg,
        }));
        setAiMsgObjective("");
        toast({ title: "Mensagem gerada! ✨" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingMsg(false);
    }
  };

  const loadLogs = async () => {
    if (!activeMembership) return;
    setIsLogsLoading(true);
    try {
      const { data } = await supabase
        .from("whatsapp_message_logs" as any)
        .select("*")
        .eq("tenant_id", activeMembership.tenant_id)
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((data as any[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const menteesWithPhone = mentees.filter((m) => m.profile?.phone);
  const menteesWithoutPhone = mentees.filter((m) => !m.profile?.phone);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConfigured = config?.ultramsg_instance_id && config?.ultramsg_token && config?.is_active;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Hub WhatsApp</h1>
              <p className="text-sm text-muted-foreground">
                Central de automação, campanhas e inteligência comercial via WhatsApp.
              </p>
            </div>
          </div>
        </div>
        {isConfigured && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveTab("quick_send")}>
              <Send className="h-4 w-4 mr-2" />
              Disparo Rápido
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsNewCampaignOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        )}
      </div>

      {!isConfigured && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">WhatsApp não configurado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  As credenciais do UltraMsg precisam ser configuradas pelo <strong>Administrador Master</strong> no painel de Configurações.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "logs") loadLogs(); }}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <MessageCircle className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5">
            <Zap className="h-4 w-4" />
            Automações IA
          </TabsTrigger>
          <TabsTrigger value="quick_send" className="gap-1.5">
            <Send className="h-4 w-4" />
            Disparo Rápido
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-1.5">
            <Brain className="h-4 w-4" />
            Inteligência IA
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* ======= DASHBOARD TAB ======= */}
        <TabsContent value="dashboard" className="space-y-4">
          <WhatsAppDashboard
            totalSent={totalSent}
            totalCampaigns={totalCampaigns}
            menteesWithPhone={menteesWithPhone.length}
            menteesWithoutPhone={menteesWithoutPhone.length}
            activeFlows={activeFlows}
            recentLogs={logs}
          />

          {/* Quick actions */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card
              className="cursor-pointer hover:border-emerald-500/30 transition-colors group"
              onClick={() => setIsNewCampaignOpen(true)}
            >
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <Rocket className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Nova Campanha</p>
                  <p className="text-xs text-muted-foreground">Envie mensagens em massa com IA</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors group"
              onClick={() => setActiveTab("automations")}
            >
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Criar Fluxo Automático</p>
                  <p className="text-xs text-muted-foreground">Sequências multi-etapa com IA</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-violet-500/30 transition-colors group"
              onClick={() => setActiveTab("intelligence")}
            >
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                  <Brain className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Inteligência Comercial</p>
                  <p className="text-xs text-muted-foreground">IA analisa e sugere cadências</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ======= CAMPAIGNS TAB ======= */}
        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.length === 0 && isConfigured && (
            <div className="text-center py-16 text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-semibold">Nenhuma campanha ainda</h3>
              <p className="text-sm mt-1">Crie sua primeira campanha de WhatsApp!</p>
              <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsNewCampaignOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Campanha
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((camp) => (
              <Card key={camp.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{camp.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {format(new Date(camp.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <Badge variant={camp.status === "sent" ? "default" : camp.status === "sending" ? "secondary" : "outline"}>
                      {camp.status === "sent" ? "Enviada" : camp.status === "sending" ? "Enviando..." : "Rascunho"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{camp.message_template}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {camp.sent_count > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {camp.sent_count} enviadas
                      </span>
                    )}
                    {camp.error_count > 0 && (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        {camp.error_count} erros
                      </span>
                    )}
                    {camp.use_ai_personalization && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        IA
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCampaign(camp.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ======= AUTOMATIONS TAB ======= */}
        <TabsContent value="automations">
          <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
            <WhatsAppAutomationTab />
          </Suspense>
        </TabsContent>

        {/* ======= QUICK SEND TAB ======= */}
        <TabsContent value="quick_send">
          <WhatsAppQuickSend mentees={mentees} onSent={fetchAll} />
        </TabsContent>

        {/* ======= INTELLIGENCE TAB ======= */}
        <TabsContent value="intelligence">
          <WhatsAppIntelligence mentees={mentees} />
        </TabsContent>

        {/* ======= LOGS TAB ======= */}
        <TabsContent value="logs" className="space-y-4">
          {isLogsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma mensagem enviada ainda.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {(logs as any[]).filter(l => l.recipient_phone).map((log: any) => (
                  <Card key={log.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{log.recipient_name || "—"}</span>
                          <span className="text-xs text-muted-foreground">{log.recipient_phone}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{log.message_body}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-[10px]">
                          {log.status === "sent" ? "✓ Enviada" : "✗ Erro"}
                        </Badge>
                        {log.sent_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(log.sent_at), "dd/MM HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    {log.error_message && (
                      <p className="text-[10px] text-destructive mt-1 truncate">{log.error_message}</p>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* ======= NEW CAMPAIGN DIALOG ======= */}
      <Dialog open={isNewCampaignOpen} onOpenChange={setIsNewCampaignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              Nova Campanha WhatsApp
            </DialogTitle>
            <DialogDescription>
              Crie e envie uma campanha para seus mentorados. Use {"{{nome}}"} para personalizar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Campanha</Label>
              <Input
                placeholder="Ex: Boas-vindas Semana 1"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* AI Message Generator */}
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-4 pb-3 space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  Gerar mensagem com IA
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Parabenizar por resultados do mês..."
                    value={aiMsgObjective}
                    onChange={(e) => setAiMsgObjective(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    onClick={handleGenerateCampaignMsg}
                    disabled={isGeneratingMsg || !aiMsgObjective.trim()}
                  >
                    {isGeneratingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Olá {{nome}}! 👋..."
                rows={6}
                value={newCampaign.message_template}
                onChange={(e) => setNewCampaign((f) => ({ ...f, message_template: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">
                Use {"{{nome}}"} para incluir o nome do mentorado.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Audiência</Label>
              <Select
                value={newCampaign.audience_type}
                onValueChange={(v) => setNewCampaign((f) => ({ ...f, audience_type: v, audience_membership_ids: [] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_mentees">Todos os mentorados ({menteesWithPhone.length} com telefone)</SelectItem>
                  <SelectItem value="specific">Selecionar mentorados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newCampaign.audience_type === "specific" && (
              <ScrollArea className="h-40 border rounded-md p-3">
                <div className="space-y-2">
                  {mentees.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={newCampaign.audience_membership_ids.includes(m.id)}
                        disabled={!m.profile?.phone}
                        onCheckedChange={(checked) => {
                          setNewCampaign((f) => ({
                            ...f,
                            audience_membership_ids: checked
                              ? [...f.audience_membership_ids, m.id]
                              : f.audience_membership_ids.filter((id) => id !== m.id),
                          }));
                        }}
                      />
                      <span className={!m.profile?.phone ? "text-muted-foreground line-through" : ""}>
                        {m.profile?.full_name || "Sem nome"}
                      </span>
                      {m.profile?.phone ? (
                        <span className="text-[10px] text-muted-foreground">{m.profile.phone}</span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-500">sem tel.</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="flex items-center gap-3">
              <Switch
                checked={newCampaign.use_ai_personalization}
                onCheckedChange={(v) => setNewCampaign((f) => ({ ...f, use_ai_personalization: v }))}
              />
              <div>
                <Label className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Personalização com IA
                </Label>
                <p className="text-[10px] text-muted-foreground">A IA adapta a mensagem para cada mentorado</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewCampaignOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreateAndSendCampaign}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSending ? "Enviando..." : "Enviar Campanha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
