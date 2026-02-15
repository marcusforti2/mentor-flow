import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CalendarIcon } from 'lucide-react';
import { AvailabilityEditor } from '@/components/scheduling/AvailabilityEditor';
import { BookingCalendar } from '@/components/scheduling/BookingCalendar';

export default function Agendamento() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Agendamento</h1>
        <p className="text-muted-foreground">Configure sua disponibilidade e gerencie sessões</p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Sessões
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-2">
            <Clock className="h-4 w-4" />
            Disponibilidade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <BookingCalendar />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
