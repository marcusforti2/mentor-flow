import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type DateRange = { from: Date; to: Date };

// ---- Types ----
export interface ProgramInvestment {
  id: string;
  membership_id: string;
  tenant_id: string;
  investment_amount_cents: number;
  start_date: string | null;
  onboarding_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface MenteeDeal {
  id: string;
  membership_id: string;
  tenant_id: string;
  stage: string;
  value_cents: number;
  source: string | null;
  deal_name: string | null;
  created_at: string;
  closed_at: string | null;
  lost_reason: string | null;
}

export interface MenteeActivity {
  id: string;
  membership_id: string;
  tenant_id: string;
  type: string;
  count: number;
  activity_date: string;
  created_at: string;
}

export interface MenteePayment {
  id: string;
  membership_id: string;
  tenant_id: string;
  amount_cents: number;
  status: string;
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

// ---- Helpers ----
const toISO = (d: Date) => d.toISOString();
const toDateStr = (d: Date) => d.toISOString().split("T")[0];

export function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function getPresetRange(preset: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let from: Date;
  switch (preset) {
    case "7d":
      from = new Date(today); from.setDate(from.getDate() - 7); break;
    case "30d":
      from = new Date(today); from.setDate(from.getDate() - 30); break;
    case "90d":
      from = new Date(today); from.setDate(from.getDate() - 90); break;
    case "MTD":
      from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "YTD":
      from = new Date(now.getFullYear(), 0, 1); break;
    default:
      from = new Date(today); from.setDate(from.getDate() - 30);
  }
  return { from, to: today };
}

// ---- Queries ----
export function useInvestment(membershipId: string | undefined) {
  return useQuery({
    queryKey: ["metrics-investment", membershipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_investments")
        .select("*")
        .eq("membership_id", membershipId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ProgramInvestment | null;
    },
    enabled: !!membershipId,
  });
}

export function useDeals(membershipId: string | undefined, range?: DateRange) {
  return useQuery({
    queryKey: ["metrics-deals", membershipId, range?.from?.toISOString(), range?.to?.toISOString()],
    queryFn: async () => {
      let q = supabase.from("mentee_deals").select("*").eq("membership_id", membershipId!);
      // No date filter here — we fetch all and filter in the component for flexibility
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MenteeDeal[];
    },
    enabled: !!membershipId,
  });
}

export function useActivities(membershipId: string | undefined) {
  return useQuery({
    queryKey: ["metrics-activities", membershipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentee_activities")
        .select("*")
        .eq("membership_id", membershipId!)
        .order("activity_date", { ascending: false });
      if (error) throw error;
      return (data || []) as MenteeActivity[];
    },
    enabled: !!membershipId,
  });
}

export function usePayments(membershipId: string | undefined) {
  return useQuery({
    queryKey: ["metrics-payments", membershipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentee_payments")
        .select("*")
        .eq("membership_id", membershipId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MenteePayment[];
    },
    enabled: !!membershipId,
  });
}

// ---- Mutations ----
export function useMetricsMutations(membershipId: string, tenantId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const onError = (err: any) => {
    toast({ title: "Erro", description: err.message, variant: "destructive" });
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["metrics-investment", membershipId] });
    qc.invalidateQueries({ queryKey: ["metrics-deals", membershipId] });
    qc.invalidateQueries({ queryKey: ["metrics-activities", membershipId] });
    qc.invalidateQueries({ queryKey: ["metrics-payments", membershipId] });
  };

  const upsertInvestment = useMutation({
    mutationFn: async (input: { id?: string; investment_amount_cents: number; start_date?: string; onboarding_date?: string; notes?: string }) => {
      if (input.id) {
        const { error } = await supabase.from("program_investments").update({
          investment_amount_cents: input.investment_amount_cents,
          start_date: input.start_date || null,
          onboarding_date: input.onboarding_date || null,
          notes: input.notes || null,
        }).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("program_investments").insert({
          membership_id: membershipId,
          tenant_id: tenantId,
          investment_amount_cents: input.investment_amount_cents,
          start_date: input.start_date || null,
          onboarding_date: input.onboarding_date || null,
          notes: input.notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Investimento salvo" }); },
    onError,
  });

  const createDeal = useMutation({
    mutationFn: async (input: Partial<MenteeDeal>) => {
      const { error } = await supabase.from("mentee_deals").insert({
        membership_id: membershipId,
        tenant_id: tenantId,
        deal_name: input.deal_name || null,
        stage: input.stage || "lead",
        value_cents: input.value_cents || 0,
        source: input.source || null,
        closed_at: input.closed_at || null,
        lost_reason: input.lost_reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Deal criado" }); },
    onError,
  });

  const updateDeal = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<MenteeDeal> & { id: string }) => {
      const { error } = await supabase.from("mentee_deals").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Deal atualizado" }); },
    onError,
  });

  const deleteDeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentee_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Deal removido" }); },
    onError,
  });

  const createActivity = useMutation({
    mutationFn: async (input: { type: string; count: number; activity_date: string }) => {
      const { error } = await supabase.from("mentee_activities").insert({
        membership_id: membershipId,
        tenant_id: tenantId,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Atividade registrada" }); },
    onError,
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentee_activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Atividade removida" }); },
    onError,
  });

  const createPayment = useMutation({
    mutationFn: async (input: Partial<MenteePayment>) => {
      const { error } = await supabase.from("mentee_payments").insert({
        membership_id: membershipId,
        tenant_id: tenantId,
        amount_cents: input.amount_cents || 0,
        status: input.status || "pendente",
        description: input.description || null,
        due_date: input.due_date || null,
        paid_at: input.paid_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Pagamento registrado" }); },
    onError,
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<MenteePayment> & { id: string }) => {
      const { error } = await supabase.from("mentee_payments").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Pagamento atualizado" }); },
    onError,
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentee_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Pagamento removido" }); },
    onError,
  });

  return {
    upsertInvestment,
    createDeal, updateDeal, deleteDeal,
    createActivity, deleteActivity,
    createPayment, updatePayment, deletePayment,
  };
}
