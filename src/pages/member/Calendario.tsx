import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CalendarIcon, Clock, Video, ChevronLeft, ChevronRight,
  CalendarClock, CalendarDays, Sparkles, ExternalLink, LayoutGrid, List
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday, parseISO,
  startOfWeek, endOfWeek, addWeeks, subWeeks, isPast, isBefore
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BookingCalendar } from "@/components/scheduling/BookingCalendar";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string;
  meeting_url: string | null;
}

type ViewMode = "month" | "week";

const eventTypes = [
  { value: "geral", label: "Geral", color: "bg-blue-500", dotColor: "bg-blue-400", emoji: "📌", gradient: "from-blue-500/20 to-blue-600/5" },
  { value: "mentoria", label: "Mentoria", color: "bg-purple-500", dotColor: "bg-purple-400", emoji: "🎯", gradient: "from-purple-500/20 to-purple-600/5" },
  { value: "live", label: "Live", color: "bg-red-500", dotColor: "bg-red-400", emoji: "🔴", gradient: "from-red-500/20 to-red-600/5" },
  { value: "prazo", label: "Prazo", color: "bg-amber-500", dotColor: "bg-amber-400", emoji: "⏰", gradient: "from-amber-500/20 to-amber-600/5" },
  { value: "reuniao", label: "Reunião", color: "bg-emerald-500", dotColor: "bg-emerald-400", emoji: "👥", gradient: "from-emerald-500/20 to-emerald-600/5" },
];

const getEventConfig = (type: string) => eventTypes.find(t => t.value === type) || eventTypes[0];

const workingHours = Array.from({ length: 14 }, (_, i) => i + 7);

