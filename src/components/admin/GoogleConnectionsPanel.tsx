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
