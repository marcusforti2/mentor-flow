import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, CalendarIcon, Clock, Video, Trash2,
  ChevronLeft, ChevronRight, Repeat, Edit2, LayoutGrid, List,
  ExternalLink, Sparkles, CalendarDays, Users, Lock, Bell, ListChecks, UserCircle
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday, parseISO, startOfWeek,
  endOfWeek, addWeeks, subWeeks, isPast, isBefore
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
  owner_membership_id: string | null;
  audience_type: string;
  audience_membership_ids: string[];
  facilitator_name: string | null;
}

interface TenantMember {
  id: string;
  user_id: string;
  role: string;
  profiles: { full_name: string | null; avatar_url: string | null; email: string | null } | null;
}

type ViewMode = "month" | "week";

const eventTypes = [
  { value: "geral", label: "Geral", color: "bg-blue-500", dotColor: "bg-blue-400", emoji: "📌", gradient: "from-blue-500/15 to-blue-900/10", border: "border-blue-500/30" },
  { value: "mentoria", label: "Mentoria", color: "bg-purple-500", dotColor: "bg-purple-400", emoji: "🎯", gradient: "from-purple-500/15 to-purple-900/10", border: "border-purple-500/30" },
  { value: "live", label: "Live", color: "bg-red-500", dotColor: "bg-red-400", emoji: "🔴", gradient: "from-red-500/15 to-red-900/10", border: "border-red-500/30" },
  { value: "prazo", label: "Prazo", color: "bg-amber-500", dotColor: "bg-amber-400", emoji: "⏰", gradient: "from-amber-500/15 to-amber-900/10", border: "border-amber-500/30" },
  { value: "reuniao", label: "Reunião", color: "bg-emerald-500", dotColor: "bg-emerald-400", emoji: "👥", gradient: "from-emerald-500/15 to-emerald-900/10", border: "border-emerald-500/30" },
  { value: "treinamento", label: "Treinamento", color: "bg-cyan-500", dotColor: "bg-cyan-400", emoji: "🏋️", gradient: "from-cyan-500/15 to-cyan-900/10", border: "border-cyan-500/30" },
  { value: "hotseat", label: "Hot Seat", color: "bg-orange-500", dotColor: "bg-orange-400", emoji: "🔥", gradient: "from-orange-500/15 to-orange-900/10", border: "border-orange-500/30" },
];

const getEventConfig = (type: string) => eventTypes.find(t => t.value === type) || eventTypes[0];

const workingHours = Array.from({ length: 14 }, (_, i) => i + 7);

