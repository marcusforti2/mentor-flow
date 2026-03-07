import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail, UserCheck, Target, Award, Bell, Lightbulb, Zap, Play, Loader2,
  HeartHandshake, CalendarClock, BarChart3, PartyPopper, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { type Automation, getAutomationMeta, CATEGORY_LABELS } from '@/hooks/useAutomations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  mail: Mail, 'user-check': UserCheck, target: Target,
  award: Award, bell: Bell, lightbulb: Lightbulb, zap: Zap,
  'hand-heart': HeartHandshake, 'calendar-clock': CalendarClock,
  'bar-chart-3': BarChart3, 'party-popper': PartyPopper,
};

interface Props {
  automations: Automation[];
  onToggle: (id: string, enabled: boolean) => void;
  onRunNow: (key: string) => void;
  runningKey: string | null;
}

export function JarvisSidebar({ automations, onToggle, onRunNow, runningKey }: Props) {
  const activeCount = automations.filter(a => a.is_enabled).length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Automações
          </h3>
          <Badge variant="outline" className="text-[10px]">
            {activeCount}/{automations.length} ativas
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Gerencie aqui ou peça ao Jarvis
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {automations.map(automation => {
            const meta = getAutomationMeta(automation.automation_key);
            const Icon = iconMap[meta.icon] || Zap;
            const catMeta = CATEGORY_LABELS[meta.category] || CATEGORY_LABELS.engagement;
            const isRunning = runningKey === automation.automation_key;

            return (
              <div
                key={automation.id}
                className={cn(
                  "rounded-xl border p-3 transition-all",
                  automation.is_enabled
                    ? "border-primary/20 bg-primary/5"
                    : "border-border/30 bg-muted/20 opacity-70"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    automation.is_enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-medium text-foreground truncate">{meta.label}</h4>
                      <Switch
                        checked={automation.is_enabled}
                        onCheckedChange={(checked) => onToggle(automation.id, checked)}
                        className="scale-75"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-muted-foreground">{meta.frequencyLabel}</span>
                      {automation.last_run_at && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          {automation.last_run_status === 'success'
                            ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                            : automation.last_run_status === 'error'
                            ? <XCircle className="h-2.5 w-2.5 text-destructive" />
                            : <Clock className="h-2.5 w-2.5" />
                          }
                          {formatDistanceToNow(new Date(automation.last_run_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2 gap-1"
                    onClick={() => onRunNow(automation.automation_key)}
                    disabled={isRunning}
                  >
                    {isRunning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Play className="h-2.5 w-2.5" />}
                    {isRunning ? 'Executando...' : 'Executar'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
