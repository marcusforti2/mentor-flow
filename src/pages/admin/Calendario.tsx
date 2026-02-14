import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Plus, CalendarIcon, Clock, Video, Trash2, 
  ChevronLeft, ChevronRight, Repeat, Edit2, LayoutGrid, List
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, parseISO, startOfWeek, 
  endOfWeek, addWeeks, subWeeks, setHours, setMinutes
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

const eventTypes = [
  { value: "geral", label: "Geral", color: "bg-blue-500", emoji: "📌" },
  { value: "mentoria", label: "Mentoria", color: "bg-purple-500", emoji: "🎯" },
  { value: "live", label: "Live", color: "bg-red-500", emoji: "🔴" },
  { value: "prazo", label: "Prazo", color: "bg-amber-500", emoji: "⏰" },
  { value: "reuniao", label: "Reunião", color: "bg-emerald-500", emoji: "👥" },
];

const getEventColor = (type: string) => {
  return eventTypes.find(t => t.value === type)?.color || "bg-blue-500";
};

const getEventLabel = (type: string) => {
  return eventTypes.find(t => t.value === type)?.label || "Geral";
};

const workingHours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

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
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Use tenant_id directly (owner_membership_id available but tenant_id is primary filter)
      if (activeMembership?.tenant_id) {
        const { data: eventsData, error } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('tenant_id', activeMembership.tenant_id)
          .order('event_date', { ascending: true });
        
        if (error) throw error;
        setEvents(eventsData || []);
      } else {
        setEvents([]);
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
  }, [user, activeMembership]);

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
    if (!newEvent.title.trim()) {
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
        const eventsToCreate = [];
        
        if (newEvent.is_recurring) {
          const iterations = newEvent.recurrence_type === "weekly" ? 12 : 6;
          for (let i = 0; i < iterations; i++) {
            const eventDate = newEvent.recurrence_type === "weekly"
              ? addWeeks(newEvent.event_date, i)
              : addMonths(newEvent.event_date, i);
            
            eventsToCreate.push({
              ...(mentorId ? { mentor_id: mentorId } : {}),
              tenant_id: activeMembership?.tenant_id || null,
              title: newEvent.title,
              description: newEvent.description || null,
              event_date: format(eventDate, 'yyyy-MM-dd'),
              event_time: newEvent.event_time || null,
              event_type: newEvent.event_type,
              meeting_url: newEvent.meeting_url || null,
              is_recurring: true,
            } as any);
          }
        } else {
          eventsToCreate.push({
            ...(mentorId ? { mentor_id: mentorId } : {}),
            tenant_id: activeMembership?.tenant_id || null,
            title: newEvent.title,
            description: newEvent.description || null,
            event_date: format(newEvent.event_date, 'yyyy-MM-dd'),
            event_time: newEvent.event_time || null,
            event_type: newEvent.event_type,
            meeting_url: newEvent.meeting_url || null,
            is_recurring: false,
          } as any);
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

  const openEventDialog = (event?: CalendarEvent, date?: Date, time?: string) => {
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
        setNewEvent(prev => ({ 
          ...prev, 
          event_date: date,
          event_time: time || "09:00"
        }));
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
      if (!event.event_time) return hour === 9;
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
    .slice(0, 5);

  const totalEvents = events.length;
  const thisMonthEvents = events.filter(e => {
    const eventDate = parseISO(e.event_date);
    return eventDate.getMonth() === currentDate.getMonth() && 
           eventDate.getFullYear() === currentDate.getFullYear();
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col p-4 md:p-6 gap-4">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold px-2 min-w-[140px] text-center">
              {viewMode === "week" 
                ? `${format(weekStart, "dd", { locale: ptBR })} - ${format(weekEnd, "dd MMM", { locale: ptBR })}`
                : format(currentDate, "MMMM yyyy", { locale: ptBR })
              }
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="text-xs h-8"
          >
            Hoje
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg bg-secondary/30 p-0.5">
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="h-7 px-3 text-xs gap-1.5"
            >
              <List className="w-3.5 h-3.5" />
              Semana
            </Button>
            <Button
              variant={viewMode === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="h-7 px-3 text-xs gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Mês
            </Button>
          </div>

          <Button onClick={() => openEventDialog()} size="sm" className="h-8 gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Evento</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 min-h-0">
        {/* Calendar Grid */}
        <Card className="glass-card overflow-hidden flex flex-col">
          {viewMode === "week" ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Week Header */}
              <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-border/30 bg-secondary/20">
                <div className="p-2" />
                {daysInWeek.map((day) => (
                  <div 
                    key={day.toISOString()} 
                    className={cn(
                      "p-2 text-center border-l border-border/20",
                      isToday(day) && "bg-primary/10"
                    )}
                  >
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {format(day, "EEE", { locale: ptBR })}
                    </div>
                    <div className={cn(
                      "text-base font-semibold",
                      isToday(day) ? "text-primary" : "text-foreground"
                    )}>
                      {format(day, "d")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hours Grid */}
              <ScrollArea className="flex-1">
                <div className="min-h-[600px]">
                  {workingHours.map((hour) => (
                    <div 
                      key={hour} 
                      className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-border/20 min-h-[48px]"
                    >
                      <div className="text-[10px] text-muted-foreground text-right pr-2 pt-1 font-medium">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      {daysInWeek.map((day) => {
                        const hourEvents = getEventsForHour(day, hour);
                        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                        return (
                          <div 
                            key={`${day.toISOString()}-${hour}`}
                            onClick={() => openEventDialog(undefined, day, timeStr)}
                            className={cn(
                              "border-l border-border/20 p-0.5 cursor-pointer transition-colors group relative",
                              "hover:bg-primary/5",
                              isToday(day) && "bg-primary/[0.02]"
                            )}
                          >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                              <Plus className="w-3 h-3 text-muted-foreground/50" />
                            </div>
                            {hourEvents.map((event) => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEventDialog(event);
                                }}
                                className={cn(
                                  "text-[11px] p-1.5 rounded cursor-pointer truncate",
                                  "hover:ring-1 hover:ring-white/30 transition-all shadow-sm",
                                  getEventColor(event.event_type),
                                  "text-white"
                                )}
                              >
                                <div className="font-medium truncate leading-tight">{event.title}</div>
                                {event.event_time && (
                                  <div className="text-[9px] opacity-75 mt-0.5">{event.event_time.slice(0, 5)}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            /* Month View */
            <div className="flex-1 p-3 flex flex-col">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 flex-1">
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
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
                        "min-h-[70px] p-1.5 rounded-lg cursor-pointer transition-all border border-transparent",
                        "hover:border-primary/40 hover:bg-white/5",
                        isToday(day) && "bg-primary/10 border-primary/20",
                        isSelected && "border-primary bg-primary/15"
                      )}
                    >
                      <div className={cn(
                        "text-xs font-medium",
                        isToday(day) ? "text-primary" : "text-foreground"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventDialog(event);
                            }}
                            className={cn(
                              "text-[9px] px-1 py-0.5 rounded truncate text-white leading-tight",
                              getEventColor(event.event_type)
                            )}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-muted-foreground pl-1">
                            +{dayEvents.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Sidebar */}
        <div className="flex flex-col gap-3">
          {/* Mini Stats */}
          <Card className="glass-card p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalEvents}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{thisMonthEvents}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Este mês</div>
              </div>
            </div>
          </Card>

          {/* Event Type Legend */}
          <Card className="glass-card p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">Tipos de Evento</div>
            <div className="flex flex-wrap gap-1.5">
              {eventTypes.map(type => (
                <div key={type.value} className="flex items-center gap-1.5">
                  <div className={cn("w-2.5 h-2.5 rounded-full", type.color)} />
                  <span className="text-[10px] text-foreground">{type.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming Events */}
          <Card className="glass-card flex-1 min-h-0 flex flex-col">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Próximos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 flex-1 min-h-0">
              <ScrollArea className="h-full max-h-[250px]">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Nenhum evento agendado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map((event) => (
                      <div 
                        key={event.id}
                        onClick={() => openEventDialog(event)}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded flex flex-col items-center justify-center text-white text-[10px] font-bold shrink-0",
                            getEventColor(event.event_type)
                          )}>
                            <span className="leading-none">{format(parseISO(event.event_date), "dd")}</span>
                            <span className="text-[8px] uppercase opacity-75">
                              {format(parseISO(event.event_date), "MMM", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{event.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {event.event_time?.slice(0, 5) || "Dia todo"} • {getEventLabel(event.event_type)}
                            </p>
                          </div>
                          {event.is_recurring && (
                            <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {editingEvent ? (
                <>
                  <Edit2 className="w-4 h-4" />
                  Editar Evento
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Novo Evento
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input
                placeholder="Ex: Live de Vendas"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="h-9"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                placeholder="Detalhes do evento..."
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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
              
              <div className="space-y-1.5">
                <Label className="text-xs">Horário</Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="time"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select 
                  value={newEvent.event_type} 
                  onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {!editingEvent && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Repetir</Label>
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
                    <SelectTrigger className="h-9 text-sm">
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
            
            <div className="space-y-1.5">
              <Label className="text-xs">Link da Reunião (opcional)</Label>
              <div className="relative">
                <Video className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="https://meet.google.com/..."
                  value={newEvent.meeting_url}
                  onChange={(e) => setNewEvent({ ...newEvent, meeting_url: e.target.value })}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>

            {newEvent.is_recurring && !editingEvent && (
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 text-xs">
                  <Repeat className="w-3.5 h-3.5 text-primary" />
                  <span className="text-foreground">
                    {newEvent.recurrence_type === "weekly" ? "12 eventos (12 semanas)" : "6 eventos (6 meses)"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            {editingEvent && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteEvent(editingEvent.id)}
                className="mr-auto h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Excluir
              </Button>
            )}
            <Button 
              onClick={handleCreateEvent} 
              disabled={isSubmitting}
              size="sm"
              className="h-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : editingEvent ? (
                "Salvar"
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
