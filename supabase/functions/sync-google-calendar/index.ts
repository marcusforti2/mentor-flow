import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { membership_id, tenant_id, days_ahead = 30 } = await req.json();
    if (!membership_id || !tenant_id) throw new Error("Missing membership_id or tenant_id");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Google Calendar token
    const { data: tokenRow, error: tokenError } = await adminClient
      .from("google_calendar_tokens")
      .select("*")
      .eq("membership_id", membership_id)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ error: "Google Calendar não conectado", synced: 0 }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenRow.access_token;

    // Refresh if expired
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      if (!tokenRow.refresh_token) throw new Error("Token expirado sem refresh token");
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      if (!refreshed) throw new Error("Falha ao renovar token");
      accessToken = refreshed.access_token;
      await adminClient
        .from("google_calendar_tokens")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("id", tokenRow.id);
    }

    // Fetch events from Google
    const now = new Date();
    const timeMin = now.toISOString();
    const futureDate = new Date(now.getTime() + days_ahead * 24 * 60 * 60 * 1000);
    const timeMax = futureDate.toISOString();

    const calUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    calUrl.searchParams.set("singleEvents", "true");
    calUrl.searchParams.set("orderBy", "startTime");
    calUrl.searchParams.set("maxResults", "100");
    calUrl.searchParams.set("timeMin", timeMin);
    calUrl.searchParams.set("timeMax", timeMax);

    const calRes = await fetch(calUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const calData = await calRes.json();
    if (calData.error) throw new Error(calData.error.message);

    const googleEvents = calData.items || [];
    let synced = 0;

    // Map event types from Google
    const mapEventType = (summary: string): string => {
      const lower = (summary || "").toLowerCase();
      if (lower.includes("mentoria")) return "mentoria";
      if (lower.includes("live")) return "live";
      if (lower.includes("reunião") || lower.includes("reuniao") || lower.includes("meeting")) return "reuniao";
      if (lower.includes("treinamento") || lower.includes("training")) return "treinamento";
      if (lower.includes("hotseat") || lower.includes("hot seat")) return "hotseat";
      return "geral";
    };

    for (const gEvent of googleEvents) {
      if (!gEvent.summary) continue;

      // Parse date/time
      const startObj = gEvent.start;
      let eventDate: string;
      let eventTime: string | null = null;

      if (startObj.dateTime) {
        const dt = new Date(startObj.dateTime);
        eventDate = dt.toISOString().split("T")[0];
        eventTime = dt.toTimeString().slice(0, 5) + ":00";
      } else if (startObj.date) {
        eventDate = startObj.date;
      } else {
        continue;
      }

      // Check if event already exists (by title + date + time to avoid duplicates)
      const { data: existing } = await adminClient
        .from("calendar_events")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("owner_membership_id", membership_id)
        .eq("title", gEvent.summary)
        .eq("event_date", eventDate)
        .maybeSingle();

      if (existing) continue; // Skip duplicates

      // Extract meeting URL
      let meetingUrl = null;
      if (gEvent.hangoutLink) {
        meetingUrl = gEvent.hangoutLink;
      } else if (gEvent.conferenceData?.entryPoints) {
        const videoEntry = gEvent.conferenceData.entryPoints.find((e: any) => e.entryPointType === "video");
        if (videoEntry) meetingUrl = videoEntry.uri;
      }

      // Insert into calendar_events
      const { error: insertError } = await adminClient
        .from("calendar_events")
        .insert({
          owner_membership_id: membership_id,
          tenant_id: tenant_id,
          title: gEvent.summary,
          description: gEvent.description || null,
          event_date: eventDate,
          event_time: eventTime,
          event_type: mapEventType(gEvent.summary),
          meeting_url: meetingUrl,
          is_recurring: !!gEvent.recurringEventId,
          audience_type: "all_mentees",
        });

      if (!insertError) synced++;
    }

    return new Response(JSON.stringify({ 
      synced, 
      total_google_events: googleEvents.length,
      message: `${synced} evento(s) sincronizado(s) do Google Calendar` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
