import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Clock, Video, ChevronLeft, ChevronRight, Loader2, Check, X } from 'lucide-react';
import { useScheduling, getDayLabel, type AvailabilitySlot, type SessionBooking } from '@/hooks/useScheduling';
import { format, addDays, startOfWeek, isSameDay, isBefore, setHours, setMinutes, parseISO, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
  booking?: SessionBooking;
}

export function BookingCalendar() {
  const {
    availability, bookings, isLoadingAvailability, isLoadingBookings,
    createBooking, cancelBooking, completeBooking, role, membershipId,
  } = useScheduling();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string; mentorId: string; duration: number } | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const isMentor = role !== 'mentee';
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Generate slots for each day
  const slotsForDay = (date: Date): TimeSlot[] => {
    const dow = date.getDay();
    const dayAvail = availability.filter(a => a.day_of_week === dow);
    if (!dayAvail.length) return [];

    const slots: TimeSlot[] = [];
    for (const avail of dayAvail) {
      const [sh, sm] = avail.start_time.split(':').map(Number);
      const [eh, em] = avail.end_time.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      const duration = avail.slot_duration_minutes;

      for (let m = startMins; m + duration <= endMins; m += duration) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const timeStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        const slotDateTime = setMinutes(setHours(date, h), min);
        const isPast = isBefore(slotDateTime, new Date());

        // Check if slot is booked
        const booking = bookings.find(b => {
          if (b.status === 'cancelled') return false;
          const bDate = parseISO(b.scheduled_at);
          return isSameDay(bDate, date) && format(bDate, 'HH:mm') === timeStr;
        });

        slots.push({
          time: timeStr,
          available: !isPast && !booking,
          booking: booking || undefined,
        });
      }
    }
    return slots;
  };

  const handleBookSlot = (date: Date, time: string, avail: AvailabilitySlot) => {
    setSelectedSlot({
      date,
      time,
      mentorId: avail.mentor_membership_id,
      duration: avail.slot_duration_minutes,
    });
    setBookingNotes('');
    setShowBookingDialog(true);
  };

  const confirmBooking = () => {
    if (!selectedSlot) return;
    const [h, m] = selectedSlot.time.split(':').map(Number);
    const scheduledAt = setMinutes(setHours(selectedSlot.date, h), m);

    createBooking.mutate({
      mentor_membership_id: selectedSlot.mentorId,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: selectedSlot.duration,
      notes: bookingNotes || undefined,
    });
    setShowBookingDialog(false);
  };

  const confirmCancel = () => {
    if (!cancelId) return;
    cancelBooking.mutate({ bookingId: cancelId, reason: cancelReason });
    setCancelId(null);
    setCancelReason('');
  };

  const isLoading = isLoadingAvailability || isLoadingBookings;

  // Upcoming bookings
  const upcomingBookings = bookings
    .filter(b => b.status === 'confirmed' && new Date(b.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Weekly Calendar Grid */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {isMentor ? 'Sessões Agendadas' : 'Agendar Sessão'}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2 min-w-[180px] text-center">
                {format(currentWeekStart, "dd MMM", { locale: ptBR })} - {format(addDays(currentWeekStart, 6), "dd MMM yyyy", { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const slots = slotsForDay(day);
                const isToday = isSameDay(day, new Date());
                const dow = day.getDay();
                const dayAvail = availability.filter(a => a.day_of_week === dow);

                return (
                  <div key={day.toISOString()} className="space-y-1">
                    <div className={cn(
                      "text-center py-2 rounded-lg",
                      isToday ? "bg-primary/10" : "bg-muted/30"
                    )}>
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                        {format(day, "EEE", { locale: ptBR })}
                      </div>
                      <div className={cn("text-lg font-semibold", isToday && "text-primary")}>
                        {format(day, "d")}
                      </div>
                    </div>

                    <ScrollArea className="h-[300px]">
                      <div className="space-y-1 pr-1">
                        {slots.length === 0 && (
                          <div className="text-[10px] text-center text-muted-foreground py-4">—</div>
                        )}
                        {slots.map(slot => (
                          <div key={slot.time}>
                            {slot.booking ? (
                              <div className={cn(
                                "text-[11px] p-1.5 rounded-lg border",
                                slot.booking.status === 'confirmed'
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "bg-muted/30 border-border/30 text-muted-foreground"
                              )}>
                                <div className="font-medium">{slot.time}</div>
                                <div className="text-[10px] mt-0.5">
                                  {slot.booking.status === 'confirmed' ? '✓ Agendado' : slot.booking.status}
                                </div>
                                {isMentor && slot.booking.status === 'confirmed' && (
                                  <div className="flex gap-0.5 mt-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => completeBooking.mutate(slot.booking!.id)}
                                    >
                                      <Check className="h-3 w-3 text-emerald-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => setCancelId(slot.booking!.id)}
                                    >
                                      <X className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                )}
                                {!isMentor && slot.booking.status === 'confirmed' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 text-[10px] mt-1 text-destructive px-1"
                                    onClick={() => setCancelId(slot.booking!.id)}
                                  >
                                    Cancelar
                                  </Button>
                                )}
                              </div>
                            ) : slot.available && !isMentor ? (
                              <button
                                onClick={() => dayAvail[0] && handleBookSlot(day, slot.time, dayAvail[0])}
                                className="w-full text-[11px] p-1.5 rounded-lg border border-border/30 bg-card/30 hover:bg-primary/10 hover:border-primary/30 transition-colors text-left"
                              >
                                <span className="font-medium text-foreground">{slot.time}</span>
                                <span className="block text-[10px] text-muted-foreground">Disponível</span>
                              </button>
                            ) : (
                              <div className="text-[11px] p-1.5 rounded-lg border border-border/20 bg-muted/10 text-muted-foreground">
                                <span className="font-medium">{slot.time}</span>
                                {slot.available && <span className="block text-[10px]">Livre</span>}
                                {!slot.available && !slot.booking && <span className="block text-[10px]">Passado</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Próximas Sessões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingBookings.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/30">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary leading-none">{format(parseISO(b.scheduled_at), 'd')}</span>
                  <span className="text-[10px] text-primary/70 uppercase">{format(parseISO(b.scheduled_at), 'MMM', { locale: ptBR })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {format(parseISO(b.scheduled_at), "EEEE", { locale: ptBR })} às {format(parseISO(b.scheduled_at), 'HH:mm')}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.duration_minutes}min • {b.notes || 'Sem observações'}</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary shrink-0">
                  Confirmado
                </Badge>
                {b.meeting_url && (
                  <a href={b.meeting_url} target="_blank" rel="noopener noreferrer">
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Video className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Booking Confirmation Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Confirmar Agendamento</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{format(selectedSlot.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{selectedSlot.time} • {selectedSlot.duration}min</span>
                </div>
              </div>
              <Textarea
                placeholder="Observações (opcional) — ex: tópicos que gostaria de discutir"
                value={bookingNotes}
                onChange={e => setBookingNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>Cancelar</Button>
            <Button onClick={confirmBooking} disabled={createBooking.isPending} className="gap-2">
              {createBooking.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelId} onOpenChange={open => !open && setCancelId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Cancelar Sessão</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Motivo do cancelamento (opcional)"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            rows={2}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Voltar</Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancelBooking.isPending} className="gap-2">
              {cancelBooking.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
