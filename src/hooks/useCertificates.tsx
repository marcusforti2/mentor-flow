import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface Certificate {
  id: string;
  trail_id: string;
  membership_id: string;
  certificate_url: string | null;
  issued_at: string;
  trail_title?: string;
  trail_thumbnail?: string;
}

export function useCertificates() {
  const { activeMembership } = useTenant();
  const membershipId = activeMembership?.id ?? null;
  const queryClient = useQueryClient();

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["certificates", membershipId],
    queryFn: async () => {
      if (!membershipId) return [];
      const { data, error } = await supabase
        .from("certificates")
        .select("id, trail_id, membership_id, certificate_url, issued_at")
        .eq("membership_id", membershipId)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data as Certificate[];
    },
    enabled: !!membershipId,
  });

  // Enrich certificates with trail info
  const { data: enrichedCertificates = [] } = useQuery({
    queryKey: ["certificates-enriched", certificates.map((c) => c.trail_id).join(",")],
    queryFn: async () => {
      if (certificates.length === 0) return [];
      const trailIds = [...new Set(certificates.map((c) => c.trail_id))];
      const { data: trails } = await supabase
        .from("trails")
        .select("id, title, thumbnail_url")
        .in("id", trailIds);
      const trailMap = new Map(trails?.map((t) => [t.id, t]) || []);
      return certificates.map((cert) => ({
        ...cert,
        trail_title: trailMap.get(cert.trail_id)?.title || "Trilha",
        trail_thumbnail: trailMap.get(cert.trail_id)?.thumbnail_url || "",
      }));
    },
    enabled: certificates.length > 0,
  });

  const hasCertificate = (trailId: string) =>
    certificates.some((c) => c.trail_id === trailId);

  const issueCertificate = useMutation({
    mutationFn: async (trailId: string) => {
      if (!membershipId) throw new Error("No membership");
      // Check if already issued
      const { data: existing } = await supabase
        .from("certificates")
        .select("id")
        .eq("membership_id", membershipId)
        .eq("trail_id", trailId)
        .maybeSingle();
      if (existing) return existing;

      const { data, error } = await supabase
        .from("certificates")
        .insert({ membership_id: membershipId, trail_id: trailId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });

  // Check if trail is 100% complete
  const checkTrailCompletion = async (trailId: string): Promise<boolean> => {
    if (!membershipId) return false;
    // Get all lessons for trail
    const { data: modules } = await supabase
      .from("trail_modules")
      .select("id")
      .eq("trail_id", trailId);
    if (!modules || modules.length === 0) return false;

    const moduleIds = modules.map((m) => m.id);
    const { data: lessons } = await supabase
      .from("trail_lessons")
      .select("id")
      .in("module_id", moduleIds);
    if (!lessons || lessons.length === 0) return false;

    const lessonIds = lessons.map((l) => l.id);
    const { data: progress } = await supabase
      .from("trail_progress")
      .select("lesson_id")
      .eq("membership_id", membershipId)
      .eq("completed", true)
      .in("lesson_id", lessonIds);

    return (progress?.length || 0) >= lessonIds.length;
  };

  return {
    certificates: enrichedCertificates.length > 0 ? enrichedCertificates : certificates,
    isLoading,
    hasCertificate,
    issueCertificate,
    checkTrailCompletion,
  };
}
