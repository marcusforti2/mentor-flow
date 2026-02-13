import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export interface JourneyStage {
  id?: string;
  tenant_id?: string;
  name: string;
  stage_key: string;
  day_start: number;
  day_end: number;
  color: string;
  position: number;
}

export const DEFAULT_JOURNEY_STAGES: JourneyStage[] = [
  { name: "Onboarding", stage_key: "onboarding", day_start: 0, day_end: 7, color: "bg-blue-500", position: 0 },
  { name: "Aprendizado", stage_key: "learning", day_start: 8, day_end: 30, color: "bg-purple-500", position: 1 },
  { name: "Aplicação", stage_key: "applying", day_start: 31, day_end: 90, color: "bg-amber-500", position: 2 },
  { name: "Escala", stage_key: "scaling", day_start: 91, day_end: 180, color: "bg-green-500", position: 3 },
  { name: "Maestria", stage_key: "mastery", day_start: 181, day_end: 365, color: "bg-rose-500", position: 4 },
];

export function useJourneyStages(tenantId?: string) {
  const [stages, setStages] = useState<JourneyStage[]>(DEFAULT_JOURNEY_STAGES);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustom, setIsCustom] = useState(false);

  const loadStages = useCallback(async () => {
    if (!tenantId) {
      setStages(DEFAULT_JOURNEY_STAGES);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("cs_journey_stages" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("position", { ascending: true });

      if (error) throw error;

      if (data && (data as any[]).length > 0) {
        const mapped = (data as any[]).map((s: any) => ({
          id: s.id,
          tenant_id: s.tenant_id,
          name: s.name,
          stage_key: s.stage_key,
          day_start: s.day_start,
          day_end: s.day_end,
          color: s.color,
          position: s.position,
        }));
        setStages(mapped);
        setIsCustom(true);
      } else {
        setStages(DEFAULT_JOURNEY_STAGES);
        setIsCustom(false);
      }
    } catch (error) {
      console.error("Error loading journey stages:", error);
      setStages(DEFAULT_JOURNEY_STAGES);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const getStageForDay = useCallback(
    (joinedAt: string | null): JourneyStage => {
      if (!joinedAt) return stages[0];
      const days = differenceInDays(new Date(), new Date(joinedAt));
      return stages.find((s) => days >= s.day_start && days <= s.day_end) || stages[stages.length - 1];
    },
    [stages]
  );

  const getJourneyDay = useCallback((joinedAt: string | null): number => {
    if (!joinedAt) return 0;
    return differenceInDays(new Date(), new Date(joinedAt));
  }, []);

  return {
    stages,
    isLoading,
    isCustom,
    reload: loadStages,
    getStageForDay,
    getJourneyDay,
    DEFAULT_STAGES: DEFAULT_JOURNEY_STAGES,
  };
}
