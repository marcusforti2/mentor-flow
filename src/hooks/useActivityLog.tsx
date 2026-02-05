import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ActivityType = 
  | 'lead_created'
  | 'lead_status_changed'
  | 'lesson_completed'
  | 'trail_started'
  | 'trail_completed'
  | 'file_uploaded'
  | 'meeting_confirmed'
  | 'sos_sent'
  | 'ai_tool_used'
  | 'profile_updated'
  | 'login';

interface LogActivityParams {
  mentoradoId: string;
  membershipId?: string;
  tenantId?: string;
  actionType: ActivityType;
  description?: string;
  metadata?: Record<string, unknown>;
  pointsEarned?: number;
}

export async function logActivity({
  mentoradoId,
  membershipId,
  tenantId,
  actionType,
  description,
  metadata = {},
  pointsEarned = 0,
}: LogActivityParams) {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert([{
        mentorado_id: mentoradoId,
        membership_id: membershipId,
        tenant_id: tenantId,
        action_type: actionType,
        action_description: description,
        metadata: metadata as Json,
        points_earned: pointsEarned,
      }]);

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Activity log error:', err);
  }
}

export function useActivityLog() {
  return { logActivity };
}
