import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget notification to mentee when mentor performs an action.
 * Never throws — logs errors silently so it doesn't block the main flow.
 */
export async function notifyMenteeAction(params: {
  mentorado_membership_id: string;
  mentor_membership_id: string;
  tenant_id: string;
  action_type: string;
  action_details?: Record<string, unknown>;
}) {
  try {
    supabase.functions.invoke('notify-mentee-action', {
      body: params,
    }).then(({ error }) => {
      if (error) console.warn('[notifyMenteeAction] Edge function error:', error.message);
    });
  } catch (err) {
    console.warn('[notifyMenteeAction] Failed to invoke:', err);
  }
}
