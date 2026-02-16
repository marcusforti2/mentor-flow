import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type PeriodKey = '7d' | '30d' | '90d' | 'custom';

export interface PeriodRange {
  key: PeriodKey;
  from: Date;
  to: Date;
}

const PRESET_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
];

function getPresetRange(key: PeriodKey): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (key) {
    case '7d': from.setDate(from.getDate() - 7); break;
    case '30d': from.setDate(from.getDate() - 30); break;
    case '90d': from.setDate(from.getDate() - 90); break;
    default: from.setDate(from.getDate() - 30);
  }
  return { from, to };
}

interface ReportPeriodFilterProps {
  value: PeriodRange;
  onChange: (range: PeriodRange) => void;
}

export function getDefaultPeriod(): PeriodRange {
  const r = getPresetRange('30d');
  return { key: '30d', ...r };
}

export function ReportPeriodFilter({ value, onChange }: ReportPeriodFilterProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to);

  const handlePreset = (key: PeriodKey) => {
    const r = getPresetRange(key);
    onChange({ key, ...r });
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({ key: 'custom', from: customFrom, to: customTo });
      setCustomOpen(false);
    }
  };

  const label = value.key === 'custom'
    ? `${format(value.from, 'dd/MM', { locale: ptBR })} – ${format(value.to, 'dd/MM', { locale: ptBR })}`
    : PRESET_OPTIONS.find(o => o.key === value.key)?.label || '30 dias';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESET_OPTIONS.map(opt => (
        <Button
          key={opt.key}
          size="sm"
          variant={value.key === opt.key ? "default" : "outline"}
          onClick={() => handlePreset(opt.key)}
          className="text-xs h-8"
        >
          {opt.label}
        </Button>
      ))}

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={value.key === 'custom' ? "default" : "outline"}
            className="text-xs h-8 gap-1"
          >
            <Calendar className="h-3 w-3" />
            {value.key === 'custom' ? label : 'Custom'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 space-y-3" align="end">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">De</p>
              <CalendarPicker
                mode="single"
                selected={customFrom}
                onSelect={setCustomFrom}
                locale={ptBR}
                disabled={(date) => date > new Date()}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Até</p>
              <CalendarPicker
                mode="single"
                selected={customTo}
                onSelect={setCustomTo}
                locale={ptBR}
                disabled={(date) => date > new Date()}
              />
            </div>
          </div>
          <Button size="sm" className="w-full" onClick={handleCustomApply} disabled={!customFrom || !customTo}>
            Aplicar
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
