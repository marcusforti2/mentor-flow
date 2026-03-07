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

    const {
      membership_id,
      tenant_id,
      title,
      description,
      event_date,
      event_time,
      duration_minutes = 60,
      meeting_url,
      attendee_emails = [],
    } = await req.json();

    if (!membership_id || !tenant_id || !title || !event_date) {
      throw new Error("Missing required fields");
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Google Calendar token
    const { data: tokenRow } = await adminClient
      .from("google_calendar_tokens")
      .select("*")
      .eq("membership_id", membership_id)
      .single();

    if (!tokenRow) {
      return new Response(JSON.stringify({ error: "Google Calendar não conectado", pushed: false }), {
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

    // Build Google Calendar event
    const startDateTime = event_time
      ? `${event_date}T${event_time}`
      : `${event_date}T09:00:00`;
    
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + duration_minutes * 60 * 1000);

    const googleEvent: Record<string, any> = {
      summary: title,
      description: description || undefined,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
    };

    // Add conference (Google Meet)
    if (!meeting_url) {
      googleEvent.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    // Add attendees
    if (attendee_emails.length > 0) {
      googleEvent.attendees = attendee_emails.map((email: string) => ({ email }));
    }

    // Create event in Google Calendar
    const calUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    if (!meeting_url) {
      calUrl.searchParams.set("conferenceDataVersion", "1");
    }

    const calRes = await fetch(calUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleEvent),
    });

    const calData = await calRes.json();
    if (calData.error) throw new Error(calData.error.message);

    // Extract meeting URL from created event
    let finalMeetingUrl = meeting_url || null;
    if (calData.hangoutLink) {
      finalMeetingUrl = calData.hangoutLink;
    } else if (calData.conferenceData?.entryPoints) {
      const videoEntry = calData.conferenceData.entryPoints.find((e: any) => e.entryPointType === "video");
      if (videoEntry) finalMeetingUrl = videoEntry.uri;
    }

    return new Response(JSON.stringify({
      pushed: true,
      google_event_id: calData.id,
      meeting_url: finalMeetingUrl,
      html_link: calData.htmlLink,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("push-to-google-calendar error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
