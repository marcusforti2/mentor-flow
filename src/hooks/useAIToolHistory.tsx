import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AIToolHistoryEntry {
  id: string;
  tool_type: string;
  title: string | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  output_text: string | null;
  created_at: string;
}

export function useAIToolHistory(membershipId: string | null, toolType: string) {
  const [history, setHistory] = useState<AIToolHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!membershipId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_tool_history")
        .select("id, tool_type, title, input_data, output_data, output_text, created_at")
        .eq("membership_id", membershipId)
        .eq("tool_type", toolType)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setHistory((data || []) as AIToolHistoryEntry[]);
    } catch (err) {
      console.error("Error fetching AI tool history:", err);
    } finally {
      setLoading(false);
    }
  }, [membershipId, toolType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const saveToHistory = useCallback(
    async (params: {
      title?: string;
      inputData?: Record<string, unknown>;
      outputData?: Record<string, unknown>;
      outputText?: string;
    }) => {
      if (!membershipId) return;
      try {
        // Resolve tenant_id
        const { data: membership } = await supabase
          .from("memberships")
          .select("tenant_id")
          .eq("id", membershipId)
          .maybeSingle();
        if (!membership) return;

        await supabase.from("ai_tool_history").insert([{
          membership_id: membershipId,
          tenant_id: membership.tenant_id,
          tool_type: toolType,
          title: params.title || null,
          input_data: (params.inputData || {}) as any,
          output_data: (params.outputData || {}) as any,
          output_text: params.outputText || null,
        }]);

        await fetchHistory();
      } catch (err) {
        console.error("Error saving AI tool history:", err);
      }
    },
    [membershipId, toolType, fetchHistory]
  );

  return { history, loading, saveToHistory, refetch: fetchHistory };
}
