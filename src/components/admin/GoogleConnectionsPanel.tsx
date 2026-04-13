import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, HardDrive, Check, Loader2, Unplug, ExternalLink, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface TokenStatus {
  connected: boolean;
  email?: string;
  loading: boolean;
}

export function GoogleConnectionsPanel() {
  const { activeMembership } = useTenant();
  const [calendarStatus, setCalendarStatus] = useState<TokenStatus>({ connected: false, loading: true });
  const [driveStatus, setDriveStatus] = useState<TokenStatus>({ connected: false, loading: true });
  const [connecting, setConnecting] = useState<'calendar' | 'drive' | null>(null);

  useEffect(() => {
    if (!activeMembership) return;
    checkTokens();

    // Listen for window focus to re-check after OAuth redirect
    const onFocus = () => checkTokens();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [activeMembership]);

  const checkTokens = async () => {
    if (!activeMembership) return;

    const [calRes, driveRes] = await Promise.all([
      supabase
        .from("google_calendar_tokens" as any)
        .select("calendar_email")
        .eq("membership_id", activeMembership.id)
        .maybeSingle(),
      supabase
        .from("google_drive_tokens" as any)
        .select("drive_email")
        .eq("membership_id", activeMembership.id)
        .maybeSingle(),
    ]);

    setCalendarStatus({
      connected: !!calRes.data,
      email: (calRes.data as any)?.calendar_email || undefined,
      loading: false,
    });
    setDriveStatus({
      connected: !!driveRes.data,
      email: (driveRes.data as any)?.drive_email || undefined,
      loading: false,
    });
  };

  const connectGoogle = async (type: 'calendar' | 'drive') => {
    if (!activeMembership) return;
    setConnecting(type);

    try {
      const fnName = type === 'calendar' ? 'google-calendar-auth' : 'google-drive-auth';
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          membership_id: activeMembership.id,
          tenant_id: activeMembership.tenant_id,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank", "width=600,height=700");
      }
    } catch (err: any) {
      toast.error(`Erro ao conectar: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const disconnectGoogle = async (type: 'calendar' | 'drive') => {
    if (!activeMembership) return;

    try {
      const table = type === 'calendar' ? 'google_calendar_tokens' : 'google_drive_tokens';
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("membership_id", activeMembership.id);

      if (error) throw error;
      toast.success(`Google ${type === 'calendar' ? 'Calendar' : 'Drive'} desconectado`);
      checkTokens();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const services = [
    {
      key: 'calendar' as const,
      label: 'Google Calendar',
      description: 'Sincronize sua agenda do Google para exibir eventos e sessões automaticamente.',
      icon: Calendar,
      status: calendarStatus,
      color: 'text-blue-500',
    },
    {
      key: 'drive' as const,
      label: 'Google Drive',
      description: 'Conecte seu Google Drive para compartilhar e acessar arquivos com mentorados.',
      icon: HardDrive,
      status: driveStatus,
      color: 'text-green-500',
    },
  ];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          Conexões Google
        </CardTitle>
        <CardDescription>
          Conecte seus serviços Google para integrar agenda e arquivos à plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Alert className="cursor-pointer hover:bg-muted/50 transition-colors border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-sm font-medium flex items-center gap-2">
                <span>Como conectar o Google Drive</span>
                <Info className="h-3 w-3 text-muted-foreground" />
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                Clique para ver o passo a passo completo
              </AlertDescription>
            </Alert>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 p-4 rounded-lg border border-border bg-muted/30 space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">📋 Passo a passo para conectar:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Clique no botão <strong className="text-foreground">"Conectar"</strong> ao lado do Google Drive abaixo.</li>
                <li>Uma janela do Google será aberta para você fazer login com sua conta.</li>
                <li>
                  <strong className="text-amber-500">⚠️ ATENÇÃO:</strong> O Google vai exibir um aviso dizendo que{" "}
                  <strong className="text-foreground">"Este app não foi verificado"</strong> — isso é <strong className="text-foreground">normal e esperado</strong>.
                  Como nosso aplicativo ainda não passou pela verificação do Google, esse aviso aparece para todos.
                </li>
                <li>
                  Para prosseguir, clique em <strong className="text-foreground">"Avançado"</strong> (ou "Advanced") e depois em{" "}
                  <strong className="text-foreground">"Ir para [nome do app] (não seguro)"</strong>.
                </li>
                <li>Conceda as permissões solicitadas clicando em <strong className="text-foreground">"Permitir"</strong>.</li>
                <li>Pronto! A janela vai fechar automaticamente e o status mudará para <strong className="text-green-500">Conectado ✓</strong>.</li>
              </ol>
              <div className="mt-2 p-3 rounded-md bg-background/60 border border-border">
                <p className="text-xs">
                  <strong className="text-foreground">🔒 Sua segurança:</strong> Nós solicitamos apenas permissão para ler e gerenciar arquivos que o app criar. 
                  Seus arquivos pessoais não são acessados. A conexão pode ser desfeita a qualquer momento clicando em "Desconectar".
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {services.map(({ key, label, description, icon: Icon, status, color }) => (
          <div
            key={key}
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{label}</span>
                  {status.loading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : status.connected ? (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                      <Check className="h-3 w-3 mr-1" /> Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Desconectado</Badge>
                  )}
                </div>
                {status.email && (
                  <p className="text-xs text-muted-foreground">{status.email}</p>
                )}
                {!status.connected && !status.loading && (
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                )}
              </div>
            </div>
            <div>
              {status.connected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnectGoogle(key)}
                  className="text-destructive hover:text-destructive"
                >
                  <Unplug className="h-4 w-4 mr-1" />
                  Desconectar
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => connectGoogle(key)}
                  disabled={connecting === key || status.loading}
                >
                  {connecting === key ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  Conectar
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
