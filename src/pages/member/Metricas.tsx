import { useState, useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Loader2, Plus, Trash2, DollarSign, Handshake, Activity, CreditCard,
  TrendingUp, Target, HelpCircle, Calendar, ArrowRight, Pencil, RefreshCw,
  MessageSquare, Phone, Users, FileText, Zap, BarChart3, Info, CheckCircle2,
  Clock, AlertTriangle, ChevronRight, Sparkles
} from "lucide-react";
import {
  useInvestment, useDeals, useActivities, usePayments,
  useMetricsMutations, formatCents,
  type MenteeDeal, type MenteePayment
} from "@/hooks/useMetrics";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ──────── Constants ──────── */
const STAGES = [
  { value: "lead", label: "Lead", icon: Target, color: "text-blue-400" },
  { value: "conversa", label: "Conversa", icon: MessageSquare, color: "text-cyan-400" },
  { value: "reuniao_marcada", label: "Reunião Marcada", icon: Calendar, color: "text-yellow-400" },
  { value: "reuniao_feita", label: "Reunião Feita", icon: Users, color: "text-orange-400" },
  { value: "proposta", label: "Proposta", icon: FileText, color: "text-purple-400" },
  { value: "fechado", label: "Fechado ✅", icon: CheckCircle2, color: "text-emerald-400" },
  { value: "perdido", label: "Perdido", icon: AlertTriangle, color: "text-red-400" },
];

const ACTIVITY_TYPES = [
  { value: "msg_enviada", label: "Mensagens Enviadas", icon: MessageSquare, desc: "Quantidade de mensagens de prospecção enviadas" },
  { value: "ligacao", label: "Ligações", icon: Phone, desc: "Ligações feitas para leads ou clientes" },
  { value: "followup", label: "Follow-ups", icon: RefreshCw, desc: "Contatos de acompanhamento com leads" },
  { value: "reuniao", label: "Reuniões Realizadas", icon: Users, desc: "Reuniões de vendas efetivamente realizadas" },
  { value: "proposta", label: "Propostas Enviadas", icon: FileText, desc: "Propostas comerciais enviadas" },
];

