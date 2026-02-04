import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Users, AlertTriangle, Trophy, Calendar } from 'lucide-react';

const TRIGGER_ICONS: Record<string, any> = {
  onboarding: Users,
  inactivity: AlertTriangle,
  trail_completion: Trophy,
  date: Calendar,
  manual: Zap,
};

const TRIGGER_LABELS: Record<string, string> = {
  onboarding: 'Entrada no Programa',
  inactivity: 'Inatividade',
  trail_completion: 'Conclusão de Trilha',
  date: 'Data Específica',
  manual: 'Disparo Manual',
};

export default function TriggerNode({ data }: NodeProps) {
  const Icon = TRIGGER_ICONS[data.triggerType as string] || Zap;
  const label = TRIGGER_LABELS[data.triggerType as string] || 'Gatilho';

  return (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg min-w-[180px]">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs opacity-80">Gatilho</p>
          <p className="font-semibold text-sm">{label}</p>
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
