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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Plus, CalendarIcon, Clock, Video, Trash2, 
  ChevronLeft, ChevronRight, Users, Bell
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
  is_recurring: boolean;
  created_at: string;
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

export default function Calendario() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: new Date(),
    event_time: "",
    event_type: "geral",
    meeting_url: "",
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get mentor ID
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (mentorData) {
        setMentorId(mentorData.id);
        
        // Fetch events
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
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          mentor_id: mentorId,
          title: newEvent.title,
          description: newEvent.description || null,
          event_date: format(newEvent.event_date, 'yyyy-MM-dd'),
          event_time: newEvent.event_time || null,
          event_type: newEvent.event_type,
          meeting_url: newEvent.meeting_url || null,
        });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso!",
        description: "Evento criado com sucesso.",
      });
      
      setNewEvent({
        title: "",
        description: "",
        event_date: new Date(),
        event_time: "",
        event_type: "geral",
        meeting_url: "",
      });
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o evento.",
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

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.event_date), date)
    );
  };

  const upcomingEvents = events
    .filter(e => parseISO(e.event_date) >= new Date())
    .slice(0, 10);

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
          <p className="text-muted-foreground">Gerencie eventos e datas importantes para seus mentorados</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
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
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newEvent.event_date, "dd/MM/yyyy", { locale: ptBR })}
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
                  <Input
                    type="time"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
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
              
              <div className="space-y-2">
                <Label>Link da Reunião (opcional)</Label>
                <Input
                  placeholder="https://meet.google.com/..."
                  value={newEvent.meeting_url}
                  onChange={(e) => setNewEvent({ ...newEvent, meeting_url: e.target.value })}
                />
              </div>
              
              <Button 
                onClick={handleCreateEvent} 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Evento
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
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
                        className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5"
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
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum evento agendado</p>
                <p className="text-sm mt-1">Crie seu primeiro evento!</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div 
                  key={event.id}
                  className="p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold",
                      eventTypeColors[event.event_type]
                    )}>
                      {format(parseISO(event.event_date), "dd")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(event.event_date), "EEEE, dd/MM", { locale: ptBR })}
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
                            Entrar
                          </a>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-xs text-muted-foreground">Total de eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/10">
                <Video className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.event_type === 'live').length}
                </p>
                <p className="text-xs text-muted-foreground">Lives agendadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.event_type === 'mentoria').length}
                </p>
                <p className="text-xs text-muted-foreground">Mentorias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.event_type === 'prazo').length}
                </p>
                <p className="text-xs text-muted-foreground">Prazos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
