import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail, UserCheck, Target, Award, Bell, Lightbulb, Zap, Play, Clock, Settings2, ChevronDown, ChevronUp,
  HeartHandshake, CalendarClock, BarChart3, PartyPopper,
} from 'lucide-react';
import { type Automation, getAutomationMeta } from '@/hooks/useAutomations';
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
  automation: Automation;
  onToggle: (id: string, enabled: boolean) => void;
  onUpdateConfig: (id: string, config: Record<string, any>) => void;
  onRunNow: (key: string) => void;
  running: boolean;
}

export function AutomationCard({ automation, onToggle, onUpdateConfig, onRunNow, running }: Props) {
  const meta = getAutomationMeta(automation.automation_key);
  const Icon = iconMap[meta.icon] || Zap;
  const [expanded, setExpanded] = useState(false);
  const [localConfig, setLocalConfig] = useState(automation.config || {});

  const statusColor = automation.last_run_status === 'success'
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : automation.last_run_status === 'error'
    ? 'bg-destructive/20 text-destructive border-destructive/30'
    : 'bg-muted text-muted-foreground border-border';

  const handleSaveConfig = () => {
    onUpdateConfig(automation.id, localConfig);
    setExpanded(false);
  };

  return (
    <Card className={cn(
      "glass-card border transition-all duration-300",
      automation.is_enabled ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border/50 opacity-80"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "p-2.5 rounded-xl shrink-0",
              automation.is_enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{meta.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{meta.description}</p>
            </div>
          </div>
          <Switch
            checked={automation.is_enabled}
            onCheckedChange={(checked) => onToggle(automation.id, checked)}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Status row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px]", statusColor)}>
            {automation.last_run_status || 'Nunca executado'}
          </Badge>
          {automation.last_run_at && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(automation.last_run_at), { addSuffix: true, locale: ptBR })}
            </span>
          )}
          {automation.schedule && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {automation.schedule}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => onRunNow(automation.automation_key)}
            disabled={running}
          >
            <Play className="h-3 w-3" />
            Executar Agora
          </Button>
          {meta.hasSchedule && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5"
              onClick={() => setExpanded(!expanded)}
            >
              <Settings2 className="h-3 w-3" />
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>

        {/* Config panel */}
        {expanded && (
          <div className="pt-2 border-t border-border/50 space-y-3">
            {automation.automation_key === 're_engage_inactive' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Dias de inatividade</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  className="h-8 text-sm"
                  value={localConfig.inactive_days || 5}
                  onChange={(e) => setLocalConfig({ ...localConfig, inactive_days: Number(e.target.value) })}
                />
              </div>
            )}

            {automation.automation_key === 'weekly_digest' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Dia da semana</Label>
                <Select
                  value={String(localConfig.day_of_week ?? 1)}
                  onValueChange={(v) => setLocalConfig({ ...localConfig, day_of_week: Number(v) })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Segunda</SelectItem>
                    <SelectItem value="2">Terça</SelectItem>
                    <SelectItem value="3">Quarta</SelectItem>
                    <SelectItem value="4">Quinta</SelectItem>
                    <SelectItem value="5">Sexta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {['check_badges', 'check_alerts', 'send_prospection_tips', 'celebrate_achievements'].includes(automation.automation_key) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência</Label>
                <Select
                  value={localConfig.frequency || 'daily'}
                  onValueChange={(v) => setLocalConfig({ ...localConfig, frequency: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="every_6h">A cada 6 horas</SelectItem>
                    <SelectItem value="3x_week">3x por semana</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {automation.automation_key === 'meeting_reminder' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Horas antes da reunião</Label>
                <Input
                  type="number"
                  min={1}
                  max={48}
                  className="h-8 text-sm"
                  value={localConfig.hours_before || 24}
                  onChange={(e) => setLocalConfig({ ...localConfig, hours_before: Number(e.target.value) })}
                />
              </div>
            )}

            <Button size="sm" className="h-8 text-xs w-full" onClick={handleSaveConfig}>
              Salvar Configuração
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
