import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { useScheduling, getDayLabel, type AvailabilitySlot } from '@/hooks/useScheduling';

interface DaySlot {
  enabled: boolean;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

const DEFAULT_SLOT: DaySlot = {
  enabled: false,
  start_time: '09:00',
  end_time: '18:00',
  slot_duration_minutes: 60,
};

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = (i % 2) * 30;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
});

export function AvailabilityEditor() {
  const { availability, isLoadingAvailability, saveAvailability } = useScheduling();
  const [days, setDays] = useState<Record<number, DaySlot>>({});

  useEffect(() => {
    const map: Record<number, DaySlot> = {};
    for (let i = 0; i < 7; i++) {
      map[i] = { ...DEFAULT_SLOT };
    }
    availability.forEach(slot => {
      map[slot.day_of_week] = {
        enabled: slot.is_active,
        start_time: slot.start_time.slice(0, 5),
        end_time: slot.end_time.slice(0, 5),
        slot_duration_minutes: slot.slot_duration_minutes,
      };
    });
    setDays(map);
  }, [availability]);

  const updateDay = (day: number, updates: Partial<DaySlot>) => {
    setDays(prev => ({ ...prev, [day]: { ...prev[day], ...updates } }));
  };

  const handleSave = () => {
    const slots = Object.entries(days)
      .filter(([, slot]) => slot.enabled)
      .map(([day, slot]) => ({
        day_of_week: parseInt(day),
        start_time: slot.start_time + ':00',
        end_time: slot.end_time + ':00',
        slot_duration_minutes: slot.slot_duration_minutes,
        is_active: true,
        mentor_membership_id: '',
        tenant_id: '',
      }));
    saveAvailability.mutate(slots);
  };

  if (isLoadingAvailability) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Minha Disponibilidade
        </CardTitle>
        <CardDescription>
          Configure os horários em que você está disponível para sessões
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 0].map(day => {
          const slot = days[day] || DEFAULT_SLOT;
          return (
            <div
              key={day}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                slot.enabled ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-card/30'
              }`}
            >
              <Switch
                checked={slot.enabled}
                onCheckedChange={v => updateDay(day, { enabled: v })}
              />
              <span className={`font-medium text-sm w-20 ${slot.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                {getDayLabel(day)}
              </span>

              {slot.enabled && (
                <div className="flex items-center gap-2 flex-1">
                  <Select value={slot.start_time} onValueChange={v => updateDay(day, { start_time: v })}>
                    <SelectTrigger className="h-8 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <span className="text-muted-foreground text-xs">até</span>

                  <Select value={slot.end_time} onValueChange={v => updateDay(day, { end_time: v })}>
                    <SelectTrigger className="h-8 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(slot.slot_duration_minutes)}
                    onValueChange={v => updateDay(day, { slot_duration_minutes: parseInt(v) })}
                  >
                    <SelectTrigger className="h-8 w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30min</SelectItem>
                      <SelectItem value="45">45min</SelectItem>
                      <SelectItem value="60">1h</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!slot.enabled && (
                <span className="text-xs text-muted-foreground">Indisponível</span>
              )}
            </div>
          );
        })}

        <Button
          onClick={handleSave}
          disabled={saveAvailability.isPending}
          className="w-full mt-4 gap-2"
        >
          {saveAvailability.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Disponibilidade
        </Button>
      </CardContent>
    </Card>
  );
}
