import { useState, useEffect } from "react";
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
  Sparkles, Clock, Eye, Trash2, Phone, TrendingUp, Zap,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const [activeTab, setActiveTab] = useState("campaigns");
  const [isLoading, setIsLoading] = useState(true);

  // Config
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [configForm, setConfigForm] = useState({
    ultramsg_instance_id: "",
    ultramsg_token: "",
    is_active: false,
    sender_name: "",
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

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

  // Mentees for audience selection
  const [mentees, setMentees] = useState<Mentee[]>([]);

  // Logs
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Stats
  const [totalSent, setTotalSent] = useState(0);
  const [totalCampaigns, setTotalCampaigns] = useState(0);

  useEffect(() => {
    if (activeMembership && user) fetchAll();
  }, [activeMembership, user]);

  const fetchAll = async () => {
    if (!activeMembership) return;
    setIsLoading(true);
    const tenantId = activeMembership.tenant_id;

    try {
      // Fetch config
      const { data: cfgData } = await supabase
        .from("tenant_whatsapp_config" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (cfgData) {
        const cfg = cfgData as any;
        setConfig(cfg);
        setConfigForm({
          ultramsg_instance_id: cfg.ultramsg_instance_id || "",
          ultramsg_token: cfg.ultramsg_token || "",
          is_active: cfg.is_active || false,
          sender_name: cfg.sender_name || "",
        });
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

      // Fetch mentees for audience picker
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
    } catch (err) {
      console.error("Error loading WhatsApp data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!activeMembership) return;
    setIsSavingConfig(true);
    try {
      const tenantId = activeMembership.tenant_id;
      if (config?.id) {
        await supabase
          .from("tenant_whatsapp_config" as any)
          .update({
            ultramsg_instance_id: configForm.ultramsg_instance_id || null,
            ultramsg_token: configForm.ultramsg_token || null,
            is_active: configForm.is_active,
            sender_name: configForm.sender_name || null,
          } as any)
          .eq("id", config.id);
      } else {
        await supabase.from("tenant_whatsapp_config" as any).insert({
          tenant_id: tenantId,
          ultramsg_instance_id: configForm.ultramsg_instance_id || null,
          ultramsg_token: configForm.ultramsg_token || null,
          is_active: configForm.is_active,
          sender_name: configForm.sender_name || null,
        } as any);
      }
      toast({ title: "Configuração salva! ✓" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingConfig(false);
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

      // Create campaign record
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

      // Send via edge function
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
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">WhatsApp</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">
            Envie mensagens personalizadas para seus mentorados via WhatsApp.
          </p>
        </div>
        {isConfigured && (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsNewCampaignOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Send className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSent}</p>
                <p className="text-xs text-muted-foreground">Msgs Enviadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCampaigns}</p>
                <p className="text-xs text-muted-foreground">Campanhas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{menteesWithPhone.length}</p>
                <p className="text-xs text-muted-foreground">Com telefone</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Phone className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{menteesWithoutPhone.length}</p>
                <p className="text-xs text-muted-foreground">Sem telefone</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "logs") loadLogs(); }}>
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
        </TabsList>

        {/* ======= CAMPAIGNS TAB ======= */}
        <TabsContent value="campaigns" className="space-y-4">
          {!isConfigured && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Settings className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground">Configure o WhatsApp</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Para enviar mensagens, configure suas credenciais UltraMsg na aba de <strong>Configuração</strong>.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveTab("config")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Ir para Configuração
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {campaigns.length === 0 && isConfigured && (
            <div className="text-center py-16 text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-semibold">Nenhuma campanha ainda</h3>
              <p className="text-sm mt-1">Crie sua primeira campanha de WhatsApp para seus mentorados!</p>
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
                {logs.map((log) => (
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

        {/* ======= CONFIG TAB ======= */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-500" />
                Configuração UltraMsg
              </CardTitle>
              <CardDescription>
                Configure suas credenciais do UltraMsg para enviar mensagens via WhatsApp.
                Acesse <a href="https://ultramsg.com" target="_blank" rel="noopener" className="text-primary underline">ultramsg.com</a> para criar sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Instance ID</Label>
                  <Input
                    placeholder="Ex: instance12345"
                    value={configForm.ultramsg_instance_id}
                    onChange={(e) => setConfigForm((f) => ({ ...f, ultramsg_instance_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Token</Label>
                  <Input
                    type="password"
                    placeholder="Seu token UltraMsg"
                    value={configForm.ultramsg_token}
                    onChange={(e) => setConfigForm((f) => ({ ...f, ultramsg_token: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome do Remetente (opcional)</Label>
                <Input
                  placeholder="Ex: Mentoria Premium"
                  value={configForm.sender_name}
                  onChange={(e) => setConfigForm((f) => ({ ...f, sender_name: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={configForm.is_active}
                  onCheckedChange={(v) => setConfigForm((f) => ({ ...f, is_active: v }))}
                />
                <Label>Integração ativa</Label>
              </div>
              <Button onClick={handleSaveConfig} disabled={isSavingConfig}>
                {isSavingConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Salvar Configuração
              </Button>
            </CardContent>
          </Card>
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
