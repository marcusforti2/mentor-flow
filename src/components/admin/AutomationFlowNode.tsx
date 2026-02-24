import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Mail, UserCheck, Target, Award, Bell, Lightbulb, Zap, HeartHandshake,
  CalendarClock, BarChart3, PartyPopper, CheckCircle2, XCircle, Clock,
  Play, Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const iconMap: Record<string, React.ElementType> = {
  mail: Mail, 'user-check': UserCheck, target: Target,
  award: Award, bell: Bell, lightbulb: Lightbulb, zap: Zap,
  'hand-heart': HeartHandshake, 'calendar-clock': CalendarClock,
  'bar-chart-3': BarChart3, 'party-popper': PartyPopper,
  play: Play,
};

export interface AutomationNodeData {
  label: string;
  icon: string;
  category: 'engagement' | 'intelligence' | 'communication' | 'growth' | 'trigger';
  isEnabled: boolean;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  frequencyLabel: string;
  automationKey: string;
  automationId: string;
  isTrigger?: boolean;
  [key: string]: unknown;
}

const categoryStyles: Record<string, { bg: string; border: string; iconBg: string; accent: string }> = {
  trigger: {
    bg: 'bg-muted/60',
    border: 'border-muted-foreground/30',
    iconBg: 'bg-muted-foreground/20 text-muted-foreground',
    accent: 'text-muted-foreground',
  },
  engagement: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20 text-blue-400',
    accent: 'text-blue-400',
  },
  intelligence: {
    bg: 'bg-purple-500/5',
    border: 'border-purple-500/30',
    iconBg: 'bg-purple-500/20 text-purple-400',
    accent: 'text-purple-400',
  },
  communication: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/30',
    iconBg: 'bg-amber-500/20 text-amber-400',
    accent: 'text-amber-400',
  },
  growth: {
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    accent: 'text-emerald-400',
  },
};

function AutomationFlowNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as AutomationNodeData;
  const Icon = iconMap[nodeData.icon] || Zap;
  const style = categoryStyles[nodeData.category] || categoryStyles.engagement;
  const isTrigger = nodeData.isTrigger;

  const statusIcon = nodeData.lastRunStatus === 'success'
    ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
    : nodeData.lastRunStatus === 'error'
    ? <XCircle className="h-3 w-3 text-destructive" />
    : <Clock className="h-3 w-3 text-muted-foreground" />;

  return (
    <div className={cn(
      "rounded-xl border-2 px-4 py-3 min-w-[200px] max-w-[220px] shadow-lg backdrop-blur-sm transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-[1.02]",
      style.bg, style.border,
      !nodeData.isEnabled && !isTrigger && "opacity-50 grayscale-[30%]"
    )}>
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
      />

      {/* Icon + label */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className={cn("p-2 rounded-lg shrink-0", style.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground leading-tight truncate">
            {nodeData.label}
          </p>
        </div>
      </div>

      {/* Status row */}
      {!isTrigger && (
        <div className="flex items-center gap-2 mt-1">
          {/* Active / inactive badge */}
          <span className={cn(
            "text-[9px] font-medium rounded-full px-2 py-0.5 border",
            nodeData.isEnabled
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-muted text-muted-foreground border-border/50"
          )}>
            {nodeData.isEnabled ? 'Ativo' : 'Inativo'}
          </span>

          {/* Frequency */}
          <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
            <Timer className="h-2.5 w-2.5" />
            {nodeData.frequencyLabel}
          </span>

          {/* Last run */}
          <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground ml-auto" title={nodeData.lastRunAt || 'Nunca'}>
            {statusIcon}
          </span>
        </div>
      )}

      {isTrigger && (
        <p className="text-[9px] text-muted-foreground mt-0.5">Gatilho</p>
      )}

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
      />
    </div>
  );
}

export const AutomationFlowNode = memo(AutomationFlowNodeComponent);
