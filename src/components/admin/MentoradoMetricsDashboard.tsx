import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Handshake, Users, Percent, AlertTriangle, BarChart3 } from "lucide-react";
import { useInvestment, useDeals, useActivities, usePayments, formatCents, getPresetRange, type DateRange } from "@/hooks/useMetrics";
import { format, differenceInDays, isWithinInterval, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, Cell, FunnelChart } from "recharts";

const PRESETS = ["7d", "30d", "90d", "MTD", "YTD"] as const;

const STAGES_ORDER = ["lead", "conversa", "reuniao_marcada", "reuniao_feita", "proposta", "fechado", "perdido"];
const STAGE_LABELS: Record<string, string> = {
  lead: "Lead", conversa: "Conversa", reuniao_marcada: "Reunião Marcada",
  reuniao_feita: "Reunião Feita", proposta: "Proposta", fechado: "Fechado", perdido: "Perdido",
};
const STAGE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444"];

const ACTIVITY_LABELS: Record<string, string> = {
  msg_enviada: "Mensagens", ligacao: "Ligações", followup: "Follow-ups", reuniao: "Reuniões", proposta: "Propostas",
};

interface Props {
  membershipId: string;
  tenantId: string;
}

export function MentoradoMetricsDashboard({ membershipId, tenantId }: Props) {
  const [preset, setPreset] = useState<string>("30d");
  const [useCashForROI, setUseCashForROI] = useState(false);

  const range = useMemo(() => getPresetRange(preset), [preset]);

  const { data: investment, isLoading: l1 } = useInvestment(membershipId);
  const { data: allDeals = [], isLoading: l2 } = useDeals(membershipId);
  const { data: allActivities = [], isLoading: l3 } = useActivities(membershipId);
  const { data: allPayments = [], isLoading: l4 } = usePayments(membershipId);

  const isLoading = l1 || l2 || l3 || l4;

  // Filter data by range
  const inRange = (dateStr: string | null) => {
    if (!dateStr) return false;
    try {
      const d = parseISO(dateStr);
      return isWithinInterval(d, { start: range.from, end: range.to });
    } catch { return false; }
  };

  const deals = useMemo(() => allDeals.filter(d => inRange(d.created_at)), [allDeals, range]);
  const closedDeals = useMemo(() => allDeals.filter(d => d.stage === "fechado" && inRange(d.closed_at)), [allDeals, range]);
  const activities = useMemo(() => allActivities.filter(a => inRange(a.activity_date)), [allActivities, range]);
  const payments = useMemo(() => allPayments.filter(p => inRange(p.paid_at) || inRange(p.due_date)), [allPayments, range]);

  // KPIs
  const revenueClosed = closedDeals.reduce((s, d) => s + d.value_cents, 0);
  const cashReceived = payments.filter(p => p.status === "recebido" && inRange(p.paid_at)).reduce((s, p) => s + p.amount_cents, 0);
  const meetingsCount = activities.filter(a => a.type === "reuniao").reduce((s, a) => s + a.count, 0);
  const conversionRate = meetingsCount > 0 ? (closedDeals.length / meetingsCount) * 100 : 0;

  const periodDays = Math.max(1, differenceInDays(range.to, range.from));

  // ROI with operational costs
  const investmentCents = investment?.investment_amount_cents || 0;
  const adsCost = investment?.monthly_ads_cost_cents || 0;
  const teamCost = investment?.monthly_team_cost_cents || 0;
  const otherCost = investment?.monthly_other_cost_cents || 0;
  const resultCents = useCashForROI ? cashReceived : revenueClosed;
  const totalInvestment = investmentCents + (adsCost + teamCost + otherCost) * Math.max(1, Math.ceil(periodDays / 30));
  const roi = totalInvestment > 0 ? ((resultCents - totalInvestment) / totalInvestment) * 100 : 0;
  const monthlyAvg = resultCents * (30 / periodDays);
  const paybackMonths = monthlyAvg > 0 ? totalInvestment / monthlyAvg : Infinity;

  // Charts data
  const revenueByWeek = useMemo(() => {
    if (closedDeals.length === 0) return [];
    const weeks = eachWeekOfInterval({ start: range.from, end: range.to }, { weekStartsOn: 1 });
    return weeks.map(ws => {
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const total = closedDeals
        .filter(d => d.closed_at && isWithinInterval(parseISO(d.closed_at), { start: ws, end: we }))
        .reduce((s, d) => s + d.value_cents, 0);
      return { week: format(ws, "dd/MM", { locale: ptBR }), value: total / 100 };
    });
  }, [closedDeals, range]);

  const funnelData = useMemo(() => {
    return STAGES_ORDER.filter(s => s !== "perdido").map((stage, i) => ({
      name: STAGE_LABELS[stage],
      value: allDeals.filter(d => d.stage === stage).length,
      fill: STAGE_COLORS[i],
    }));
  }, [allDeals]);

  const activityByType = useMemo(() => {
    const map: Record<string, number> = {};
    activities.forEach(a => { map[a.type] = (map[a.type] || 0) + a.count; });
    return Object.entries(map).map(([type, count]) => ({ type: ACTIVITY_LABELS[type] || type, count }));
  }, [activities]);

  // Alerts
  const alerts: { message: string; variant: "warning" | "destructive" | "info" }[] = [];
  if (meetingsCount > 0 && closedDeals.length === 0) {
    alerts.push({ message: "Muita conversa, pouca decisão. Rever oferta e follow-up.", variant: "warning" });
  }
  if (revenueClosed > 0 && cashReceived < revenueClosed * 0.3) {
    alerts.push({ message: "Caixa não acompanha venda. Revisar cobrança e condições.", variant: "warning" });
  }
  if (investmentCents > 0 && roi < 0) {
    alerts.push({ message: "Ainda não pagou o investimento. Prioridade: vendas e caixa.", variant: "destructive" });
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => setPreset(p)}>{p}</Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Receita Fechada" value={formatCents(revenueClosed)} trend={revenueClosed > 0} />
        <KPICard icon={DollarSign} label="Caixa Recebido" value={formatCents(cashReceived)} trend={cashReceived > 0} />
        <KPICard icon={Users} label="Reuniões" value={String(meetingsCount)} />
        <KPICard icon={Percent} label="Conversão" value={`${conversionRate.toFixed(1)}%`} trend={conversionRate > 20} />
      </div>

      {/* ROI Block */}
      {investmentCents > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Retorno do Programa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Investimento</p>
                <p className="text-lg font-bold">{formatCents(investmentCents)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Resultado</p>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="roi-toggle" className="text-[10px] text-muted-foreground">Caixa</Label>
                    <Switch id="roi-toggle" checked={useCashForROI} onCheckedChange={setUseCashForROI} className="scale-75" />
                  </div>
                </div>
                <p className="text-lg font-bold">{formatCents(resultCents)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className={`text-lg font-bold ${roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>{roi.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payback</p>
                <p className="text-lg font-bold">{paybackMonths === Infinity ? "∞" : `${paybackMonths.toFixed(1)} meses`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Line Chart */}
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm">Receita Fechada por Semana</CardTitle></CardHeader>
          <CardContent>
            {revenueByWeek.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenueByWeek}>
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip formatter={(v: number) => formatCents(v * 100)} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>}
          </CardContent>
        </Card>

        {/* Funnel / Bar for pipeline */}
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm">Funil de Pipeline</CardTitle></CardHeader>
          <CardContent>
            {funnelData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <ReTooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sem deals cadastrados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Activity chart */}
      {activityByType.length > 0 && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm">Atividades Comerciais no Período</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityByType}>
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ReTooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${a.variant === "destructive" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${a.variant === "destructive" ? "text-red-400" : "text-amber-400"}`} />
              <p className="text-sm">{a.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Detail Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm">Deals no Período ({deals.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.slice(0, 10).map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">{d.deal_name || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{STAGE_LABELS[d.stage] || d.stage}</Badge></TableCell>
                    <TableCell className="text-sm">{formatCents(d.value_cents)}</TableCell>
                  </TableRow>
                ))}
                {deals.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem deals</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm">Pagamentos no Período ({payments.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 10).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.description || "—"}</TableCell>
                    <TableCell className="text-sm">{formatCents(p.amount_cents)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem pagamentos</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, trend }: { icon: any; label: string; value: string; trend?: boolean }) {
  return (
    <Card className="glass-card">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {trend !== undefined && (trend ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />)}
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
