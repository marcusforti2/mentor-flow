import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Mail, UserCheck, Target, Award, Bell, Lightbulb, Zap, Play,
  HeartHandshake, CalendarClock, BarChart3, PartyPopper,
  Loader2, CheckCircle2, XCircle, Clock, Timer, Info,
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
  automation: Automation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onUpdateConfig: (id: string, config: Record<string, any>) => void;
  onRunNow: (key: string) => void;
  running: boolean;
}

export function AutomationDetailSheet({ automation, open, onOpenChange, onToggle, onUpdateConfig, onRunNow, running }: Props) {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});

  if (!automation) return null;

  const meta = getAutomationMeta(automation.automation_key);
  const Icon = iconMap[meta.icon] || Zap;
  const catMeta = CATEGORY_LABELS[meta.category] || CATEGORY_LABELS.engagement;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalConfig(automation.config || {});
    }
    onOpenChange(isOpen);
  };

  const handleSaveConfig = () => {
    onUpdateConfig(automation.id, localConfig);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl",
              automation.is_enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg">{meta.label}</SheetTitle>
              <Badge variant="outline" className={cn("text-[10px] mt-1", catMeta.color)}>
                {catMeta.label}
              </Badge>
            </div>
          </div>
          <SheetDescription className="text-sm leading-relaxed">{meta.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">Status</p>
              <p className="text-xs text-muted-foreground">{automation.is_enabled ? 'Ativa e rodando' : 'Pausada'}</p>
            </div>
            <Switch
              checked={automation.is_enabled}
              onCheckedChange={(checked) => onToggle(automation.id, checked)}
            />
          </div>

          {/* Info badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] rounded-full px-2.5 py-1 font-medium border",
              meta.audience === 'mentor'
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : meta.audience === 'mentorado'
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}>
              {meta.audienceLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2.5 py-1 border border-border/30">
              <Timer className="h-3 w-3" />
              {meta.frequencyLabel}
            </span>
          </div>

          {/* Last execution */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
            <p className="text-xs font-medium text-foreground">Última execução</p>
            <div className="flex items-center gap-2">
              {automation.last_run_status === 'success'
                ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                : automation.last_run_status === 'error'
                ? <XCircle className="h-4 w-4 text-destructive" />
                : <Clock className="h-4 w-4 text-muted-foreground" />
              }
              <span className="text-sm text-muted-foreground">
                {automation.last_run_at
                  ? formatDistanceToNow(new Date(automation.last_run_at), { addSuffix: true, locale: ptBR })
                  : 'Nunca executado'}
              </span>
            </div>
          </div>

          {/* How it works */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Info className="h-3.5 w-3.5" />
              Como funciona?
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{meta.howItWorks}</p>
          </div>

          <Separator />

          {/* Run now */}
          <Button
            className="w-full gap-2"
            onClick={() => onRunNow(automation.automation_key)}
            disabled={running}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? 'Executando...' : 'Executar Agora'}
          </Button>

          {/* Config section */}
          {meta.hasSchedule && (
            <>
              <Separator />
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Configurações</p>

                {automation.automation_key === 're_engage_inactive' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dias de inatividade</Label>
                    <Input
                      type="number" min={1} max={30} className="h-9"
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
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                      type="number" min={1} max={48} className="h-9"
                      value={localConfig.hours_before || 24}
                      onChange={(e) => setLocalConfig({ ...localConfig, hours_before: Number(e.target.value) })}
                    />
                  </div>
                )}

                <Button size="sm" className="w-full" onClick={handleSaveConfig}>
                  Salvar Configuração
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
