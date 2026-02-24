import { useState, useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Loader2, Plus, Trash2, DollarSign, Handshake, Activity, CreditCard,
  TrendingUp, Target, HelpCircle, Calendar, Pencil, RefreshCw,
  MessageSquare, Phone, Users, FileText, Zap, BarChart3, CheckCircle2,
  Clock, AlertTriangle, ChevronRight, ChevronDown, Sparkles, Minus, Save
} from "lucide-react";
import {
  useInvestment, useDeals, useActivities, usePayments,
  useMetricsMutations, formatCents,
  type MenteeDeal, type MenteePayment
} from "@/hooks/useMetrics";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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
  { value: "msg_enviada", label: "Mensagens", icon: MessageSquare, emoji: "💬", desc: "Mensagens de prospecção enviadas" },
  { value: "ligacao", label: "Ligações", icon: Phone, emoji: "📞", desc: "Ligações feitas para leads" },
  { value: "followup", label: "Follow-ups", icon: RefreshCw, emoji: "🔄", desc: "Contatos de acompanhamento" },
  { value: "reuniao", label: "Reuniões", icon: Users, emoji: "👥", desc: "Reuniões realizadas" },
  { value: "proposta", label: "Propostas", icon: FileText, emoji: "📄", desc: "Propostas enviadas" },
];

