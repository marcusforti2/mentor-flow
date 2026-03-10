import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CrmStageAutomation {
  id: string;
  tenant_id: string;
  membership_id: string;
  from_stage_key: string;
  to_stage_key: string;
  delay_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCrmAutomations(membershipId?: string, tenantId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["crm-stage-automations", membershipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_stage_automations")
        .select("*")
        .eq("membership_id", membershipId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as CrmStageAutomation[];
    },
    enabled: !!membershipId,
  });

  const createAutomation = useMutation({
    mutationFn: async (input: {
      from_stage_key: string;
      to_stage_key: string;
      delay_days: number;
    }) => {
      if (!membershipId || !tenantId) throw new Error("Missing IDs");
      const { data, error } = await supabase
        .from("crm_stage_automations")
        .insert({
          tenant_id: tenantId,
          membership_id: membershipId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stage-automations"] });
      toast({ title: "Automação criada! ✓" });
    },
    onError: () => {
      toast({ title: "Erro ao criar automação", variant: "destructive" });
    },
  });

  const updateAutomation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CrmStageAutomation> }) => {
      const { error } = await supabase
        .from("crm_stage_automations")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stage-automations"] });
    },
  });

  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_stage_automations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stage-automations"] });
      toast({ title: "Automação removida! ✓" });
    },
  });

  return { automations, isLoading, createAutomation, updateAutomation, deleteAutomation };
}
