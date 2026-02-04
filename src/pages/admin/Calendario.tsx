import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Plus, CalendarIcon, Clock, Video, Trash2, 
  ChevronLeft, ChevronRight, Users, Bell, Repeat, Edit2
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  isSameDay, addMonths, subMonths, isToday, parseISO, startOfWeek, 
  endOfWeek, addWeeks, subWeeks, addHours, setHours, setMinutes
} from "date-fns";
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
  is_recurring: boolean;
  created_at: string;
}

type ViewMode = "month" | "week";

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

const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

export default function Calendario() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  // Form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: new Date(),
    event_time: "09:00",
    event_type: "geral",
    meeting_url: "",
    is_recurring: false,
    recurrence_type: "weekly",
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (mentorData) {
        setMentorId(mentorData.id);
        
        const { data: eventsData, error } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('mentor_id', mentorData.id)
          .order('event_date', { ascending: true });
        
        if (error) throw error;
        setEvents(eventsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
    fetchData();
  }, [user]);

  const resetForm = () => {
    setNewEvent({
      title: "",
      description: "",
      event_date: new Date(),
      event_time: "09:00",
      event_type: "geral",
      meeting_url: "",
      is_recurring: false,
      recurrence_type: "weekly",
    });
    setEditingEvent(null);
  };

  const handleCreateEvent = async () => {
    if (!mentorId || !newEvent.title.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o título do evento.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: newEvent.title,
            description: newEvent.description || null,
            event_date: format(newEvent.event_date, 'yyyy-MM-dd'),
            event_time: newEvent.event_time || null,
            event_type: newEvent.event_type,
            meeting_url: newEvent.meeting_url || null,
            is_recurring: newEvent.is_recurring,
          })
          .eq('id', editingEvent.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso!",
          description: "Evento atualizado com sucesso.",
        });
      } else {
        // Create new event(s)
        const eventsToCreate = [];
        
        if (newEvent.is_recurring) {
          // Create recurring events for the next 12 weeks/months
          const iterations = newEvent.recurrence_type === "weekly" ? 12 : 6;
          for (let i = 0; i < iterations; i++) {
            const eventDate = newEvent.recurrence_type === "weekly"
              ? addWeeks(newEvent.event_date, i)
              : addMonths(newEvent.event_date, i);
            
            eventsToCreate.push({
              mentor_id: mentorId,
              title: newEvent.title,
              description: newEvent.description || null,
              event_date: format(eventDate, 'yyyy-MM-dd'),
              event_time: newEvent.event_time || null,
              event_type: newEvent.event_type,
              meeting_url: newEvent.meeting_url || null,
              is_recurring: true,
            });
          }
        } else {
          eventsToCreate.push({
            mentor_id: mentorId,
            title: newEvent.title,
            description: newEvent.description || null,
            event_date: format(newEvent.event_date, 'yyyy-MM-dd'),
            event_time: newEvent.event_time || null,
            event_type: newEvent.event_type,
            meeting_url: newEvent.meeting_url || null,
            is_recurring: false,
          });
        }
        
        const { error } = await supabase
          .from('calendar_events')
          .insert(eventsToCreate);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso!",
          description: newEvent.is_recurring 
            ? `Criados ${eventsToCreate.length} eventos recorrentes.`
            : "Evento criado com sucesso.",
        });
      }
      
      resetForm();
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o evento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      
      toast({
        title: "Excluído",
        description: "Evento removido com sucesso.",
      });
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o evento.",
        variant: "destructive",
      });
    }
  };

  const openEventDialog = (event?: CalendarEvent, date?: Date) => {
    if (event) {
      setEditingEvent(event);
      setNewEvent({
        title: event.title,
        description: event.description || "",
        event_date: parseISO(event.event_date),
        event_time: event.event_time?.slice(0, 5) || "09:00",
        event_type: event.event_type,
        meeting_url: event.meeting_url || "",
        is_recurring: event.is_recurring,
        recurrence_type: "weekly",
      });
    } else {
      resetForm();
      if (date) {
        setNewEvent(prev => ({ ...prev, event_date: date }));
      }
    }
    setIsDialogOpen(true);
  };

  // Week view helpers
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month view helpers  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.event_date), date)
    );
  };

  const getEventsForHour = (date: Date, hour: number) => {
    return events.filter(event => {
      if (!isSameDay(parseISO(event.event_date), date)) return false;
      if (!event.event_time) return hour === 9; // Default to 9am if no time
      const eventHour = parseInt(event.event_time.split(':')[0], 10);
      return eventHour === hour;
    });
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === "week") {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  const upcomingEvents = events
    .filter(e => parseISO(e.event_date) >= new Date())
    .slice(0, 8);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Calendário</h1>
          <p className="text-muted-foreground">Gerencie eventos e datas importantes</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg bg-secondary/50 p-1">
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="h-8"
            >
              Semana
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="h-8"
            >
              Mês
            </Button>
          </div>

          <Button onClick={() => openEventDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Evento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar View */}
        <Card className="xl:col-span-3 glass-card overflow-hidden">
          {/* Calendar Header */}
          <CardHeader className="flex-row items-center justify-between pb-4 border-b border-border/50">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('prev')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl font-display">
                {viewMode === "week" 
                  ? `${format(weekStart, "dd MMM", { locale: ptBR })} - ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`
                  : format(currentDate, "MMMM yyyy", { locale: ptBR })
                }
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => navigate('next')}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {viewMode === "week" ? (
              /* Week View */
              <div className="flex flex-col">
                {/* Days header */}
                <div className="grid grid-cols-8 border-b border-border/50">
                  <div className="p-3 text-center text-sm text-muted-foreground border-r border-border/30">
                    Hora
                  </div>
                  {daysInWeek.map((day) => (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "p-3 text-center border-r border-border/30 last:border-r-0",
                        isToday(day) && "bg-primary/10"
                      )}
                    >
                      <div className="text-xs text-muted-foreground uppercase">
                        {format(day, "EEE", { locale: ptBR })}
                      </div>
                      <div className={cn(
                        "text-lg font-semibold mt-1",
                        isToday(day) && "text-primary"
                      )}>
                        {format(day, "d")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hours grid */}
                <div className="max-h-[500px] overflow-y-auto">
                  {hoursOfDay.filter(h => h >= 7 && h <= 22).map((hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b border-border/30 min-h-[60px]">
                      <div className="p-2 text-xs text-muted-foreground text-right pr-3 border-r border-border/30">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      {daysInWeek.map((day) => {
                        const hourEvents = getEventsForHour(day, hour);
                        return (
                          <div 
                            key={`${day.toISOString()}-${hour}`}
                            onClick={() => {
                              const selectedDateTime = setMinutes(setHours(day, hour), 0);
                              setNewEvent(prev => ({ 
                                ...prev, 
                                event_date: selectedDateTime,
                                event_time: `${hour.toString().padStart(2, '0')}:00`
                              }));
                              openEventDialog(undefined, day);
                            }}
                            className={cn(
                              "p-1 border-r border-border/30 last:border-r-0 cursor-pointer hover:bg-white/5 transition-colors relative",
                              isToday(day) && "bg-primary/5"
                            )}
                          >
                            {hourEvents.map((event) => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEventDialog(event);
                                }}
                                className={cn(
                                  "text-xs p-1.5 rounded mb-1 cursor-pointer truncate",
                                  "hover:ring-2 hover:ring-primary/50 transition-all",
                                  eventTypeColors[event.event_type],
                                  "text-white"
                                )}
                              >
                                <div className="font-medium truncate">{event.title}</div>
                                {event.event_time && (
                                  <div className="opacity-80">{event.event_time.slice(0, 5)}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Month View */
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  
                  {daysInMonth.map((day) => {
                    const dayEvents = getEventsForDate(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => {
                          setSelectedDate(day);
                          if (dayEvents.length === 0) {
                            openEventDialog(undefined, day);
                          }
                        }}
                        className={cn(
                          "aspect-square p-2 rounded-xl cursor-pointer transition-all border-2 border-transparent",
                          "hover:border-primary/50 hover:bg-white/5",
                          isToday(day) && "bg-primary/10 border-primary/30",
                          isSelected && "border-primary bg-primary/20",
                          dayEvents.length > 0 && "ring-2 ring-primary/30"
                        )}
                      >
                        <div className={cn(
                          "text-sm font-medium text-center",
                          isToday(day) && "text-primary"
                        )}>
                          {format(day, 'd')}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEventDialog(event);
                              }}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate text-white",
                                eventTypeColors[event.event_type]
                              )}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-muted-foreground text-center">
                              +{dayEvents.length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events Sidebar */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Próximos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum evento</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div 
                  key={event.id}
                  onClick={() => openEventDialog(event)}
                  className="p-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold flex-shrink-0",
                      eventTypeColors[event.event_type]
                    )}>
                      <span className="text-sm leading-none">{format(parseISO(event.event_date), "dd")}</span>
                      <span className="text-[9px] uppercase opacity-80">
                        {format(parseISO(event.event_date), "MMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.event_time?.slice(0, 5) || "Dia todo"}
                      </p>
                      {event.is_recurring && (
                        <Badge variant="outline" className="text-[10px] mt-1 gap-1">
                          <Repeat className="w-2.5 h-2.5" />
                          Recorrente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingEvent ? (
                <>
                  <Edit2 className="w-5 h-5" />
                  Editar Evento
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Novo Evento
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Live de Vendas"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Detalhes do evento..."
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newEvent.event_date, "dd/MM/yy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newEvent.event_date}
                      onSelect={(date) => date && setNewEvent({ ...newEvent, event_date: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Horário</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={newEvent.event_type} 
                  onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">📌 Geral</SelectItem>
                    <SelectItem value="mentoria">🎯 Mentoria</SelectItem>
                    <SelectItem value="live">🔴 Live</SelectItem>
                    <SelectItem value="prazo">⏰ Prazo</SelectItem>
                    <SelectItem value="reuniao">👥 Reunião</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {!editingEvent && (
                <div className="space-y-2">
                  <Label>Repetir</Label>
                  <Select 
                    value={newEvent.is_recurring ? newEvent.recurrence_type : "none"} 
                    onValueChange={(value) => {
                      if (value === "none") {
                        setNewEvent({ ...newEvent, is_recurring: false });
                      } else {
                        setNewEvent({ ...newEvent, is_recurring: true, recurrence_type: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não repetir</SelectItem>
                      <SelectItem value="weekly">Toda semana</SelectItem>
                      <SelectItem value="monthly">Todo mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Link da Reunião (opcional)</Label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://meet.google.com/..."
                  value={newEvent.meeting_url}
                  onChange={(e) => setNewEvent({ ...newEvent, meeting_url: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {newEvent.is_recurring && !editingEvent && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 text-sm">
                  <Repeat className="w-4 h-4 text-primary" />
                  <span className="text-foreground">
                    Serão criados {newEvent.recurrence_type === "weekly" ? "12 eventos (próximas 12 semanas)" : "6 eventos (próximos 6 meses)"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => handleDeleteEvent(editingEvent.id)}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
            <Button 
              onClick={handleCreateEvent} 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingEvent ? (
                "Salvar Alterações"
              ) : (
                "Criar Evento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
