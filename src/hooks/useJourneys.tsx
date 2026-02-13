import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Journey {
  id: string;
  tenant_id: string;
  name: string;
  total_days: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useJourneys(tenantId?: string) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) {
      setJourneys([]);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("cs_journeys" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setJourneys((data as any[] || []) as Journey[]);
    } catch (err) {
      console.error("Error loading journeys:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const createJourney = async (name: string, totalDays = 365): Promise<Journey | null> => {
    if (!tenantId) return null;
    try {
      const isFirst = journeys.length === 0;
      const { data, error } = await (supabase.from("cs_journeys" as any) as any)
        .insert({ tenant_id: tenantId, name, total_days: totalDays, is_default: isFirst })
        .select()
        .single();
      if (error) throw error;
      await load();
      return data as Journey;
    } catch (err) {
      console.error("Error creating journey:", err);
      return null;
    }
  };

  const updateJourney = async (id: string, updates: Partial<Pick<Journey, "name" | "total_days" | "is_default">>) => {
    try {
      const { error } = await (supabase.from("cs_journeys" as any) as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error("Error updating journey:", err);
    }
  };

  const deleteJourney = async (id: string) => {
    try {
      const { error } = await (supabase.from("cs_journeys" as any) as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error("Error deleting journey:", err);
    }
  };

  const assignMentee = async (membershipId: string, journeyId: string) => {
    if (!tenantId) return;
    try {
      const { error } = await (supabase.from("mentee_journey_assignments" as any) as any)
        .upsert({
          membership_id: membershipId,
          journey_id: journeyId,
          tenant_id: tenantId,
        }, { onConflict: "membership_id,journey_id" });
      if (error) throw error;
    } catch (err) {
      console.error("Error assigning mentee:", err);
    }
  };

  const getAssignments = async (journeyId: string): Promise<string[]> => {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from("mentee_journey_assignments" as any)
        .select("membership_id")
        .eq("journey_id", journeyId);
      if (error) throw error;
      return ((data as any[]) || []).map((d: any) => d.membership_id);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      return [];
    }
  };

  return {
    journeys,
    isLoading,
    reload: load,
    createJourney,
    updateJourney,
    deleteJourney,
    assignMentee,
    getAssignments,
  };
}
