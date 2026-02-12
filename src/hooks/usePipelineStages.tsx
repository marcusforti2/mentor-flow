import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineStage {
  id?: string;
  tenant_id?: string;
  name: string;
  status_key: string;
  color: string;
  position: number;
}

const DEFAULT_STAGES: PipelineStage[] = [
  { name: "Novos", status_key: "new", color: "bg-slate-500", position: 0 },
  { name: "Contato", status_key: "contacted", color: "bg-blue-500", position: 1 },
  { name: "Reunião", status_key: "meeting_scheduled", color: "bg-amber-500", position: 2 },
  { name: "Proposta", status_key: "proposal_sent", color: "bg-purple-500", position: 3 },
  { name: "Fechados", status_key: "closed_won", color: "bg-green-500", position: 4 },
  { name: "Perdidos", status_key: "closed_lost", color: "bg-red-500", position: 5 },
];

export function usePipelineStages(tenantId?: string) {
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      setStages(DEFAULT_STAGES);
      setIsLoading(false);
      return;
    }
    loadStages();
  }, [tenantId]);

  const loadStages = async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from("crm_pipeline_stages")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("position", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setStages(data as PipelineStage[]);
        setIsCustom(true);
      } else {
        setStages(DEFAULT_STAGES);
        setIsCustom(false);
      }
    } catch (error) {
      console.error("Error loading pipeline stages:", error);
      setStages(DEFAULT_STAGES);
    } finally {
      setIsLoading(false);
    }
  };

  const statusConfigMap = stages.reduce((acc, stage) => {
    acc[stage.status_key] = { label: stage.name, color: stage.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return { stages, isLoading, isCustom, reload: loadStages, statusConfigMap, DEFAULT_STAGES };
}