export default function Calendario() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: new Date(),
    event_time: "09:00",
    event_type: "geral",
    meeting_url: "",
    is_recurring: false,
    recurrence_type: "weekly",
    audience_type: "all_mentees" as string,
    audience_membership_ids: [] as string[],
    notify_email: false,
    remind_before: "24h" as string,
    facilitator_name: "",
  });
  const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);

  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const fetchData = async () => {
    if (!user || !activeMembership?.tenant_id) { setEvents([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [eventsRes, membersRes] = await Promise.all([
        supabase.from('calendar_events').select('*').eq('tenant_id', activeMembership.tenant_id).order('event_date', { ascending: true }),
        supabase.from('memberships').select('id, user_id, role').eq('tenant_id', activeMembership.tenant_id).eq('status', 'active').eq('role', 'mentee'),
      ]);
      if (eventsRes.error) throw eventsRes.error;
      setEvents(eventsRes.data || []);

      const members = membersRes.data || [];
      if (members.length > 0) {
        const userIds = [...new Set(members.map((m: any) => m.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, email')
          .in('user_id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setTenantMembers(members.map((m: any) => ({
          id: m.id, user_id: m.user_id, role: m.role,
          profiles: profileMap.get(m.user_id) || null,
        })));
      } else {
        setTenantMembers([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Erro", description: "Não foi possível carregar os eventos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user, activeMembership]);

  const resetForm = () => {
    setNewEvent({ title: "", description: "", event_date: new Date(), event_time: "09:00", event_type: "geral", meeting_url: "", is_recurring: false, recurrence_type: "weekly", audience_type: "all_mentees", audience_membership_ids: [], notify_email: false, remind_before: "24h", facilitator_name: "" });
    setEditingEvent(null);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) {
      toast({ title: "Erro", description: "Preencha o título do evento.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingEvent) {
        const { error } = await supabase.from('calendar_events').update({
          title: newEvent.title, description: newEvent.description || null,
          event_date: format(newEvent.event_date, 'yyyy-MM-dd'), event_time: newEvent.event_time || null,
          event_type: newEvent.event_type, meeting_url: newEvent.meeting_url || null, is_recurring: newEvent.is_recurring,
          audience_type: newEvent.audience_type,
          audience_membership_ids: newEvent.audience_type === 'specific' ? newEvent.audience_membership_ids : [],
          facilitator_name: newEvent.facilitator_name || null,
        } as any).eq('id', editingEvent.id);
        if (error) throw error;
        toast({ title: "✅ Evento atualizado!" });
      } else {
        const eventsToCreate = [];
        const audienceFields = {
          audience_type: newEvent.audience_type,
          audience_membership_ids: newEvent.audience_type === 'specific' ? newEvent.audience_membership_ids : [],
        };
        if (newEvent.is_recurring) {
          const iterations = newEvent.recurrence_type === "weekly" ? 12 : 6;
          for (let i = 0; i < iterations; i++) {
            const eventDate = newEvent.recurrence_type === "weekly" ? addWeeks(newEvent.event_date, i) : addMonths(newEvent.event_date, i);
            eventsToCreate.push({
              owner_membership_id: activeMembership?.id || null, tenant_id: activeMembership?.tenant_id || null,
              title: newEvent.title, description: newEvent.description || null,
              event_date: format(eventDate, 'yyyy-MM-dd'), event_time: newEvent.event_time || null,
              event_type: newEvent.event_type, meeting_url: newEvent.meeting_url || null, is_recurring: true,
              facilitator_name: newEvent.facilitator_name || null,
              ...audienceFields,
            });
          }
        } else {
          eventsToCreate.push({
            owner_membership_id: activeMembership?.id || null, tenant_id: activeMembership?.tenant_id || null,
            title: newEvent.title, description: newEvent.description || null,
            event_date: format(newEvent.event_date, 'yyyy-MM-dd'), event_time: newEvent.event_time || null,
            event_type: newEvent.event_type, meeting_url: newEvent.meeting_url || null, is_recurring: false,
            facilitator_name: newEvent.facilitator_name || null,
            ...audienceFields,
          });
        }
        const { error } = await supabase.from('calendar_events').insert(eventsToCreate as any);
        if (error) throw error;

        // Send email notification if requested
        if (newEvent.notify_email && eventsToCreate.length > 0) {
          const reminderLabels: Record<string, string> = { "1h": "1 hora antes", "24h": "24 horas antes", "48h": "48 horas antes", "1w": "1 semana antes", "now": "Agora" };
          
          if (newEvent.remind_before === "now") {
            const { data: createdEvents } = await supabase.from('calendar_events')
              .select('id').eq('tenant_id', activeMembership?.tenant_id)
              .eq('title', newEvent.title)
              .order('created_at', { ascending: false }).limit(1);
            
            if (createdEvents?.[0]) {
              supabase.functions.invoke('send-event-notification', {
                body: { event_id: createdEvents[0].id, tenant_id: activeMembership?.tenant_id, remind_before_label: "Agora" },
              }).then(() => toast({ title: "📧 Notificação enviada!" }))
                .catch(() => toast({ title: "Aviso", description: "Evento criado, mas falha ao enviar email.", variant: "destructive" }));
            }
          } else {
            const intervalMap: Record<string, string> = { "1h": "1 hour", "24h": "1 day", "48h": "2 days", "1w": "7 days" };
            const pgInterval = intervalMap[newEvent.remind_before] || "1 day";
            
            const { data: createdEvents } = await supabase.from('calendar_events')
              .select('id, event_date, event_time').eq('tenant_id', activeMembership?.tenant_id)
              .eq('title', newEvent.title)
              .order('created_at', { ascending: false }).limit(eventsToCreate.length);
            
            if (createdEvents?.length) {
              const reminders = createdEvents.map((ce: any) => {
                const eventDatetime = ce.event_time 
                  ? `${ce.event_date}T${ce.event_time}` 
                  : `${ce.event_date}T09:00:00`;
                const scheduledDate = new Date(eventDatetime);
                const hoursMap: Record<string, number> = { "1h": 1, "24h": 24, "48h": 48, "1w": 168 };
                scheduledDate.setHours(scheduledDate.getHours() - (hoursMap[newEvent.remind_before] || 24));
                
                return {
                  event_id: ce.id,
                  tenant_id: activeMembership?.tenant_id,
                  remind_before: pgInterval,
                  scheduled_at: scheduledDate.toISOString(),
                  status: 'pending',
                };
              });
              await supabase.from('event_reminders' as any).insert(reminders as any);
            }
          }
          
          toast({ title: "✅ Evento criado!", description: newEvent.remind_before === "now" ? "Notificação sendo enviada..." : `Lembrete agendado para ${reminderLabels[newEvent.remind_before]}.` });
        } else {
          toast({ title: "✅ Evento criado!", description: newEvent.is_recurring ? `${eventsToCreate.length} eventos recorrentes criados.` : undefined });
        }
      }
      resetForm();
      setIsDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error creating/updating event:', error);
      toast({ title: "Erro", description: error?.message || "Não foi possível salvar o evento.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Optimistically remove from UI
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setIsDialogOpen(false);
      resetForm();

      const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      toast({ title: "Excluído", description: "Evento removido." });
      // Re-fetch to ensure consistency
      await fetchData();
    } catch (error: any) {
      console.error('Delete event failed:', error);
      toast({ title: "Erro ao excluir", description: error?.message || "Não foi possível excluir o evento.", variant: "destructive" });
      // Re-fetch to restore correct state
      await fetchData();
    }
  };

  const openEventDialog = (event?: CalendarEvent, date?: Date, time?: string) => {
    if (event) {
      setEditingEvent(event);
      setNewEvent({
        title: event.title, description: event.description || "",
        event_date: parseISO(event.event_date), event_time: event.event_time?.slice(0, 5) || "09:00",
        event_type: event.event_type, meeting_url: event.meeting_url || "",
        is_recurring: event.is_recurring, recurrence_type: "weekly",
        audience_type: event.audience_type || "all_mentees",
        audience_membership_ids: (event.audience_membership_ids || []) as string[],
        notify_email: false, remind_before: "24h",
        facilitator_name: event.facilitator_name || "",
      });
    } else {
      resetForm();
      if (date) setNewEvent(prev => ({ ...prev, event_date: date, event_time: time || "09:00" }));
    }
    setIsDialogOpen(true);
  };

  // Calendar computations
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Programação week
  const programWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const programWeekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  const weekEvents = useMemo(() => {
    return events.filter(e => {
      const d = parseISO(e.event_date);
      return d >= programWeekStart && d <= programWeekEnd;
    });
  }, [events, weekOffset]);

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    weekEvents.forEach(e => {
      const key = e.event_date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });
    Object.keys(grouped).forEach(k => {
      grouped[k].sort((a, b) => (a.event_time || '').localeCompare(b.event_time || ''));
    });
    return grouped;
  }, [weekEvents]);

  const sortedDays = useMemo(() => Object.keys(eventsByDay).sort(), [eventsByDay]);

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
    return { total: events.length, upcoming: upcoming.length, thisMonth: thisMonth.length };
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
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie eventos, mentorias e prazos da sua equipe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{stats.upcoming}</span>
              <span className="text-xs text-muted-foreground">próximos</span>
            </div>
          </div>
          <Button onClick={() => openEventDialog(undefined, selectedDate)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Evento</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="programacao" className="flex-1 flex flex-col min-h-0 gap-3">
        <TabsList className="w-fit">
          <TabsTrigger value="programacao" className="gap-2">
            <ListChecks className="h-4 w-4" /> Programação
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="h-4 w-4" /> Calendário
          </TabsTrigger>
        </TabsList>

        {/* ── Programação Tab ── */}
        <TabsContent value="programacao" className="flex-1 min-h-0 mt-0">
          <div className="flex flex-col h-full gap-4">
            <Card className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Programação semanal</h2>
                  <p className="text-sm text-muted-foreground">
                    {format(programWeekStart, "dd MMM", { locale: ptBR })} – {format(programWeekEnd, "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">{weekEvents.length}</span>
                    <span className="text-xs text-muted-foreground">evento{weekEvents.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setWeekOffset(0)}>
                      Hoje
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <ScrollArea className="flex-1">
              {sortedDays.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                    <CalendarIcon className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-1">Semana livre!</p>
                  <p className="text-sm text-muted-foreground/60 mb-4">Nenhum evento programado nesta semana</p>
                  <Button onClick={() => openEventDialog()} className="gap-2">
                    <Plus className="w-4 h-4" /> Criar evento
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {sortedDays.map(dateKey => {
                    const dayDate = parseISO(dateKey);
                    const dayIsToday = isToday(dayDate);
                    const dayEvents = eventsByDay[dateKey];

                    return (
                      <div key={dateKey}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn(
                            "text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full",
                            dayIsToday
                              ? "bg-primary text-primary-foreground"
                              : "bg-foreground/10 text-foreground/80"
                          )}>
                            {format(dayDate, "EEEE", { locale: ptBR })} · {format(dayDate, "dd MMM", { locale: ptBR })}
                          </div>
                          {dayIsToday && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] animate-pulse">
                              HOJE
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-3">
                          {dayEvents.map(event => {
                            const config = getEventConfig(event.event_type);
                            return (
                              <Card
                                key={event.id}
                                className={cn(
                                  "group relative overflow-hidden transition-all duration-300 cursor-pointer",
                                  "border hover:shadow-lg",
                                  dayIsToday && "ring-1 ring-primary/20 shadow-md shadow-primary/5",
                                  config.border
                                )}
                                onClick={() => openEventDialog(event)}
                              >
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", config.color)} />

                                <div className={cn("p-4 pl-5 bg-gradient-to-r", config.gradient)}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{config.emoji}</span>
                                        <span className="text-sm font-bold text-foreground tabular-nums">
                                          {event.event_time?.slice(0, 5) || "Dia todo"}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] h-5 px-2 border-foreground/20 text-foreground/80">
                                          {config.label}
                                        </Badge>
                                        {event.is_recurring && <Repeat className="w-3 h-3 text-muted-foreground" />}
                                        {event.audience_type === 'staff_only' && (
                                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/40 text-amber-600">
                                            <Lock className="w-2.5 h-2.5 mr-0.5" /> Staff
                                          </Badge>
                                        )}
                                      </div>
                                      <h3 className="text-base font-bold text-foreground leading-tight">
                                        {event.title}
                                      </h3>
                                      {event.facilitator_name && (
                                        <p className="text-sm text-foreground/70 mt-0.5">
                                          com <span className="font-medium text-foreground">{event.facilitator_name}</span>
                                        </p>
                                      )}
                                      {event.description && (
                                        <p className="text-sm text-foreground/60 mt-2 line-clamp-2 leading-relaxed">
                                          {event.description}
                                        </p>
                                      )}
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-foreground/70 hover:text-foreground"
                                      onClick={(e) => { e.stopPropagation(); openEventDialog(event); }}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </div>

                                  {event.meeting_url && (
                                    <a
                                      href={event.meeting_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className={cn(
                                        "inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg text-sm font-semibold",
                                        "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
                                        "shadow-sm hover:shadow-md"
                                      )}
                                    >
                                      <Video className="w-4 h-4" />
                                      Entrar na reunião
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ── Calendar Tab ── */}
        <TabsContent value="calendar" className="flex-1 min-h-0 mt-0">
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 min-h-0 h-full">
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
                <MonthView
                  daysInMonth={daysInMonth} monthStart={monthStart} currentDate={currentDate}
                  selectedDate={selectedDate} events={events} getEventsForDate={getEventsForDate}
                  onSelectDate={setSelectedDate} onEventClick={(e) => openEventDialog(e)}
                  onDayDoubleClick={(day) => openEventDialog(undefined, day)}
                />
              ) : (
                <WeekView
                  daysInWeek={daysInWeek} events={events} selectedDate={selectedDate}
                  getEventsForHour={getEventsForHour} onSelectDate={setSelectedDate}
                  onEventClick={(e) => openEventDialog(e)}
                  onSlotClick={(day, time) => openEventDialog(undefined, day, time)}
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
                <div className="flex items-center gap-3 mt-2">
                  <div className="text-xs text-muted-foreground">
                    {selectedDayEvents.length === 0
                      ? "Nenhum evento"
                      : `${selectedDayEvents.length} evento${selectedDayEvents.length > 1 ? 's' : ''}`}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-auto text-primary hover:text-primary"
                    onClick={() => openEventDialog(undefined, selectedDate)}>
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                </div>
              </Card>

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

              <Card className="glass-card flex-1 min-h-0 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-3">
                  {selectedDayEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                        <CalendarIcon className="w-7 h-7 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Dia livre!</p>
                      <p className="text-xs text-muted-foreground/60 mb-4">Nenhum evento neste dia</p>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                        onClick={() => openEventDialog(undefined, selectedDate)}>
                        <Plus className="w-3.5 h-3.5" /> Criar evento
                      </Button>
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
                              onClick={() => openEventDialog(event)}
                              className={cn(
                                "group relative p-3 rounded-xl cursor-pointer transition-all duration-200",
                                "border border-border/40 hover:border-primary/40",
                                "bg-gradient-to-r", config.gradient,
                                "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                              )}
                            >
                              <div className={cn("absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full", config.color)} />
                              <div className="pl-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-foreground truncate">{event.title}</h4>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {event.event_time?.slice(0, 5) || "Dia todo"}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-foreground/20 text-foreground/80">
                                        {config.emoji} {config.label}
                                      </Badge>
                                      {event.is_recurring && <Repeat className="w-3 h-3 text-muted-foreground" />}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    onClick={(e) => { e.stopPropagation(); openEventDialog(event); }}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                                {event.facilitator_name && (
                                  <p className="text-xs text-foreground/60 mt-1">com {event.facilitator_name}</p>
                                )}
                                {event.description && (
                                  <p className="text-xs text-foreground/50 mt-1.5 line-clamp-2">{event.description}</p>
                                )}
                                {event.meeting_url && (
                                  <a href={event.meeting_url} target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline">
                                    <Video className="w-3 h-3" /> Entrar na reunião
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
      </Tabs>

      {/* ── Event Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
          <div className={cn(
            "px-6 pt-6 pb-4 bg-gradient-to-br",
            editingEvent ? "from-secondary/80 to-secondary/40" : "from-primary/10 to-transparent"
          )}>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center",
                editingEvent ? "bg-secondary" : "bg-primary/20"
              )}>
                {editingEvent ? <Edit2 className="w-4 h-4 text-foreground" /> : <Plus className="w-4 h-4 text-primary" />}
              </div>
              {editingEvent ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
          </div>

          <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Título do evento *</Label>
              <Input
                placeholder="Ex: Live de Vendas, Mentoria Individual..."
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="h-10" autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descrição</Label>
              <Textarea
                placeholder="Detalhes, pauta, links de referência..."
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={2} className="text-sm resize-none"
              />
            </div>

            {/* Facilitator */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <UserCircle className="w-3.5 h-3.5" /> Responsável / Facilitador
              </Label>
              <Input
                placeholder="Ex: Jonathan Pamplona, Jacob..."
                value={newEvent.facilitator_name}
                onChange={(e) => setNewEvent({ ...newEvent, facilitator_name: e.target.value })}
                className="h-10"
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-10 text-sm">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {format(newEvent.event_date, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar mode="single" selected={newEvent.event_date}
                      onSelect={(date) => date && setNewEvent({ ...newEvent, event_date: date })}
                      initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Horário</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="time" value={newEvent.event_time}
                    onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                    className="pl-10 h-10 text-sm" />
                </div>
              </div>
            </div>

            {/* Type + Recurrence */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo</Label>
                <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-50">
                    {eventTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2"><span>{type.emoji}</span><span>{type.label}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editingEvent && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Recorrência</Label>
                  <Select
                    value={newEvent.is_recurring ? newEvent.recurrence_type : "none"}
                    onValueChange={(v) => {
                      if (v === "none") setNewEvent({ ...newEvent, is_recurring: false });
                      else setNewEvent({ ...newEvent, is_recurring: true, recurrence_type: v });
                    }}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="none">Não repetir</SelectItem>
                      <SelectItem value="weekly">Toda semana (12x)</SelectItem>
                      <SelectItem value="monthly">Todo mês (6x)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Meeting URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Link da reunião</Label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="https://meet.google.com/..."
                  value={newEvent.meeting_url}
                  onChange={(e) => setNewEvent({ ...newEvent, meeting_url: e.target.value })}
                  className="pl-10 h-10 text-sm" />
              </div>
            </div>

            {/* Audience */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Para quem é este evento?</Label>
              <Select value={newEvent.audience_type} onValueChange={(v) => setNewEvent({ ...newEvent, audience_type: v, audience_membership_ids: v === 'specific' ? newEvent.audience_membership_ids : [] })}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all_mentees"><span className="flex items-center gap-2">👥 Todos os mentorados</span></SelectItem>
                  <SelectItem value="specific"><span className="flex items-center gap-2">🎯 Mentorados específicos</span></SelectItem>
                  <SelectItem value="staff_only"><span className="flex items-center gap-2">🔒 Só equipe (staff)</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newEvent.audience_type === 'specific' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Selecionar mentorados</Label>
                  {tenantMembers.length > 0 && (
                    <button type="button"
                      onClick={() => {
                        const allSelected = newEvent.audience_membership_ids.length === tenantMembers.length;
                        setNewEvent(prev => ({
                          ...prev,
                          audience_membership_ids: allSelected ? [] : tenantMembers.map(m => m.id),
                        }));
                      }}
                      className="text-[11px] text-primary hover:underline">
                      {newEvent.audience_membership_ids.length === tenantMembers.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  )}
                </div>
                <div className="border border-border/50 rounded-xl max-h-[180px] overflow-y-auto">
                  {tenantMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum mentorado ativo</p>
                  ) : tenantMembers.map((member, idx) => {
                    const isSelected = newEvent.audience_membership_ids.includes(member.id);
                    const name = member.profiles?.full_name || member.profiles?.email || `Mentorado`;
                    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={member.id}
                        onClick={() => {
                          setNewEvent(prev => ({
                            ...prev,
                            audience_membership_ids: isSelected
                              ? prev.audience_membership_ids.filter(id => id !== member.id)
                              : [...prev.audience_membership_ids, member.id],
                          }));
                        }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all",
                          isSelected ? "bg-primary/10" : "hover:bg-secondary/50",
                          idx !== 0 && "border-t border-border/20"
                        )}>
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <span className="text-[10px] text-primary-foreground font-bold">✓</span>}
                        </div>
                        {member.profiles?.avatar_url ? (
                          <img src={member.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-semibold text-primary">{initials}</span>
                          </div>
                        )}
                        <span className="text-sm font-medium truncate">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recurrence info */}
            {newEvent.is_recurring && !editingEvent && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Repeat className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-foreground">
                  Serão criados <strong>{newEvent.recurrence_type === "weekly" ? "12 eventos (12 semanas)" : "6 eventos (6 meses)"}</strong>
                </span>
              </div>
            )}

            {/* Email toggle */}
            {!editingEvent && (
              <div className="space-y-2 p-3 rounded-xl border border-border/40 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-xs font-medium cursor-pointer">Notificar por email</Label>
                  </div>
                  <button type="button" onClick={() => setNewEvent(prev => ({ ...prev, notify_email: !prev.notify_email }))}
                    className={cn("relative w-9 h-5 rounded-full transition-colors", newEvent.notify_email ? "bg-primary" : "bg-muted-foreground/30")}>
                    <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", newEvent.notify_email && "translate-x-4")} />
                  </button>
                </div>
                {newEvent.notify_email && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Quando enviar?</Label>
                    <Select value={newEvent.remind_before} onValueChange={(v) => setNewEvent({ ...newEvent, remind_before: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="1h">1 hora antes</SelectItem>
                        <SelectItem value="24h">24 horas antes</SelectItem>
                        <SelectItem value="48h">48 horas antes</SelectItem>
                        <SelectItem value="1w">1 semana antes</SelectItem>
                        <SelectItem value="now">Enviar agora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-6 gap-2 sm:gap-0">
            {editingEvent && (
              <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(editingEvent.id)} className="mr-auto gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
            )}
            <Button onClick={handleCreateEvent} disabled={isSubmitting || !newEvent.title.trim()} className="gap-1.5">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : editingEvent ? "Salvar alterações" : "Criar evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Month View ─── */
function MonthView({
  daysInMonth, monthStart, currentDate, selectedDate, events,
  getEventsForDate, onSelectDate, onEventClick, onDayDoubleClick,
}: {
  daysInMonth: Date[]; monthStart: Date; currentDate: Date; selectedDate: Date;
  events: CalendarEvent[]; getEventsForDate: (d: Date) => CalendarEvent[];
  onSelectDate: (d: Date) => void; onEventClick: (e: CalendarEvent) => void;
  onDayDoubleClick: (d: Date) => void;
}) {
  return (
    <div className="flex-1 p-3 flex flex-col min-h-0">
      <div className="grid grid-cols-7 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-[11px] font-semibold text-muted-foreground py-2 uppercase tracking-wider">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 flex-1">
        {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
        {daysInMonth.map((day) => {
          const dayEvents = getEventsForDate(day);
          const isSelected = isSameDay(day, selectedDate);
          const past = isPast(day) && !isToday(day);
          return (
            <div key={day.toISOString()} onClick={() => onSelectDate(day)} onDoubleClick={() => onDayDoubleClick(day)}
              className={cn(
                "min-h-[72px] p-1.5 rounded-xl cursor-pointer transition-all duration-200 border",
                "hover:border-primary/40 hover:bg-primary/5",
                isToday(day) ? "bg-primary/10 border-primary/30 shadow-sm shadow-primary/10" : "border-transparent",
                isSelected && !isToday(day) && "border-primary/50 bg-primary/5",
                past && "opacity-60"
              )}>
              <div className={cn("text-xs font-semibold mb-0.5", isToday(day) ? "text-primary" : isSelected ? "text-foreground" : "text-foreground/80")}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const config = getEventConfig(event.event_type);
                  return (
                    <div key={event.id} onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      className={cn("text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium transition-all hover:ring-1 hover:ring-white/20", config.color, "text-white")}>
                      {event.event_time && <span className="opacity-75 mr-0.5">{event.event_time.slice(0, 5)}</span>}
                      {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && <div className="text-[10px] text-primary font-medium pl-1">+{dayEvents.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Week View ─── */
function WeekView({
  daysInWeek, events, selectedDate, getEventsForHour, onSelectDate, onEventClick, onSlotClick,
}: {
  daysInWeek: Date[]; events: CalendarEvent[]; selectedDate: Date;
  getEventsForHour: (d: Date, h: number) => CalendarEvent[];
  onSelectDate: (d: Date) => void; onEventClick: (e: CalendarEvent) => void;
  onSlotClick: (d: Date, t: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/30 bg-secondary/10">
        <div className="p-2" />
        {daysInWeek.map((day) => (
          <div key={day.toISOString()} onClick={() => onSelectDate(day)}
            className={cn("py-2 px-1 text-center border-l border-border/20 cursor-pointer transition-colors", isToday(day) && "bg-primary/10", isSameDay(day, selectedDate) && "bg-primary/5")}>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{format(day, "EEE", { locale: ptBR })}</div>
            <div className={cn("text-lg font-bold mt-0.5", isToday(day) ? "text-primary" : "text-foreground")}>{format(day, "d")}</div>
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
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                return (
                  <div key={`${day.toISOString()}-${hour}`} onClick={() => onSlotClick(day, timeStr)}
                    className={cn("border-l border-border/15 p-0.5 cursor-pointer transition-colors group/slot relative hover:bg-primary/5", isToday(day) && "bg-primary/[0.02]")}>
                    <div className="absolute inset-0 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                      <Plus className="w-3 h-3 text-muted-foreground/30" />
                    </div>
                    {hourEvents.map((event) => {
                      const config = getEventConfig(event.event_type);
                      return (
                        <div key={event.id} onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                          className={cn("text-[11px] p-1.5 rounded-md cursor-pointer truncate hover:ring-1 hover:ring-white/30 transition-all shadow-sm", config.color, "text-white")}>
                          <div className="font-semibold truncate leading-tight">{event.title}</div>
                          {event.event_time && <div className="text-[9px] opacity-75 mt-0.5">{event.event_time.slice(0, 5)}</div>}
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
