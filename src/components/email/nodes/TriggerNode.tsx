import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Users, AlertTriangle, Trophy, CalendarDays, Route } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TRIGGER_ICONS: Record<string, any> = {
  onboarding: Users,
  jornada: Route,
  inactivity: AlertTriangle,
  trail_completion: Trophy,
  date: CalendarDays,
  manual: Zap,
};

const TRIGGER_LABELS: Record<string, string> = {
  onboarding: 'Entrada no Programa',
  jornada: 'Jornada do Cliente',
  inactivity: 'Inatividade',
  trail_completion: 'Conclusão de Trilha',
  date: 'Data Específica',
  manual: 'Disparo Manual',
};

export default function TriggerNode({ data }: NodeProps) {
  const Icon = TRIGGER_ICONS[data.triggerType as string] || Zap;
  const label = TRIGGER_LABELS[data.triggerType as string] || 'Gatilho';
  
  // Get additional info based on trigger type
  const getSubLabel = () => {
    const config = data.config as any;
    if (!config) return null;
    
    switch (data.triggerType) {
      case 'date':
        if (config.specificDate) {
          return format(new Date(config.specificDate), "dd/MM/yyyy", { locale: ptBR });
        }
        return null;
      case 'jornada':
        if (config.periodValue) {
          return config.periodType === 'week' 
            ? `Semana ${config.periodValue}`
            : `Dia ${config.periodValue}`;
        }
        return null;
      case 'inactivity':
        if (config.days) {
          return `${config.days} dias`;
        }
        return null;
      default:
        return null;
    }
  };

  const subLabel = getSubLabel();

  return (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg min-w-[180px]">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs opacity-80">Gatilho</p>
          <p className="font-semibold text-sm truncate">{label}</p>
          {subLabel && (
            <p className="text-xs opacity-90 mt-0.5 truncate">{subLabel}</p>
          )}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-white !w-3 !h-3 !border-2 !border-emerald-600"
      />
    </div>
  );
}
