import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, DollarSign, Handshake, Activity, CreditCard } from "lucide-react";
import { useInvestment, useDeals, useActivities, usePayments, useMetricsMutations, formatCents, type MenteeDeal, type MenteePayment } from "@/hooks/useMetrics";
import { format } from "date-fns";

const STAGES = [
  { value: "lead", label: "Lead" },
  { value: "conversa", label: "Conversa" },
  { value: "reuniao_marcada", label: "Reunião Marcada" },
  { value: "reuniao_feita", label: "Reunião Feita" },
  { value: "proposta", label: "Proposta" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
];

const ACTIVITY_TYPES = [
  { value: "msg_enviada", label: "Mensagem Enviada" },
  { value: "ligacao", label: "Ligação" },
  { value: "followup", label: "Follow-up" },
  { value: "reuniao", label: "Reunião" },
  { value: "proposta", label: "Proposta" },
];

const PAYMENT_STATUSES = [
  { value: "recebido", label: "Recebido" },
  { value: "pendente", label: "Pendente" },
  { value: "atrasado", label: "Atrasado" },
  { value: "estornado", label: "Estornado" },
];

const Metricas = () => {
  const { activeMembership } = useTenant();
  const membershipId = activeMembership?.id;
  const tenantId = activeMembership?.tenant_id;

  const { data: investment, isLoading: loadingInv } = useInvestment(membershipId);
  const { data: deals = [], isLoading: loadingDeals } = useDeals(membershipId);
  const { data: activities = [], isLoading: loadingAct } = useActivities(membershipId);
  const { data: payments = [], isLoading: loadingPay } = usePayments(membershipId);

  const mutations = useMetricsMutations(membershipId || "", tenantId || "");

  // Investment form state
  const [invAmount, setInvAmount] = useState("");
  const [invStart, setInvStart] = useState("");
  const [invOnboard, setInvOnboard] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [invEditing, setInvEditing] = useState(false);

  // Deal modal
  const [dealOpen, setDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState<Partial<MenteeDeal>>({});

  // Activity modal
  const [actOpen, setActOpen] = useState(false);
  const [actForm, setActForm] = useState({ type: "msg_enviada", count: 1, activity_date: format(new Date(), "yyyy-MM-dd") });

  // Payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState<Partial<MenteePayment>>({});

  if (!membershipId || !tenantId) return null;

  const initInvForm = () => {
    if (investment) {
      setInvAmount(String(investment.investment_amount_cents / 100));
      setInvStart(investment.start_date || "");
      setInvOnboard(investment.onboarding_date || "");
      setInvNotes(investment.notes || "");
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
    <div className="max-w-[1000px] mx-auto space-y-6 p-4">
      <h1 className="text-2xl font-display font-bold text-foreground">Minhas Métricas</h1>

      <Tabs defaultValue="investimento">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="investimento"><DollarSign className="h-4 w-4 mr-1.5 hidden sm:inline" />Investimento</TabsTrigger>
          <TabsTrigger value="deals"><Handshake className="h-4 w-4 mr-1.5 hidden sm:inline" />Deals</TabsTrigger>
          <TabsTrigger value="atividades"><Activity className="h-4 w-4 mr-1.5 hidden sm:inline" />Atividades</TabsTrigger>
          <TabsTrigger value="caixa"><CreditCard className="h-4 w-4 mr-1.5 hidden sm:inline" />Caixa</TabsTrigger>
        </TabsList>

        {/* INVESTIMENTO */}
        <TabsContent value="investimento" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Investimento no Programa</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInv ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
                !invEditing ? (
                  <div className="space-y-3">
                    {investment ? (
                      <>
                        <p className="text-2xl font-bold text-primary">{formatCents(investment.investment_amount_cents)}</p>
                        {investment.start_date && <p className="text-sm text-muted-foreground">Início: {investment.start_date}</p>}
                        {investment.onboarding_date && <p className="text-sm text-muted-foreground">Onboarding: {investment.onboarding_date}</p>}
                        {investment.notes && <p className="text-sm text-muted-foreground">{investment.notes}</p>}
                      </>
                    ) : <p className="text-muted-foreground">Nenhum investimento registrado.</p>}
                    <Button size="sm" onClick={initInvForm}>{investment ? "Editar" : "Registrar Investimento"}</Button>
                  </div>
                ) : (
                  <div className="grid gap-3 max-w-md">
                    <div><Label>Valor (R$)</Label><Input type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)} placeholder="60000" /></div>
                    <div><Label>Data de Início</Label><Input type="date" value={invStart} onChange={e => setInvStart(e.target.value)} /></div>
                    <div><Label>Data de Onboarding</Label><Input type="date" value={invOnboard} onChange={e => setInvOnboard(e.target.value)} /></div>
                    <div><Label>Notas</Label><Textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveInvestment} disabled={mutations.upsertInvestment.isPending}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setInvEditing(false)}>Cancelar</Button>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEALS */}
        <TabsContent value="deals" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pipeline de Deals</CardTitle>
              <Button size="sm" onClick={() => { setDealForm({}); setDealOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo Deal</Button>
            </CardHeader>
            <CardContent>
              {loadingDeals ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : deals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum deal registrado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Fonte</TableHead>
                        <TableHead>Criado</TableHead>
                        <TableHead>Fechado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.deal_name || "—"}</TableCell>
                          <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{STAGES.find(s => s.value === d.stage)?.label || d.stage}</span></TableCell>
                          <TableCell>{formatCents(d.value_cents)}</TableCell>
                          <TableCell>{d.source || "—"}</TableCell>
                          <TableCell className="text-xs">{format(new Date(d.created_at), "dd/MM/yy")}</TableCell>
                          <TableCell className="text-xs">{d.closed_at ? format(new Date(d.closed_at), "dd/MM/yy") : "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => mutations.deleteDeal.mutate(d.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={dealOpen} onOpenChange={setDealOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Deal</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Nome</Label><Input value={dealForm.deal_name || ""} onChange={e => setDealForm(p => ({ ...p, deal_name: e.target.value }))} /></div>
                <div><Label>Stage</Label>
                  <Select value={dealForm.stage || "lead"} onValueChange={v => setDealForm(p => ({ ...p, stage: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Valor (R$)</Label><Input type="number" value={dealForm.value_cents ? dealForm.value_cents / 100 : ""} onChange={e => setDealForm(p => ({ ...p, value_cents: Math.round(parseFloat(e.target.value || "0") * 100) }))} /></div>
                <div><Label>Fonte</Label><Input value={dealForm.source || ""} onChange={e => setDealForm(p => ({ ...p, source: e.target.value }))} placeholder="linkedin, indicação..." /></div>
                <div><Label>Data Fechamento</Label><Input type="date" value={dealForm.closed_at?.split("T")[0] || ""} onChange={e => setDealForm(p => ({ ...p, closed_at: e.target.value || null }))} /></div>
              </div>
              <DialogFooter>
                <Button onClick={() => { mutations.createDeal.mutate(dealForm, { onSuccess: () => setDealOpen(false) }); }} disabled={mutations.createDeal.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ATIVIDADES */}
        <TabsContent value="atividades" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Atividades Comerciais</CardTitle>
              <Button size="sm" onClick={() => { setActForm({ type: "msg_enviada", count: 1, activity_date: format(new Date(), "yyyy-MM-dd") }); setActOpen(true); }}><Plus className="h-4 w-4 mr-1" />Registrar</Button>
            </CardHeader>
            <CardContent>
              {loadingAct ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>{ACTIVITY_TYPES.find(t => t.value === a.type)?.label || a.type}</TableCell>
                          <TableCell>{a.count}</TableCell>
                          <TableCell>{a.activity_date}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => mutations.deleteActivity.mutate(a.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={actOpen} onOpenChange={setActOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Atividade</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Tipo</Label>
                  <Select value={actForm.type} onValueChange={v => setActForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ACTIVITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Quantidade</Label><Input type="number" min={1} value={actForm.count} onChange={e => setActForm(p => ({ ...p, count: parseInt(e.target.value) || 1 }))} /></div>
                <div><Label>Data</Label><Input type="date" value={actForm.activity_date} onChange={e => setActForm(p => ({ ...p, activity_date: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button onClick={() => { mutations.createActivity.mutate(actForm, { onSuccess: () => setActOpen(false) }); }} disabled={mutations.createActivity.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* CAIXA */}
        <TabsContent value="caixa" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Caixa (Pagamentos)</CardTitle>
              <Button size="sm" onClick={() => { setPayForm({}); setPayOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo Pagamento</Button>
            </CardHeader>
            <CardContent>
              {loadingPay ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento registrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Pago em</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{p.description || "—"}</TableCell>
                          <TableCell>{formatCents(p.amount_cents)}</TableCell>
                          <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "recebido" ? "bg-emerald-500/20 text-emerald-400" : p.status === "atrasado" ? "bg-red-500/20 text-red-400" : "bg-muted"}`}>{PAYMENT_STATUSES.find(s => s.value === p.status)?.label || p.status}</span></TableCell>
                          <TableCell className="text-xs">{p.due_date || "—"}</TableCell>
                          <TableCell className="text-xs">{p.paid_at || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => mutations.deletePayment.mutate(p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Pagamento</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Descrição</Label><Input value={payForm.description || ""} onChange={e => setPayForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div><Label>Valor (R$)</Label><Input type="number" value={payForm.amount_cents ? payForm.amount_cents / 100 : ""} onChange={e => setPayForm(p => ({ ...p, amount_cents: Math.round(parseFloat(e.target.value || "0") * 100) }))} /></div>
                <div><Label>Status</Label>
                  <Select value={payForm.status || "pendente"} onValueChange={v => setPayForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Vencimento</Label><Input type="date" value={payForm.due_date || ""} onChange={e => setPayForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                <div><Label>Data Pagamento</Label><Input type="date" value={payForm.paid_at || ""} onChange={e => setPayForm(p => ({ ...p, paid_at: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button onClick={() => { mutations.createPayment.mutate(payForm, { onSuccess: () => setPayOpen(false) }); }} disabled={mutations.createPayment.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Metricas;
