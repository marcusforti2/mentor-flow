import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SmartAlert } from "@/hooks/useSmartAlerts";
import {
  UserX,
  Thermometer,
  Clock,
  Flame,
  BookOpen,
  AlertTriangle,
  CheckCheck,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SmartAlertsReturn {
  alerts: SmartAlert[];
  isLoading: boolean;
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  dismissAlert: (id: string) => void;
}

interface AlertsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  smartAlerts: SmartAlertsReturn;
}

const ALERT_ICONS: Record<string, typeof UserX> = {
  inactive: UserX,
  lead_cooling: Thermometer,
  task_overdue: Clock,
  streak_broken: Flame,
  trail_stalled: BookOpen,
  sos_pending: AlertTriangle,
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/20 text-accent",
  high: "bg-primary/20 text-primary",
  urgent: "bg-destructive/20 text-destructive",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

function AlertItem({
  alert,
  onMarkRead,
  onDismiss,
}: {
  alert: SmartAlert;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = ALERT_ICONS[alert.alert_type] || AlertTriangle;

  return (
    <div
      className={`p-4 rounded-xl border transition-colors ${
        alert.is_read ? "bg-card/30 border-border/50" : "bg-card/80 border-primary/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium truncate ${alert.is_read ? "text-muted-foreground" : "text-foreground"}`}>
              {alert.title}
            </p>
            {!alert.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
          {alert.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {SEVERITY_LABELS[alert.severity] || alert.severity}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!alert.is_read && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMarkRead(alert.id)}>
              <CheckCheck className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onDismiss(alert.id)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AlertsPanel({ open, onOpenChange, smartAlerts }: AlertsPanelProps) {
  const { alerts, isLoading, unreadCount, markAsRead, markAllRead, dismissAlert } = smartAlerts;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md border-border/50 bg-background/95 backdrop-blur-xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-display">
              Alertas
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{unreadCount}</Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => markAllRead()}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Marcar todos
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum alerta no momento</p>
              <p className="text-xs mt-1">Tudo tranquilo por aqui! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onMarkRead={markAsRead}
                  onDismiss={dismissAlert}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
