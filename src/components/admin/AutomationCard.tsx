import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail, UserCheck, Target, Award, Bell, Lightbulb, Zap, Play, Clock, Settings2,
  ChevronDown, ChevronUp, HeartHandshake, CalendarClock, BarChart3, PartyPopper,
  Info, Loader2, CheckCircle2, XCircle, Timer,
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
  automation: Automation;
  onToggle: (id: string, enabled: boolean) => void;
  onUpdateConfig: (id: string, config: Record<string, any>) => void;
  onRunNow: (key: string) => void;
  running: boolean;
}

export function AutomationCard({ automation, onToggle, onUpdateConfig, onRunNow, running }: Props) {
  const meta = getAutomationMeta(automation.automation_key);
  const Icon = iconMap[meta.icon] || Zap;
  const [showHow, setShowHow] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [localConfig, setLocalConfig] = useState(automation.config || {});

  const catMeta = CATEGORY_LABELS[meta.category] || CATEGORY_LABELS.engagement;

  const statusIcon = automation.last_run_status === 'success'
    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
    : automation.last_run_status === 'error'
    ? <XCircle className="h-3.5 w-3.5 text-destructive" />
    : <Clock className="h-3.5 w-3.5 text-muted-foreground" />;

  const statusLabel = automation.last_run_status === 'success'
    ? 'Última execução bem-sucedida'
    : automation.last_run_status === 'error'
    ? 'Erro na última execução'
    : 'Nunca executado';

  const handleSaveConfig = () => {
    onUpdateConfig(automation.id, localConfig);
    setShowConfig(false);
  };

  return (
    <Card className={cn(
      "glass-card border transition-all duration-300 flex flex-col",
      automation.is_enabled
        ? "border-primary/30 shadow-lg shadow-primary/5"
        : "border-border/50 opacity-75"
    )}>
      <CardHeader className="pb-2 space-y-3">
        {/* Top row: category + switch */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-[10px] font-medium", catMeta.color)}>
            {catMeta.label}
          </Badge>
          <Switch
            checked={automation.is_enabled}
            onCheckedChange={(checked) => onToggle(automation.id, checked)}
          />
        </div>

        {/* Icon + Title */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2.5 rounded-xl shrink-0 transition-colors",
            automation.is_enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{meta.label}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{meta.description}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0 flex-1 flex flex-col">
        {/* Frequency + Status row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
            <Timer className="h-3 w-3" />
            {meta.frequencyLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground" title={statusLabel}>
            {statusIcon}
            {automation.last_run_at
              ? formatDistanceToNow(new Date(automation.last_run_at), { addSuffix: true, locale: ptBR })
              : 'Nunca executado'}
          </span>
        </div>

        {/* How it works - expandable */}
        <button
          onClick={() => setShowHow(!showHow)}
          className="flex items-center gap-1.5 text-[11px] text-primary/80 hover:text-primary transition-colors font-medium w-fit"
        >
          <Info className="h-3 w-3" />
          Como funciona?
          {showHow ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showHow && (
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-[11px] text-muted-foreground leading-relaxed animate-in fade-in-0 slide-in-from-top-1 duration-200">
            {meta.howItWorks}
          </div>
        )}

        {/* Actions - pushed to bottom */}
        <div className="flex items-center gap-2 mt-auto pt-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 flex-1"
            onClick={() => onRunNow(automation.automation_key)}
            disabled={running}
          >
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {running ? 'Executando...' : 'Executar Agora'}
          </Button>
          {meta.hasSchedule && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5 shrink-0"
              onClick={() => setShowConfig(!showConfig)}
            >
              <Settings2 className="h-3 w-3" />
              {showConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>

        {/* Config panel */}
        {showConfig && (
          <div className="pt-2 border-t border-border/50 space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
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
                <p className="text-[10px] text-muted-foreground">Mentorados sem atividade por mais de X dias receberão email.</p>
              </div>
            )}

            {automation.automation_key === 'weekly_digest' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Dia da semana</Label>
                <Select
                  value={String(localConfig.day_of_week ?? 1)}
                  onValueChange={(v) => setLocalConfig({ ...localConfig, day_of_week: Number(v) })}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Segunda</SelectItem>
                    <SelectItem value="2">Terça</SelectItem>
                    <SelectItem value="3">Quarta</SelectItem>
                    <SelectItem value="4">Quinta</SelectItem>
                    <SelectItem value="5">Sexta</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Dia em que o digest será enviado.</p>
              </div>
            )}

            {['check_badges', 'check_alerts', 'send_prospection_tips', 'celebrate_achievements'].includes(automation.automation_key) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência de execução</Label>
                <Select
                  value={localConfig.frequency || 'daily'}
                  onValueChange={(v) => setLocalConfig({ ...localConfig, frequency: v })}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                <p className="text-[10px] text-muted-foreground">Antecedência do lembrete em horas.</p>
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
