import { BookingCalendar } from '@/components/scheduling/BookingCalendar';

export default function AgendamentoMembro() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Agendar Sessão</h1>
        <p className="text-muted-foreground">Escolha um horário disponível para sua sessão de mentoria</p>
      </div>
      <BookingCalendar />
    </div>
  );
}
