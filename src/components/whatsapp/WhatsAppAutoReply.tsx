import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bot, Loader2, Save, MessageCircle, Clock, Shield, Users, Zap,
  CheckCircle2, Settings, Copy, ExternalLink,
} from "lucide-react";

interface AutoReplyConfig {
  is_enabled: boolean;
  ai_persona: string;
  greeting_message: string;
  business_hours_start: number;
  business_hours_end: number;
  only_business_hours: boolean;
  qualify_leads: boolean;
  auto_route_to_mentor: boolean;
  custom_instructions: string;
}

interface Conversation {
  phone: string;
  name: string;
  lastMessage: string;
  lastAt: string;
  totalMessages: number;
  autoReplied: number;
  matched: boolean;
}

export function WhatsAppAutoReply() {
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConvos, setIsLoadingConvos] = useState(false);

  const [config, setConfig] = useState<AutoReplyConfig>({
    is_enabled: false,
    ai_persona: "Assistente virtual da mentoria",
    greeting_message: "Olá! 👋 Sou o assistente virtual. Como posso ajudar?",
    business_hours_start: 8,
    business_hours_end: 18,
    only_business_hours: false,
    qualify_leads: true,
    auto_route_to_mentor: true,
    custom_instructions: "",
  });

  useEffect(() => {
    if (activeMembership) {
      loadConfig();
      loadConversations();
    }
  }, [activeMembership]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-webhook", {
        body: {
          action: "get_config",
          tenant_id: activeMembership!.tenant_id,
        },
      });
      if (data?.config) {
        setConfig({
          is_enabled: data.config.is_enabled ?? false,
          ai_persona: data.config.ai_persona ?? "Assistente virtual da mentoria",
          greeting_message: data.config.greeting_message ?? "",
          business_hours_start: data.config.business_hours_start ?? 8,
          business_hours_end: data.config.business_hours_end ?? 18,
          only_business_hours: data.config.only_business_hours ?? false,
          qualify_leads: data.config.qualify_leads ?? true,
          auto_route_to_mentor: data.config.auto_route_to_mentor ?? true,
          custom_instructions: data.config.custom_instructions ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    setIsLoadingConvos(true);
    try {
      const { data } = await supabase.functions.invoke("whatsapp-webhook", {
        body: {
          action: "get_conversations",
          tenant_id: activeMembership!.tenant_id,
        },
      });
      setConversations(data?.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingConvos(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke("whatsapp-webhook", {
        body: {
          action: "save_config",
          tenant_id: activeMembership!.tenant_id,
          config,
        },
      });
      if (error) throw error;
      toast({ title: "Configuração salva! ✅" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Webhook URL Card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="space-y-2 flex-1">
              <div>
                <p className="text-sm font-semibold">URL do Webhook</p>
                <p className="text-xs text-muted-foreground">
                  Configure esta URL no painel do UltraMsg como webhook de mensagens recebidas.
                </p>
              </div>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="text-xs font-mono bg-muted/50" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast({ title: "URL copiada! 📋" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Pré-atendimento Automático
            </CardTitle>
            <CardDescription className="text-xs">
              A IA responde mensagens recebidas em tempo real, qualifica leads e direciona para o mentor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <div>
                  <Label className="text-sm">Ativar pré-atendimento</Label>
                  <p className="text-[10px] text-muted-foreground">IA responde mensagens automaticamente</p>
                </div>
              </div>
              <Switch
                checked={config.is_enabled}
                onCheckedChange={(v) => setConfig(prev => ({ ...prev, is_enabled: v }))}
              />
            </div>

            {/* Persona */}
            <div className="space-y-2">
              <Label className="text-xs">Persona da IA</Label>
              <Input
                value={config.ai_persona}
                onChange={(e) => setConfig(prev => ({ ...prev, ai_persona: e.target.value }))}
                placeholder="Ex: Assistente virtual do Programa de Vendas"
              />
            </div>

            {/* Greeting */}
            <div className="space-y-2">
              <Label className="text-xs">Mensagem de boas-vindas</Label>
              <Textarea
                rows={2}
                value={config.greeting_message}
                onChange={(e) => setConfig(prev => ({ ...prev, greeting_message: e.target.value }))}
              />
            </div>

            {/* Business hours */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs">Apenas horário comercial</Label>
                </div>
                <Switch
                  checked={config.only_business_hours}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, only_business_hours: v }))}
                />
              </div>
              {config.only_business_hours && (
                <div className="flex gap-2 items-center">
                  <Select
                    value={String(config.business_hours_start)}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, business_hours_start: parseInt(v) }))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">até</span>
                  <Select
                    value={String(config.business_hours_end)}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, business_hours_end: parseInt(v) }))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs">Qualificar leads automaticamente</Label>
                </div>
                <Switch
                  checked={config.qualify_leads}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, qualify_leads: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs">Encaminhar para mentor quando necessário</Label>
                </div>
                <Switch
                  checked={config.auto_route_to_mentor}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, auto_route_to_mentor: v }))}
                />
              </div>
            </div>

            {/* Custom instructions */}
            <div className="space-y-2">
              <Label className="text-xs">Instruções personalizadas para a IA</Label>
              <Textarea
                rows={3}
                value={config.custom_instructions}
                onChange={(e) => setConfig(prev => ({ ...prev, custom_instructions: e.target.value }))}
                placeholder="Ex: Sempre ofereça agendar uma call com o mentor. Mencione o programa de vendas VIP..."
              />
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Configuração
            </Button>
          </CardContent>
        </Card>

        {/* Conversations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-500" />
                Conversas Recebidas
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={loadConversations} disabled={isLoadingConvos}>
                {isLoadingConvos ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingConvos ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma conversa recebida ainda.</p>
                <p className="text-xs mt-1">Configure o webhook no UltraMsg para começar.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {conversations.map((convo) => (
                    <Card key={convo.phone} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{convo.name}</span>
                            {convo.matched && (
                              <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                Mentorado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{convo.lastMessage}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span>{convo.totalMessages} msgs</span>
                            {convo.autoReplied > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Bot className="h-3 w-3 text-primary" />
                                {convo.autoReplied} auto
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(convo.lastAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