const PAYMENT_STATUSES = [
  { value: "recebido", label: "Recebido", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "pendente", label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "atrasado", label: "Atrasado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "estornado", label: "Estornado", color: "bg-muted text-muted-foreground border-border" },
];

/* CRM stage mapping */
const CRM_STAGE_MAP: Record<string, string> = {
  lead: "lead", new: "lead", contacted: "conversa",
  meeting_scheduled: "reuniao_marcada", meeting_done: "reuniao_feita",
  proposal: "proposta", won: "fechado", lost: "perdido",
};

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

function StepHeader({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-primary-foreground text-sm font-bold">
        {step}
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
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

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const weekLabel = `Semana ${format(today, "w")} · ${format(today, "dd MMM yyyy", { locale: ptBR })}`;

  // Activity counters for quick check-in
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const inc = (type: string) => setCounters(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
  const dec = (type: string) => setCounters(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) - 1) }));
  const hasCounters = Object.values(counters).some(v => v > 0);

  const saveAllActivities = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(counters).filter(([, v]) => v > 0);
      for (const [type, count] of entries) {
        await mutations.createActivity.mutateAsync({ type, count, activity_date: todayStr });
      }
      setCounters({});
      toast.success(`${entries.length} atividade(s) registrada(s)! 🎉`);
    } catch {
      toast.error("Erro ao salvar atividades");
    } finally {
      setSaving(false);
    }
  };

  // Deal modal
  const [dealOpen, setDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState<Partial<MenteeDeal>>({});

  // Payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState<Partial<MenteePayment>>({});

  // Costs section
  const [costsOpen, setCostsOpen] = useState(false);
  const [adsCost, setAdsCost] = useState("");
  const [teamCost, setTeamCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [savingCosts, setSavingCosts] = useState(false);

  // CRM sync
  const [syncing, setSyncing] = useState(false);

  // Summary calcs
  const summary = useMemo(() => {
    const weekActs = activities.filter(a => {
      const d = new Date(a.activity_date + "T12:00:00");
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    const totalWeekActs = weekActs.reduce((s, a) => s + a.count, 0);

    const monthDeals = deals.filter(d => isWithinInterval(new Date(d.created_at), { start: monthStart, end: monthEnd }));
    const activeDeals = deals.filter(d => !["fechado", "perdido"].includes(d.stage));
    const closedDeals = deals.filter(d => d.stage === "fechado");
    const closedRevenue = closedDeals.reduce((s, d) => s + d.value_cents, 0);

    const monthPays = payments.filter(p => p.paid_at && p.status === "recebido" && isWithinInterval(new Date(p.paid_at), { start: monthStart, end: monthEnd }));
    const caixaRecebido = monthPays.reduce((s, p) => s + p.amount_cents, 0);

    // ROI calculations
    const totalCaixaRecebido = payments.filter(p => p.status === "recebido").reduce((s, p) => s + p.amount_cents, 0);
    const pipelineAberto = activeDeals.reduce((s, d) => s + d.value_cents, 0);
    const mrr = closedDeals.reduce((s, d) => s + (d.monthly_value_cents || 0), 0);

    // Fallback: average of last 3 months of received payments
    const threeMonthsAgo = subDays(today, 90);
    const recentPayments = payments.filter(p => p.status === "recebido" && p.paid_at && new Date(p.paid_at) >= threeMonthsAgo);
    const avgMonthlyReceived = recentPayments.length > 0 ? recentPayments.reduce((s, p) => s + p.amount_cents, 0) / 3 : 0;
    const monthlyIncome = mrr > 0 ? mrr : avgMonthlyReceived;

    const investmentTotal = investment?.investment_amount_cents || 0;
    const faltaRecuperar = Math.max(0, investmentTotal - totalCaixaRecebido);
    const percentRecuperado = investmentTotal > 0 ? Math.min(100, (totalCaixaRecebido / investmentTotal) * 100) : 0;
    const roi = investmentTotal > 0 ? ((totalCaixaRecebido - investmentTotal) / investmentTotal) * 100 : 0;
    const paybackMonths = monthlyIncome > 0 ? faltaRecuperar / monthlyIncome : null;

    return {
      totalWeekActs, activeDeals: activeDeals.length, closedRevenue, caixaRecebido, totalDeals: deals.length,
      totalCaixaRecebido, pipelineAberto, mrr, faltaRecuperar, percentRecuperado, roi, paybackMonths, investmentTotal, closedRevenueTotal: closedRevenue,
    };
  }, [activities, deals, payments, weekStart, weekEnd, monthStart, monthEnd, investment, today]);

  // Load cost form when investment data arrives
  useMemo(() => {
    if (investment) {
      setAdsCost(investment.monthly_ads_cost_cents ? String(investment.monthly_ads_cost_cents / 100) : "");
      setTeamCost(investment.monthly_team_cost_cents ? String(investment.monthly_team_cost_cents / 100) : "");
      setOtherCost(investment.monthly_other_cost_cents ? String(investment.monthly_other_cost_cents / 100) : "");
    }
  }, [investment]);

  const saveCosts = async () => {
    setSavingCosts(true);
    try {
      mutations.upsertInvestment.mutate({
        id: investment?.id,
        investment_amount_cents: investment?.investment_amount_cents || 0,
        start_date: investment?.start_date || undefined,
        onboarding_date: investment?.onboarding_date || undefined,
        notes: investment?.notes || undefined,
        monthly_ads_cost_cents: Math.round(parseFloat(adsCost || "0") * 100),
        monthly_team_cost_cents: Math.round(parseFloat(teamCost || "0") * 100),
        monthly_other_cost_cents: Math.round(parseFloat(otherCost || "0") * 100),
      });
      toast.success("Custos atualizados!");
    } catch {
      toast.error("Erro ao salvar custos");
    } finally {
      setSavingCosts(false);
    }
  };

  // CRM sync handler
  const syncFromCRM = async () => {
    if (!membershipId || !tenantId) return;
    setSyncing(true);
    try {
      const { data: prospections, error } = await supabase
        .from("crm_prospections")
        .select("id, contact_name, company, status, points, temperature")
        .eq("membership_id", membershipId);

      if (error) throw error;
      if (!prospections || prospections.length === 0) {
        toast.info("Nenhum lead encontrado no seu CRM.");
        return;
      }

      let imported = 0;
      for (const p of prospections) {
        const stage = CRM_STAGE_MAP[p.status || ""] || "lead";
        const exists = deals.find(d => d.source === "crm_sync" && d.deal_name === p.contact_name);
        if (!exists) {
          await mutations.createDeal.mutateAsync({
            deal_name: `${p.contact_name}${p.company ? ` - ${p.company}` : ""}`,
            stage,
            value_cents: (p.points || 0) * 100,
            source: "crm_sync",
          });
          imported++;
        }
      }
      toast.success(imported > 0 ? `${imported} deal(s) importado(s) do CRM! 🔄` : "CRM já sincronizado, nenhum novo deal.");
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (!membershipId || !tenantId) return null;

  const isLoading = loadingInv || loadingDeals || loadingAct || loadingPay;

  // Monthly cost total
  const investmentMonthly = investment ? investment.investment_amount_cents / 12 : 0; // simple /12 estimate
  const adsCents = investment?.monthly_ads_cost_cents || 0;
  const teamCents = investment?.monthly_team_cost_cents || 0;
  const otherCents = investment?.monthly_other_cost_cents || 0;
  const totalMonthlyCost = investmentMonthly + adsCents + teamCents + otherCents;

  return (
    <div className="max-w-[800px] mx-auto space-y-6 p-4 pb-20">
      {/* ──── HEADER ──── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          Check-in Diário
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Como foi seu dia? 🎯
        </h1>
        <p className="text-sm text-muted-foreground">{weekLabel}</p>
      </div>

      {/* ──── RESUMO DA SEMANA ──── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Atividades", value: String(summary.totalWeekActs), sub: "esta semana" },
          { label: "Deals Ativos", value: String(summary.activeDeals), sub: "no pipeline" },
          { label: "Receita Total", value: formatCents(summary.closedRevenue), sub: "deals fechados" },
          { label: "Caixa Recebido", value: formatCents(summary.caixaRecebido), sub: "este mês" },
        ].map((kpi, i) => (
          <Card key={i} className="text-center">
            <CardContent className="py-3 px-2">
              <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ──── PAINEL DE ROI ──── */}
      {summary.investmentTotal > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Painel de ROI</h2>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl border border-border bg-card">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">ROI</p>
                <p className={`text-xl font-bold ${summary.roi >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                  {summary.roi >= 0 ? "+" : ""}{summary.roi.toFixed(0)}%
                </p>
              </div>
              <div className="text-center p-3 rounded-xl border border-border bg-card">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payback</p>
                <p className="text-xl font-bold text-foreground">
                  {summary.paybackMonths !== null ? `${summary.paybackMonths.toFixed(1)} m` : "—"}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl border border-border bg-card">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Falta</p>
                <p className="text-xl font-bold text-foreground">
                  {summary.faltaRecuperar > 0 ? formatCents(summary.faltaRecuperar) : "✅"}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Recuperação do investimento</span>
                <span className="text-xs font-medium text-primary">{summary.percentRecuperado.toFixed(0)}%</span>
              </div>
              <Progress value={summary.percentRecuperado} className="h-3" />
            </div>

            {/* Breakdown */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investimento</span>
                <span className="font-medium text-foreground">{formatCents(summary.investmentTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">├─ Caixa Recebido</span>
                <span className="font-medium text-emerald-500">{formatCents(summary.totalCaixaRecebido)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">├─ Contratos Fechados</span>
                <span className="font-medium text-foreground">{formatCents(summary.closedRevenueTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">├─ Pipeline Aberto</span>
                <span className="font-medium text-foreground">{formatCents(summary.pipelineAberto)}</span>
              </div>
              {totalMonthlyCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">├─ Custo Mensal</span>
                  <span className="font-medium text-destructive">{formatCents(totalMonthlyCost)}</span>
                </div>
              )}
              {summary.mrr > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">├─ MRR (Receita Recorrente)</span>
                  <span className="font-medium text-emerald-500">{formatCents(summary.mrr)}</span>
                </div>
              )}
              {summary.paybackMonths !== null && summary.faltaRecuperar > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">└─ Previsibilidade</span>
                  <span className="font-medium text-primary">{summary.paybackMonths.toFixed(1)} meses p/ ROI</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ──── PASSO 1: ATIVIDADES ──── */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <StepHeader
            step={1}
            title="Atividades do dia"
            desc="Registre quantas ações de vendas você fez hoje. Seu mentor acompanha sua consistência."
          />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ACTIVITY_TYPES.map(at => {
              const count = counters[at.value] || 0;
              const weekCount = activities
                .filter(a => a.type === at.value && isWithinInterval(new Date(a.activity_date + "T12:00:00"), { start: weekStart, end: weekEnd }))
                .reduce((s, a) => s + a.count, 0);

              return (
                <div key={at.value} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card">
                  <span className="text-lg">{at.emoji}</span>
                  <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">{at.label}</span>

                  {/* Stepper */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => dec(at.value)}
                      disabled={count === 0}
                      className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-lg font-bold text-foreground">{count}</span>
                    <button
                      onClick={() => inc(at.value)}
                      className="h-7 w-7 rounded-lg border border-primary/40 bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{weekCount} esta semana</span>
                </div>
              );
            })}
          </div>

          {hasCounters && (
            <Button
              className="w-full mt-4"
              onClick={saveAllActivities}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar atividades do dia
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ──── PASSO 2: DEALS ──── */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <StepHeader
            step={2}
            title="Algum deal novo ou atualizado?"
            desc="Cada pessoa que pode virar cliente é um deal. Mova para o estágio certo com 1 clique."
          />

          {loadingDeals ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : deals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Nenhum deal registrado ainda. Comece adicionando suas oportunidades de venda.</p>
              <Button size="sm" onClick={() => { setDealForm({ stage: "lead" }); setDealOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Criar primeiro deal
              </Button>
            </div>
          ) : (
            <>
              {/* Mini pipeline */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                {STAGES.filter(s => s.value !== "perdido").map((stage, i) => {
                  const count = deals.filter(d => d.stage === stage.value).length;
                  const StageIcon = stage.icon;
                  return (
                    <div key={stage.value} className="flex items-center">
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap ${count > 0 ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground"}`}>
                        <StageIcon className="h-3 w-3" />
                        {count}
                      </div>
                      {i < STAGES.length - 2 && <ChevronRight className="h-3 w-3 text-muted-foreground/30 mx-0.5 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Recent deals with quick stage change */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {deals.filter(d => d.stage !== "perdido").slice(0, 10).map(d => {
                  const stageInfo = STAGES.find(s => s.value === d.stage);
                  const stageIdx = STAGES.findIndex(s => s.value === d.stage);
                  const nextStage = stageIdx < STAGES.length - 2 ? STAGES[stageIdx + 1] : null;

                  return (
                    <div key={d.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/20 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{d.deal_name || "Deal"}</span>
                          <Badge variant="outline" className="text-[10px]">{stageInfo?.label}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatCents(d.value_cents)}</span>
                      </div>
                      {nextStage && d.stage !== "fechado" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] gap-1 shrink-0 text-primary hover:text-primary"
                          onClick={() => mutations.updateDeal.mutate({ id: d.id, stage: nextStage.value })}
                        >
                          <ChevronRight className="h-3 w-3" />
                          {nextStage.label.replace(" ✅", "")}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 shrink-0" onClick={() => mutations.deleteDeal.mutate(d.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setDealForm({ stage: "lead" }); setDealOpen(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Novo deal
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={syncFromCRM} disabled={syncing}>
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Sincronizar do CRM
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ──── PASSO 3: PAGAMENTOS ──── */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <StepHeader
            step={3}
            title="Recebeu algum pagamento?"
            desc="Quando receber de um cliente, registre aqui. Assim calculamos seu ROI real."
          />

          {payments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
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

          {payments.length > 0 && (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto mb-3">
              {payments.slice(0, 8).map(p => {
                const statusInfo = PAYMENT_STATUSES.find(s => s.value === p.status);
                return (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/20 group text-sm">
                    <div className={`h-6 w-6 rounded flex items-center justify-center shrink-0 ${p.status === "recebido" ? "bg-emerald-500/10" : p.status === "atrasado" ? "bg-red-500/10" : "bg-muted"}`}>
                      {p.status === "recebido" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
                       p.status === "atrasado" ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> :
                       <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{p.description || "Pagamento"}</span>
                      <span className="mx-2 font-medium">{formatCents(p.amount_cents)}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusInfo?.color}`}>{statusInfo?.label}</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 shrink-0" onClick={() => mutations.deletePayment.mutate(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Button size="sm" variant="outline" className="w-full" onClick={() => { setPayForm({ status: "recebido" }); setPayOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Registrar recebimento
          </Button>
        </CardContent>
      </Card>

      {/* ──── CUSTOS E INVESTIMENTO ──── */}
      <Collapsible open={costsOpen} onOpenChange={setCostsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Custos e Investimento</CardTitle>
                    <CardDescription className="text-xs">
                      Preencha seus custos mensais para calcular se o programa está se pagando.
                    </CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${costsOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Investimento do programa (somente leitura se veio do mentor) */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Investimento no Programa</p>
                  {investment && <Badge variant="outline" className="text-[10px]">Preenchido pelo mentor</Badge>}
                </div>
                <p className="text-xl font-bold text-foreground">
                  {investment ? formatCents(investment.investment_amount_cents) : "Não informado"}
                </p>
                {investment?.start_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Início: {format(new Date(investment.start_date + "T12:00:00"), "dd/MM/yyyy")}
                  </p>
                )}
              </div>

              {/* Custos editáveis */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">
                    Custo mensal de tráfego (R$)
                    <InfoTip text="Quanto você gasta por mês com anúncios pagos (Meta Ads, Google Ads, etc)." />
                  </Label>
                  <Input
                    type="number"
                    value={adsCost}
                    onChange={e => setAdsCost(e.target.value)}
                    placeholder="0"
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Custo mensal de equipe (R$)
                    <InfoTip text="Quanto você paga para colaboradores, freelancers ou equipe por mês." />
                  </Label>
                  <Input
                    type="number"
                    value={teamCost}
                    onChange={e => setTeamCost(e.target.value)}
                    placeholder="0"
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Outros custos mensais (R$)
                    <InfoTip text="Ferramentas, softwares, escritório ou outros custos operacionais mensais." />
                  </Label>
                  <Input
                    type="number"
                    value={otherCost}
                    onChange={e => setOtherCost(e.target.value)}
                    placeholder="0"
                    className="mt-1 h-9"
                  />
                </div>

                {/* Resumo de custos */}
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">Custo total mensal estimado</p>
                  <p className="text-lg font-bold text-primary">{formatCents(totalMonthlyCost)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Programa ({formatCents(investmentMonthly)}) + Tráfego ({formatCents(adsCents)}) + Equipe ({formatCents(teamCents)}) + Outros ({formatCents(otherCents)})
                  </p>
                </div>

                <Button size="sm" onClick={saveCosts} disabled={savingCosts} className="w-full">
                  {savingCosts ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Salvar custos
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ──── MODALS ──── */}

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
                <Label>Valor Total (R$) <InfoTip text="Valor total do contrato/venda." /></Label>
                <Input type="number" value={dealForm.value_cents ? dealForm.value_cents / 100 : ""} onChange={e => setDealForm(p => ({ ...p, value_cents: Math.round(parseFloat(e.target.value || "0") * 100) }))} placeholder="5000" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Parcelas <InfoTip text="Em quantas vezes o cliente vai pagar." /></Label>
                <Input type="number" value={dealForm.installments || ""} onChange={e => {
                  const inst = parseInt(e.target.value) || null;
                  setDealForm(p => {
                    const total = p.value_cents || 0;
                    const monthly = inst && inst > 0 ? Math.round(total / inst) : 0;
                    return { ...p, installments: inst, monthly_value_cents: monthly };
                  });
                }} placeholder="12" className="mt-1" />
              </div>
              <div>
                <Label>Valor Mensal (R$) <InfoTip text="Valor de cada parcela. Auto-calculado se parcelas preenchido." /></Label>
                <Input type="number" value={dealForm.monthly_value_cents ? dealForm.monthly_value_cents / 100 : ""} onChange={e => setDealForm(p => ({ ...p, monthly_value_cents: Math.round(parseFloat(e.target.value || "0") * 100) }))} placeholder="Auto" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fonte <InfoTip text="De onde veio esse lead: LinkedIn, indicação, tráfego pago, etc." /></Label>
                <Input value={dealForm.source || ""} onChange={e => setDealForm(p => ({ ...p, source: e.target.value }))} placeholder="linkedin, indicação..." className="mt-1" />
              </div>
              <div>
                <Label>Data Fechamento</Label>
                <Input type="date" value={dealForm.closed_at?.split("T")[0] || ""} onChange={e => setDealForm(p => ({ ...p, closed_at: e.target.value || null }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Observações de negociação <InfoTip text="Condições especiais, acordos, descontos, etc." /></Label>
              <Textarea value={dealForm.negotiation_notes || ""} onChange={e => setDealForm(p => ({ ...p, negotiation_notes: e.target.value }))} placeholder="Ex: Desconto de 10% se fechar até sexta..." className="mt-1" rows={2} />
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

      {/* Payment modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
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
                <Label>Status</Label>
                <Select value={payForm.status || "recebido"} onValueChange={v => setPayForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={payForm.due_date || ""} onChange={e => setPayForm(p => ({ ...p, due_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Pago em</Label>
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
