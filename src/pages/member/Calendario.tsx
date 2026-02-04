import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, CalendarIcon, Clock, Video, 
  ChevronLeft, ChevronRight, Bell
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string;
  meeting_url: string | null;
}

const eventTypeColors: Record<string, string> = {
  geral: "bg-blue-500",
  mentoria: "bg-purple-500",
  live: "bg-red-500",
  prazo: "bg-yellow-500",
  reuniao: "bg-green-500",
};

const eventTypeLabels: Record<string, string> = {
  geral: "Geral",
  mentoria: "Mentoria",
  live: "Live",
  prazo: "Prazo",
  reuniao: "Reunião",
};

export default function CalendarioMembro() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEvents = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get mentorado's mentor
      const { data: mentoradoData } = await supabase
        .from('mentorados')
        .select('mentor_id')
        .eq('user_id', user.id)
        .single();
      
      if (mentoradoData) {
        // Fetch mentor's events
        const { data: eventsData, error } = await supabase
          .from('calendar_events')
          .select('id, title, description, event_date, event_time, event_type, meeting_url')
          .eq('mentor_id', mentoradoData.mentor_id)
          .gte('event_date', format(new Date(), 'yyyy-MM-dd'))
          .order('event_date', { ascending: true });
        
        if (error) throw error;
        setEvents(eventsData || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os eventos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.event_date), date)
    );
  };

  const upcomingEvents = events.slice(0, 8);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Calendário</h1>
        <p className="text-muted-foreground">Eventos e datas importantes da mentoria</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl font-display capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Hoje
            </Button>
          </CardHeader>
          <CardContent>
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {/* Days of the month */}
              {daysInMonth.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square p-1 rounded-lg cursor-pointer transition-all border border-transparent",
                      "hover:border-primary/50 hover:bg-white/5",
                      isToday(day) && "bg-primary/10 border-primary/30",
                      isSelected && "border-primary bg-primary/20",
                      !isSameMonth(day, currentMonth) && "opacity-30"
                    )}
                  >
                    <div className="text-sm font-medium text-center mb-1">
                      {format(day, 'd')}
                    </div>
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={cn("w-1.5 h-1.5 rounded-full", eventTypeColors[event.event_type])}
                          title={event.title}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Selected date events */}
            {selectedDate && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <h3 className="font-semibold mb-3">
                  Eventos em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento nesta data</p>
                ) : (
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate).map((event) => (
                      <div 
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm"
                      >
                        <div className={cn("w-2 h-8 rounded-full", eventTypeColors[event.event_type])} />
                        <div className="flex-1">
                          <p className="font-medium">{event.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {event.event_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {event.event_time.slice(0, 5)}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {eventTypeLabels[event.event_type]}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          )}
                        </div>
                        {event.meeting_url && (
                          <a 
                            href={event.meeting_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
                          >
                            <Video className="w-4 h-4" />
                            Entrar
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum evento agendado</p>
                <p className="text-sm mt-1">Fique atento às novidades!</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div 
                  key={event.id}
                  className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)] transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-sm font-bold",
                      eventTypeColors[event.event_type]
                    )}>
                      <span className="text-lg leading-none">{format(parseISO(event.event_date), "dd")}</span>
                      <span className="text-[10px] uppercase opacity-80">
                        {format(parseISO(event.event_date), "MMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(event.event_date), "EEEE", { locale: ptBR })}
                        {event.event_time && ` às ${event.event_time.slice(0, 5)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {eventTypeLabels[event.event_type]}
                        </Badge>
                        {event.meeting_url && (
                          <a 
                            href={event.meeting_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Video className="w-3 h-3" />
                            Entrar na reunião
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
