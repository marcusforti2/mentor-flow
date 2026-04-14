import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Simple rate limiter using Supabase.
 * Returns true if the request should be blocked.
 */
export async function isRateLimited(
  userId: string,
  action: string,
  maxRequests: number,
  windowMinutes: number
): Promise<boolean> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count } = await supabase
      .from("ai_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= maxRequests) return true;

    await supabase.from("ai_rate_limits").insert({
      user_id: userId,
      action,
    });

    return false;
  } catch {
    // Fail open — don't block on DB error
    return false;
  }
}