export default function CalendarioMembro() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const fetchEvents = async () => {
    if (!user || !activeMembership?.tenant_id) return;
    setIsLoading(true);
    try {
      const { data: tenantEvents, error } = await supabase
        .from('calendar_events')
        .select('id, title, description, event_date, event_time, event_type, meeting_url, audience_type, audience_membership_ids')
        .eq('tenant_id', activeMembership.tenant_id)
        .order('event_date', { ascending: true });

      if (error) throw error;

      const filtered = (tenantEvents || []).filter((e: any) => {
        if (e.audience_type === 'staff_only') return false;
        if (e.audience_type === 'all_mentees') return true;
        if (e.audience_type === 'specific' && activeMembership?.id) {
          return (e.audience_membership_ids || []).includes(activeMembership.id);
        }
        return true;
      });
      setEvents(filtered);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({ title: "Erro", description: "Não foi possível carregar os eventos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [user, activeMembership]);

  // Calendar computations
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => events.filter(e => isSameDay(parseISO(e.event_date), date));
  const getEventsForHour = (date: Date, hour: number) =>
    events.filter(e => {
      if (!isSameDay(parseISO(e.event_date), date)) return false;
      if (!e.event_time) return hour === 9;
      return parseInt(e.event_time.split(':')[0], 10) === hour;
    });

  const selectedDayEvents = useMemo(() => getEventsForDate(selectedDate), [events, selectedDate]);

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === "week") {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = events.filter(e => !isBefore(parseISO(e.event_date), now));
    const thisMonth = events.filter(e => {
      const d = parseISO(e.event_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return { upcoming: upcoming.length, thisMonth: thisMonth.length };
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando eventos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col p-4 md:p-6 gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Calendário
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Eventos e sessões de mentoria</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">{stats.upcoming}</span>
            <span className="text-xs text-muted-foreground">próximos</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
            <span className="text-xs font-semibold text-foreground">{stats.thisMonth}</span>
            <span className="text-xs text-muted-foreground">este mês</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="events" className="flex-1 flex flex-col min-h-0 gap-3">
        <TabsList className="w-fit">
          <TabsTrigger value="events" className="gap-2">
            <CalendarIcon className="h-4 w-4" /> Eventos
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-2">
            <CalendarClock className="h-4 w-4" /> Agendar Sessão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="flex-1 min-h-0 mt-0">
          <div className="h-full grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
            {/* Calendar */}
            <Card className="glass-card overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-sm font-semibold min-w-[160px] text-center capitalize">
                    {viewMode === "week"
                      ? `${format(weekStart, "dd", { locale: ptBR })} – ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`
                      : format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }} className="text-xs h-7 ml-1">
                    Hoje
                  </Button>
                </div>
                <div className="flex items-center rounded-lg bg-secondary/50 p-0.5 border border-border/30">
                  <Button variant={viewMode === "month" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("month")} className="h-7 px-3 text-xs gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5" /> Mês
                  </Button>
                  <Button variant={viewMode === "week" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("week")} className="h-7 px-3 text-xs gap-1.5">
                    <List className="w-3.5 h-3.5" /> Semana
                  </Button>
                </div>
              </div>

              {viewMode === "month" ? (
                <MemberMonthView
                  daysInMonth={daysInMonth}
                  monthStart={monthStart}
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  getEventsForDate={getEventsForDate}
                  onSelectDate={setSelectedDate}
                />
              ) : (
                <MemberWeekView
                  daysInWeek={daysInWeek}
                  selectedDate={selectedDate}
                  getEventsForHour={getEventsForHour}
                  onSelectDate={setSelectedDate}
                />
              )}
            </Card>

            {/* Sidebar */}
            <div className="flex flex-col gap-3 min-h-0">
              <Card className="glass-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      {format(selectedDate, "EEEE", { locale: ptBR })}
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </div>
                  </div>
                  {isToday(selectedDate) && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Hoje</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {selectedDayEvents.length === 0
                    ? "Nenhum evento"
                    : `${selectedDayEvents.length} evento${selectedDayEvents.length > 1 ? 's' : ''}`}
                </div>
              </Card>

              {/* Legend */}
              <Card className="glass-card px-4 py-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {eventTypes.map(type => (
                    <div key={type.value} className="flex items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full", type.dotColor)} />
                      <span className="text-[11px] text-muted-foreground">{type.emoji} {type.label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Events list */}
              <Card className="glass-card flex-1 min-h-0 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-3">
                  {selectedDayEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                        <CalendarIcon className="w-7 h-7 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Dia livre!</p>
                      <p className="text-xs text-muted-foreground/60">Nenhum evento neste dia</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayEvents
                        .sort((a, b) => (a.event_time || '').localeCompare(b.event_time || ''))
                        .map((event) => {
                          const config = getEventConfig(event.event_type);
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "relative p-3 rounded-xl transition-all duration-200",
                                "border border-border/40 hover:border-primary/40",
                                "bg-gradient-to-r", config.gradient,
                                "hover:shadow-lg hover:shadow-primary/5"
                              )}
                            >
                              <div className={cn("absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full", config.color)} />
                              <div className="pl-3">
                                <h4 className="text-sm font-semibold text-foreground truncate">{event.title}</h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {event.event_time?.slice(0, 5) || "Dia todo"}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                    {config.emoji} {config.label}
                                  </Badge>
                                </div>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{event.description}</p>
                                )}
                                {event.meeting_url && (
                                  <a
                                    href={event.meeting_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                                  >
                                    <Video className="w-3 h-3" />
                                    Entrar na reunião
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="booking" className="flex-1 min-h-0 mt-0">
          <BookingCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Month View ─── */
function MemberMonthView({
  daysInMonth, monthStart, currentDate, selectedDate,
  getEventsForDate, onSelectDate,
}: {
  daysInMonth: Date[]; monthStart: Date; currentDate: Date; selectedDate: Date;
  getEventsForDate: (d: Date) => CalendarEvent[];
  onSelectDate: (d: Date) => void;
}) {
  return (
    <div className="flex-1 p-3 flex flex-col min-h-0">
      <div className="grid grid-cols-7 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-[11px] font-semibold text-muted-foreground py-2 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 flex-1">
        {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
        {daysInMonth.map((day) => {
          const dayEvents = getEventsForDate(day);
          const isSelected = isSameDay(day, selectedDate);
          const past = isPast(day) && !isToday(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "min-h-[72px] p-1.5 rounded-xl cursor-pointer transition-all duration-200 border",
                "hover:border-primary/40 hover:bg-primary/5",
                isToday(day) ? "bg-primary/10 border-primary/30 shadow-sm shadow-primary/10" : "border-transparent",
                isSelected && !isToday(day) && "border-primary/50 bg-primary/5",
                past && "opacity-60"
              )}
            >
              <div className={cn(
                "text-xs font-semibold mb-0.5",
                isToday(day) ? "text-primary" : isSelected ? "text-foreground" : "text-foreground/80"
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const config = getEventConfig(event.event_type);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium",
                        config.color, "text-white"
                      )}
                    >
                      {event.event_time && <span className="opacity-75 mr-0.5">{event.event_time.slice(0, 5)}</span>}
                      {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-primary font-medium pl-1">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Week View ─── */
function MemberWeekView({
  daysInWeek, selectedDate, getEventsForHour, onSelectDate,
}: {
  daysInWeek: Date[]; selectedDate: Date;
  getEventsForHour: (d: Date, h: number) => CalendarEvent[];
  onSelectDate: (d: Date) => void;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/30 bg-secondary/10">
        <div className="p-2" />
        {daysInWeek.map((day) => (
          <div
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            className={cn(
              "py-2 px-1 text-center border-l border-border/20 cursor-pointer transition-colors",
              isToday(day) && "bg-primary/10",
              isSameDay(day, selectedDate) && "bg-primary/5"
            )}
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div className={cn("text-lg font-bold mt-0.5", isToday(day) ? "text-primary" : "text-foreground")}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>
      <ScrollArea className="flex-1">
        <div className="min-h-[700px]">
          {workingHours.map((hour) => (
            <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/10 min-h-[52px]">
              <div className="text-[11px] text-muted-foreground text-right pr-3 pt-1.5 font-medium tabular-nums">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {daysInWeek.map((day) => {
                const hourEvents = getEventsForHour(day, hour);
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "border-l border-border/15 p-0.5",
                      isToday(day) && "bg-primary/[0.02]"
                    )}
                  >
                    {hourEvents.map((event) => {
                      const config = getEventConfig(event.event_type);
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "text-[10px] px-1.5 py-1 rounded-md font-medium truncate",
                            config.color, "text-white"
                          )}
                        >
                          {event.title}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
