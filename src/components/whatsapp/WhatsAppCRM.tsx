import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Search, User, Phone, Mail, MessageCircle, Send, ArrowDownLeft, ArrowUpRight,
  Clock, Tag, Activity, Loader2, ChevronRight, Filter, SortAsc, TrendingUp,
  AlertCircle, CheckCircle2, Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Contact {
  membership_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  // Computed
  total_sent: number;
  total_received: number;
  last_interaction: string | null;
  engagement_score: "hot" | "warm" | "cold" | "inactive";
  tags: string[];
}

interface TimelineEvent {
  id: string;
  type: "sent" | "received" | "activity" | "campaign" | "auto_reply";
  content: string;
  timestamp: string;
  status?: string;
  metadata?: Record<string, any>;
}

export function WhatsAppCRM() {
  const { activeMembership } = useTenant();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEngagement, setFilterEngagement] = useState<string>("all");

  // Detail sheet
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    if (activeMembership) loadContacts();
  }, [activeMembership]);

  const loadContacts = async () => {
    if (!activeMembership) return;
    setLoading(true);
    const tenantId = activeMembership.tenant_id;

    try {
      // Get all mentee memberships with profiles
      const { data: memberships } = await supabase
        .from("memberships")
        .select("id, user_id, role")
        .eq("tenant_id", tenantId)
        .eq("role", "mentee")
        .eq("status", "active");

      if (!memberships?.length) { setContacts([]); setLoading(false); return; }

      const userIds = memberships.map(m => m.user_id);
      const membershipIds = memberships.map(m => m.id);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Fetch sent message counts per membership
      const { data: sentCounts } = await supabase
        .from("whatsapp_message_logs" as any)
        .select("recipient_membership_id, id")
        .eq("tenant_id", tenantId)
        .eq("status", "sent")
        .in("recipient_membership_id", membershipIds);

      const sentMap = new Map<string, number>();
      (sentCounts as any[] || []).forEach(s => {
        sentMap.set(s.recipient_membership_id, (sentMap.get(s.recipient_membership_id) || 0) + 1);
      });

      // Fetch received (incoming) message counts
      const { data: receivedCounts } = await supabase
        .from("whatsapp_incoming_messages" as any)
        .select("membership_id, id")
        .eq("tenant_id", tenantId)
        .in("membership_id", membershipIds);

      const receivedMap = new Map<string, number>();
      (receivedCounts as any[] || []).forEach(r => {
        receivedMap.set(r.membership_id, (receivedMap.get(r.membership_id) || 0) + 1);
      });

      // Fetch last activity per membership
      const { data: lastActivities } = await supabase
        .from("activity_logs")
        .select("membership_id, created_at")
        .eq("tenant_id", tenantId)
        .in("membership_id", membershipIds)
        .order("created_at", { ascending: false })
        .limit(500);

      const lastActivityMap = new Map<string, string>();
      (lastActivities || []).forEach(a => {
        if (!lastActivityMap.has(a.membership_id!)) {
          lastActivityMap.set(a.membership_id!, a.created_at);
        }
      });

      // Build contacts
      const contactList: Contact[] = memberships.map(m => {
        const profile = profileMap.get(m.user_id);
        const sent = sentMap.get(m.id) || 0;
        const received = receivedMap.get(m.id) || 0;
        const total = sent + received;
        const lastActivity = lastActivityMap.get(m.id);

        let engagement: Contact["engagement_score"] = "inactive";
        if (total >= 10) engagement = "hot";
        else if (total >= 5) engagement = "warm";
        else if (total >= 1) engagement = "cold";

        const tags: string[] = [];
        if (!profile?.phone) tags.push("sem-telefone");
        if (received > sent) tags.push("engajado");
        if (sent > 0 && received === 0) tags.push("sem-resposta");
        if (engagement === "hot") tags.push("ativo");

        return {
          membership_id: m.id,
          full_name: profile?.full_name || "Sem nome",
          phone: profile?.phone || null,
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          role: m.role,
          total_sent: sent,
          total_received: received,
          last_interaction: lastActivity || null,
          engagement_score: engagement,
          tags,
        };
      });

      // Sort by last interaction (most recent first)
      contactList.sort((a, b) => {
        if (!a.last_interaction && !b.last_interaction) return 0;
        if (!a.last_interaction) return 1;
        if (!b.last_interaction) return -1;
        return new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime();
      });

      setContacts(contactList);
    } catch (err) {
      console.error("Error loading CRM contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (contact: Contact) => {
    if (!activeMembership) return;
    setTimelineLoading(true);
    setTimeline([]);
    const tenantId = activeMembership.tenant_id;
    const events: TimelineEvent[] = [];

    try {
      // Sent messages
      const { data: sentMsgs } = await supabase
        .from("whatsapp_message_logs" as any)
        .select("id, message_body, status, sent_at, created_at, campaign_id")
        .eq("tenant_id", tenantId)
        .eq("recipient_membership_id", contact.membership_id)
        .order("created_at", { ascending: false })
        .limit(50);

      (sentMsgs as any[] || []).forEach(m => {
        events.push({
          id: `sent-${m.id}`,
          type: m.campaign_id ? "campaign" : "sent",
          content: m.message_body || "",
          timestamp: m.sent_at || m.created_at,
          status: m.status,
        });
      });

      // Received messages
      const { data: receivedMsgs } = await supabase
        .from("whatsapp_incoming_messages" as any)
        .select("id, message_body, created_at, auto_reply_sent")
        .eq("tenant_id", tenantId)
        .eq("membership_id", contact.membership_id)
        .order("created_at", { ascending: false })
        .limit(50);

      (receivedMsgs as any[] || []).forEach(m => {
        events.push({
          id: `recv-${m.id}`,
          type: "received",
          content: m.message_body || "",
          timestamp: m.created_at,
          metadata: { auto_reply_sent: m.auto_reply_sent },
        });
        if (m.auto_reply_sent) {
          events.push({
            id: `auto-${m.id}`,
            type: "auto_reply",
            content: "Resposta automática enviada pela IA",
            timestamp: m.created_at,
          });
        }
      });

      // Activity logs
      const { data: activities } = await supabase
        .from("activity_logs")
        .select("id, action_type, action_description, created_at")
        .eq("tenant_id", tenantId)
        .eq("membership_id", contact.membership_id)
        .order("created_at", { ascending: false })
        .limit(30);

      (activities || []).forEach(a => {
        events.push({
          id: `act-${a.id}`,
          type: "activity",
          content: a.action_description || a.action_type,
          timestamp: a.created_at,
        });
      });

      // Sort chronologically (newest first)
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTimeline(events);
    } catch (err) {
      console.error("Error loading timeline:", err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    loadTimeline(contact);
  };

  const filtered = useMemo(() => {
    let list = contacts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    if (filterEngagement !== "all") {
      list = list.filter(c => c.engagement_score === filterEngagement);
    }
    return list;
  }, [contacts, search, filterEngagement]);

  const engagementConfig = {
    hot: { label: "Quente", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    warm: { label: "Morno", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    cold: { label: "Frio", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    inactive: { label: "Inativo", color: "bg-muted text-muted-foreground border-border" },
  };

  const stats = useMemo(() => ({
    total: contacts.length,
    hot: contacts.filter(c => c.engagement_score === "hot").length,
    warm: contacts.filter(c => c.engagement_score === "warm").length,
    cold: contacts.filter(c => c.engagement_score === "cold").length,
    inactive: contacts.filter(c => c.engagement_score === "inactive").length,
  }), [contacts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: User, onClick: () => setFilterEngagement("all") },
          { label: "Quentes", value: stats.hot, icon: TrendingUp, color: "text-emerald-400", onClick: () => setFilterEngagement("hot") },
          { label: "Mornos", value: stats.warm, icon: Activity, color: "text-amber-400", onClick: () => setFilterEngagement("warm") },
          { label: "Frios", value: stats.cold, icon: AlertCircle, color: "text-blue-400", onClick: () => setFilterEngagement("cold") },
          { label: "Inativos", value: stats.inactive, icon: Clock, color: "text-muted-foreground", onClick: () => setFilterEngagement("inactive") },
        ].map(s => (
          <Card
            key={s.label}
            className={`cursor-pointer transition-colors hover:border-primary/30 ${filterEngagement === s.label.toLowerCase().replace("quentes", "hot").replace("mornos", "warm").replace("frios", "cold").replace("inativos", "inactive").replace("total", "all") ? "border-primary/50" : ""}`}
            onClick={s.onClick}
          >
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color || "text-foreground"}`} />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>Nenhum contato encontrado.</p>
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-1.5">
            {filtered.map(contact => {
              const eng = engagementConfig[contact.engagement_score];
              return (
                <Card
                  key={contact.membership_id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => handleSelectContact(contact)}
                >
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {contact.full_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{contact.full_name}</span>
                        <Badge variant="outline" className={`text-[10px] ${eng.color}`}>
                          {eng.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {contact.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3" /> {contact.total_sent}
                        </span>
                        <span className="flex items-center gap-1">
                          <ArrowDownLeft className="h-3 w-3" /> {contact.total_received}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {contact.last_interaction && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(contact.last_interaction), { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Contact Detail Sheet */}
      <Sheet open={!!selectedContact} onOpenChange={open => !open && setSelectedContact(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedContact && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {selectedContact.full_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-lg">{selectedContact.full_name}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={engagementConfig[selectedContact.engagement_score].color}>
                        {engagementConfig[selectedContact.engagement_score].label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Contact info */}
              <div className="space-y-3 mb-4">
                {selectedContact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedContact.phone}</span>
                  </div>
                )}
                {selectedContact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedContact.email}</span>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">{selectedContact.total_sent}</p>
                    <p className="text-[10px] text-muted-foreground">Enviadas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold text-blue-400">{selectedContact.total_received}</p>
                    <p className="text-[10px] text-muted-foreground">Recebidas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold">{selectedContact.total_sent + selectedContact.total_received}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tags */}
              {selectedContact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selectedContact.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator className="mb-4" />

              {/* Timeline */}
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Timeline em Tempo Real
              </h3>

              {timelineLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>Nenhuma interação registrada.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4">
                  {/* Timeline line */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />

                  {timeline.map(event => (
                    <div key={event.id} className="relative">
                      {/* Dot */}
                      <div className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-background ${
                        event.type === "sent" ? "bg-emerald-500" :
                        event.type === "received" ? "bg-blue-500" :
                        event.type === "campaign" ? "bg-violet-500" :
                        event.type === "auto_reply" ? "bg-amber-500" :
                        "bg-muted-foreground"
                      }`} />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {event.type === "sent" && <ArrowUpRight className="h-3 w-3 text-emerald-400" />}
                          {event.type === "received" && <ArrowDownLeft className="h-3 w-3 text-blue-400" />}
                          {event.type === "campaign" && <MessageCircle className="h-3 w-3 text-violet-400" />}
                          {event.type === "auto_reply" && <Zap className="h-3 w-3 text-amber-400" />}
                          {event.type === "activity" && <Activity className="h-3 w-3 text-muted-foreground" />}

                          <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            {event.type === "sent" ? "Mensagem enviada" :
                             event.type === "received" ? "Mensagem recebida" :
                             event.type === "campaign" ? "Campanha" :
                             event.type === "auto_reply" ? "Auto-resposta IA" :
                             "Atividade"}
                          </span>

                          {event.status && (
                            <Badge variant={event.status === "sent" ? "default" : "destructive"} className="text-[8px] h-4">
                              {event.status === "sent" ? "✓" : "✗"}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-foreground/90 line-clamp-3">{event.content}</p>

                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(event.timestamp), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