const PAYMENT_STATUSES = [
  { value: "recebido", label: "Recebido", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "pendente", label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "atrasado", label: "Atrasado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "estornado", label: "Estornado", color: "bg-muted text-muted-foreground border-border" },
];

/* ──────── Helpers ──────── */
function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help inline ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EmptyState({ icon: Icon, title, desc, action }: { icon: any; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{desc}</p>
      {action}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, badge, action }: { icon: any; title: string; desc: string; badge?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

/* ──────── Mini KPI for summary ──────── */
function MiniKPI({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* ──────── MAIN COMPONENT ──────── */
const Metricas = () => {
  const { activeMembership } = useTenant();
  const membershipId = activeMembership?.id;
  const tenantId = activeMembership?.tenant_id;

  const { data: investment, isLoading: loadingInv } = useInvestment(membershipId);
  const { data: deals = [], isLoading: loadingDeals } = useDeals(membershipId);
  const { data: activities = [], isLoading: loadingAct } = useActivities(membershipId);
  const { data: payments = [], isLoading: loadingPay } = usePayments(membershipId);

  const mutations = useMetricsMutations(membershipId || "", tenantId || "");

  // Current month for summary
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const currentMonthLabel = format(now, "MMMM yyyy", { locale: ptBR });

  // Summary KPIs
  const summary = useMemo(() => {
    const dealsThisMonth = deals.filter(d => {
      const dt = new Date(d.created_at);
      return isWithinInterval(dt, { start: monthStart, end: monthEnd });
    });
    const closedDeals = dealsThisMonth.filter(d => d.stage === "fechado");
    const closedRevenue = closedDeals.reduce((s, d) => s + d.value_cents, 0);

    const actsThisMonth = activities.filter(a => {
      const dt = new Date(a.activity_date);
      return isWithinInterval(dt, { start: monthStart, end: monthEnd });
    });
    const totalActs = actsThisMonth.reduce((s, a) => s + a.count, 0);
    const reunioes = actsThisMonth.filter(a => a.type === "reuniao").reduce((s, a) => s + a.count, 0);

    const paysThisMonth = payments.filter(p => {
      if (!p.paid_at) return false;
      const dt = new Date(p.paid_at);
      return isWithinInterval(dt, { start: monthStart, end: monthEnd });
    }).filter(p => p.status === "recebido");
    const caixaRecebido = paysThisMonth.reduce((s, p) => s + p.amount_cents, 0);

    return { closedRevenue, totalActs, reunioes, caixaRecebido, totalDeals: dealsThisMonth.length, closedCount: closedDeals.length };
  }, [deals, activities, payments, monthStart, monthEnd]);

  // Investment form state
  const [invEditing, setInvEditing] = useState(false);
  const [invAmount, setInvAmount] = useState("");
  const [invStart, setInvStart] = useState("");
  const [invOnboard, setInvOnboard] = useState("");
  const [invNotes, setInvNotes] = useState("");

  // Deal modal
  const [dealOpen, setDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState<Partial<MenteeDeal>>({});

  // Activity quick-add
  const [actOpen, setActOpen] = useState(false);
  const [actForm, setActForm] = useState({ type: "msg_enviada", count: 1, activity_date: format(new Date(), "yyyy-MM-dd") });

  // Payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState<Partial<MenteePayment>>({});

  if (!membershipId || !tenantId) return null;

  const isLoading = loadingInv || loadingDeals || loadingAct || loadingPay;

  const initInvForm = () => {
    if (investment) {
      setInvAmount(String(investment.investment_amount_cents / 100));
      setInvStart(investment.start_date || "");
      setInvOnboard(investment.onboarding_date || "");
      setInvNotes(investment.notes || "");
    } else {
      setInvAmount(""); setInvStart(""); setInvOnboard(""); setInvNotes("");
    }
    setInvEditing(true);
  };

  const saveInvestment = () => {
    mutations.upsertInvestment.mutate({
      id: investment?.id,
      investment_amount_cents: Math.round(parseFloat(invAmount || "0") * 100),
      start_date: invStart || undefined,
      onboarding_date: invOnboard || undefined,
      notes: invNotes || undefined,
    }, { onSuccess: () => setInvEditing(false) });
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-8 p-4 pb-20">
      {/* ──── HEADER ──── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Painel de Resultados</h1>
            <p className="text-sm text-muted-foreground">Acompanhe seus números semanalmente e veja sua evolução</p>
          </div>
        </div>
      </div>

      {/* ──── RESUMO MENSAL ──── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Resumo de {currentMonthLabel}</CardTitle>
          </div>
          <CardDescription>Seus principais indicadores do mês atual — atualize toda semana!</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniKPI label="Receita Fechada" value={formatCents(summary.closedRevenue)} sub={`${summary.closedCount} deal(s) ganho(s)`} />
              <MiniKPI label="Caixa Recebido" value={formatCents(summary.caixaRecebido)} sub="Valores efetivamente recebidos" />
              <MiniKPI label="Atividades" value={String(summary.totalActs)} sub={`${summary.reunioes} reunião(ões)`} />
              <MiniKPI label="Investimento" value={investment ? formatCents(investment.investment_amount_cents) : "—"} sub={investment ? "Valor do programa" : "Registre abaixo"} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ──── 1. INVESTIMENTO ──── */}
      <section>
        <SectionHeader
          icon={DollarSign}
          title="Investimento no Programa"
          desc="Quanto você investiu na mentoria. Isso é usado para calcular seu ROI e Payback."
          badge="Preencha 1x"
          action={
            <Button size="sm" variant="outline" onClick={initInvForm}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />{investment ? "Editar" : "Registrar"}
            </Button>
          }
        />
        <Card>
          <CardContent className="pt-6">
            {loadingInv ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : investment ? (
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Valor investido</p>
                  <p className="text-2xl font-bold text-primary">{formatCents(investment.investment_amount_cents)}</p>
                </div>
                {investment.start_date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Início</p>
                    <p className="text-sm font-medium">{format(new Date(investment.start_date + "T12:00:00"), "dd/MM/yyyy")}</p>
                  </div>
                )}
                {investment.onboarding_date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Onboarding</p>
                    <p className="text-sm font-medium">{format(new Date(investment.onboarding_date + "T12:00:00"), "dd/MM/yyyy")}</p>
                  </div>
                )}
                {investment.notes && (
                  <div className="basis-full">
                    <p className="text-xs text-muted-foreground mb-0.5">Notas</p>
                    <p className="text-sm">{investment.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={DollarSign}
                title="Registre seu investimento"
                desc="Informe o valor que você investiu no programa de mentoria para que possamos calcular seu ROI automaticamente."
                action={<Button size="sm" onClick={initInvForm}>Registrar Investimento</Button>}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ──── 2. PIPELINE / DEALS ──── */}
      <section>
        <SectionHeader
          icon={Handshake}
          title="Pipeline de Vendas (Deals)"
          desc="Registre cada oportunidade de negócio — desde o primeiro contato até o fechamento ou perda."
          badge="Atualize semanalmente"
          action={
            <Button size="sm" onClick={() => { setDealForm({ stage: "lead" }); setDealOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Novo Deal
            </Button>
          }
        />

        {/* Mini pipeline visual */}
        {deals.length > 0 && (
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
            {STAGES.filter(s => s.value !== "perdido").map((stage, i) => {
              const count = deals.filter(d => d.stage === stage.value).length;
              const StageIcon = stage.icon;
              return (
                <div key={stage.value} className="flex items-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap ${count > 0 ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground"}`}>
                    <StageIcon className="h-3 w-3" />
                    {stage.label.replace(" ✅", "")}: {count}
                  </div>
                  {i < STAGES.length - 2 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-0.5 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}

        <Card>
          <CardContent className="pt-6">
            {loadingDeals ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : deals.length === 0 ? (
              <EmptyState
                icon={Handshake}
                title="Nenhum deal registrado"
                desc="Adicione suas oportunidades de venda aqui. Cada contato que pode virar cliente é um 'deal'. Acompanhe o progresso de cada um."
                action={<Button size="sm" onClick={() => { setDealForm({ stage: "lead" }); setDealOpen(true); }}>Criar Primeiro Deal</Button>}
              />
            ) : (
              <div className="space-y-2">
                {deals.map(d => {
                  const stageInfo = STAGES.find(s => s.value === d.stage);
                  const StageIcon = stageInfo?.icon || Target;
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group">
                      <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                        <StageIcon className={`h-4 w-4 ${stageInfo?.color || "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{d.deal_name || "Deal sem nome"}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{stageInfo?.label || d.stage}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground">{formatCents(d.value_cents)}</span>
                          {d.source && <span>via {d.source}</span>}
                          <span>{format(new Date(d.created_at), "dd/MM/yy")}</span>
                          {d.closed_at && <span className="text-emerald-400">Fechado {format(new Date(d.closed_at), "dd/MM/yy")}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => mutations.deleteDeal.mutate(d.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ──── 3. ATIVIDADES COMERCIAIS ──── */}
      <section>
        <SectionHeader
          icon={Activity}
          title="Atividades Comerciais"
          desc="Registre semanalmente quantas ações de vendas você fez. Isso mostra sua consistência."
          badge="Atualize semanalmente"
          action={
            <Button size="sm" onClick={() => { setActForm({ type: "msg_enviada", count: 1, activity_date: format(new Date(), "yyyy-MM-dd") }); setActOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Registrar
            </Button>
          }
        />

        {/* Quick-action cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {ACTIVITY_TYPES.map(at => {
            const Icon = at.icon;
            const thisMonthCount = activities
              .filter(a => a.type === at.value && isWithinInterval(new Date(a.activity_date), { start: monthStart, end: monthEnd }))
              .reduce((s, a) => s + a.count, 0);
            return (
              <button
                key={at.value}
                onClick={() => { setActForm({ type: at.value, count: 1, activity_date: format(new Date(), "yyyy-MM-dd") }); setActOpen(true); }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center group"
              >
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground leading-tight">{at.label}</span>
                <span className="text-lg font-bold text-foreground">{thisMonthCount}</span>
                <span className="text-[9px] text-muted-foreground">este mês</span>
              </button>
            );
          })}
        </div>

        {activities.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-3">Últimos registros</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {activities.slice(0, 15).map(a => {
                  const typeInfo = ACTIVITY_TYPES.find(t => t.value === a.type);
                  const Icon = typeInfo?.icon || Activity;
                  return (
                    <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 group text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{typeInfo?.label || a.type}</span>
                        <Badge variant="secondary" className="text-[10px]">×{a.count}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{format(new Date(a.activity_date + "T12:00:00"), "dd/MM")}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => mutations.deleteActivity.mutate(a.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ──── 4. CAIXA (PAGAMENTOS) ──── */}
      <section>
        <SectionHeader
          icon={CreditCard}
          title="Fluxo de Caixa"
          desc="Registre cada recebimento, pendência ou estorno. Isso calcula quanto você já recebeu de fato."
          badge="Atualize quando receber"
          action={
            <Button size="sm" onClick={() => { setPayForm({ status: "pendente" }); setPayOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Novo Registro
            </Button>
          }
        />

        {/* Summary badges */}
        {payments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(["recebido", "pendente", "atrasado"] as const).map(status => {
              const statusInfo = PAYMENT_STATUSES.find(s => s.value === status);
              const total = payments.filter(p => p.status === status).reduce((s, p) => s + p.amount_cents, 0);
              if (total === 0) return null;
              return (
                <Badge key={status} variant="outline" className={`${statusInfo?.color} text-xs py-1 px-2.5`}>
                  {statusInfo?.label}: {formatCents(total)}
                </Badge>
              );
            })}
          </div>
        )}

        <Card>
          <CardContent className="pt-6">
            {loadingPay ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : payments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Nenhum pagamento registrado"
                desc="Registre aqui cada valor que você recebeu, tem a receber ou que está atrasado. Assim seu mentor acompanha a saúde financeira do seu negócio."
                action={<Button size="sm" onClick={() => { setPayForm({ status: "pendente" }); setPayOpen(true); }}>Registrar Primeiro Pagamento</Button>}
              />
            ) : (
              <div className="space-y-2">
                {payments.map(p => {
                  const statusInfo = PAYMENT_STATUSES.find(s => s.value === p.status);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${p.status === "recebido" ? "bg-emerald-500/10" : p.status === "atrasado" ? "bg-red-500/10" : "bg-muted"}`}>
                        {p.status === "recebido" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
                         p.status === "atrasado" ? <AlertTriangle className="h-4 w-4 text-red-400" /> :
                         <Clock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{p.description || "Pagamento"}</span>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${statusInfo?.color}`}>{statusInfo?.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground">{formatCents(p.amount_cents)}</span>
                          {p.due_date && <span>Venc: {format(new Date(p.due_date + "T12:00:00"), "dd/MM/yy")}</span>}
                          {p.paid_at && <span className="text-emerald-400">Pago: {format(new Date(p.paid_at + "T12:00:00"), "dd/MM/yy")}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => mutations.deletePayment.mutate(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ──── CRM SYNC CALLOUT ──── */}
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-4 py-5">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Sincronização automática com CRM</p>
            <p className="text-xs text-muted-foreground">Em breve: conecte seu CRM e seus deals e atividades serão importados automaticamente. Por enquanto, preencha manualmente.</p>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">Em breve</Badge>
        </CardContent>
      </Card>

      {/* ──── MODALS ──── */}

      {/* Investment edit */}
      <Dialog open={invEditing} onOpenChange={setInvEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{investment ? "Editar Investimento" : "Registrar Investimento"}</DialogTitle>
            <DialogDescription>Informe o valor total que você investiu no programa de mentoria.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Valor investido (R$) <InfoTip text="O valor total pago pelo programa de mentoria, em reais." /></Label>
              <Input type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)} placeholder="60000" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de Início <InfoTip text="Quando você começou oficialmente no programa." /></Label>
                <Input type="date" value={invStart} onChange={e => setInvStart(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Data de Onboarding <InfoTip text="Quando você finalizou o processo de entrada." /></Label>
                <Input type="date" value={invOnboard} onChange={e => setInvOnboard(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} placeholder="Ex: Parcelei em 12x..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInvEditing(false)}>Cancelar</Button>
            <Button onClick={saveInvestment} disabled={mutations.upsertInvestment.isPending}>
              {mutations.upsertInvestment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deal modal */}
      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Deal</DialogTitle>
            <DialogDescription>Um "deal" é uma oportunidade de venda. Registre cada contato que pode se tornar cliente.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Nome do Deal <InfoTip text="Nome do lead ou empresa. Ex: 'João Silva - Consultoria'" /></Label>
              <Input value={dealForm.deal_name || ""} onChange={e => setDealForm(p => ({ ...p, deal_name: e.target.value }))} placeholder="Ex: João Silva - Consultoria" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estágio <InfoTip text="Em que fase essa oportunidade está no seu funil de vendas." /></Label>
                <Select value={dealForm.stage || "lead"} onValueChange={v => setDealForm(p => ({ ...p, stage: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$) <InfoTip text="Valor estimado ou real do contrato/venda." /></Label>
                <Input type="number" value={dealForm.value_cents ? dealForm.value_cents / 100 : ""} onChange={e => setDealForm(p => ({ ...p, value_cents: Math.round(parseFloat(e.target.value || "0") * 100) }))} placeholder="5000" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fonte <InfoTip text="De onde veio esse lead: LinkedIn, indicação, tráfego pago, etc." /></Label>
                <Input value={dealForm.source || ""} onChange={e => setDealForm(p => ({ ...p, source: e.target.value }))} placeholder="linkedin, indicação..." className="mt-1" />
              </div>
              <div>
                <Label>Data Fechamento <InfoTip text="Preencha quando o deal for fechado (ganho ou perdido)." /></Label>
                <Input type="date" value={dealForm.closed_at?.split("T")[0] || ""} onChange={e => setDealForm(p => ({ ...p, closed_at: e.target.value || null }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDealOpen(false)}>Cancelar</Button>
            <Button onClick={() => mutations.createDeal.mutate(dealForm, { onSuccess: () => setDealOpen(false) })} disabled={mutations.createDeal.isPending}>
              {mutations.createDeal.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity modal */}
      <Dialog open={actOpen} onOpenChange={setActOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Atividade</DialogTitle>
            <DialogDescription>Registre as ações de vendas que você realizou. A consistência é o que gera resultado!</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Tipo de atividade</Label>
              <Select value={actForm.type} onValueChange={v => setActForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex flex-col">
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {ACTIVITY_TYPES.find(t => t.value === actForm.type)?.desc}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={actForm.count} onChange={e => setActForm(p => ({ ...p, count: parseInt(e.target.value) || 1 }))} className="mt-1" />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={actForm.activity_date} onChange={e => setActForm(p => ({ ...p, activity_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActOpen(false)}>Cancelar</Button>
            <Button onClick={() => mutations.createActivity.mutate(actForm, { onSuccess: () => setActOpen(false) })} disabled={mutations.createActivity.isPending}>
              {mutations.createActivity.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Registro de Caixa</DialogTitle>
            <DialogDescription>Registre cada valor recebido, pendente ou atrasado dos seus clientes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Descrição <InfoTip text="De quem/o que é esse pagamento. Ex: 'Mensalidade João - Jan'" /></Label>
              <Input value={payForm.description || ""} onChange={e => setPayForm(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Mensalidade João - Janeiro" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" value={payForm.amount_cents ? payForm.amount_cents / 100 : ""} onChange={e => setPayForm(p => ({ ...p, amount_cents: Math.round(parseFloat(e.target.value || "0") * 100) }))} placeholder="3000" className="mt-1" />
              </div>
              <div>
                <Label>Status <InfoTip text="Recebido = já caiu na conta. Pendente = ainda vai vencer. Atrasado = venceu sem pagar." /></Label>
                <Select value={payForm.status || "pendente"} onValueChange={v => setPayForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vencimento <InfoTip text="Data prevista para o pagamento." /></Label>
                <Input type="date" value={payForm.due_date || ""} onChange={e => setPayForm(p => ({ ...p, due_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Pago em <InfoTip text="Data em que o pagamento foi efetivamente recebido." /></Label>
                <Input type="date" value={payForm.paid_at || ""} onChange={e => setPayForm(p => ({ ...p, paid_at: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>Cancelar</Button>
            <Button onClick={() => mutations.createPayment.mutate(payForm, { onSuccess: () => setPayOpen(false) })} disabled={mutations.createPayment.isPending}>
              {mutations.createPayment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Metricas;
