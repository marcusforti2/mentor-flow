import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tldv_api_key, limit = 20, meeting_id } = await req.json();

    if (!tldv_api_key) {
      return new Response(
        JSON.stringify({ error: "tldv_api_key é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = {
      "x-api-key": tldv_api_key,
      "Content-Type": "application/json",
    };

    // If meeting_id provided, fetch single meeting with transcript
    if (meeting_id) {
      const [meetingRes, transcriptRes] = await Promise.all([
        fetch(`https://api.tldv.io/v1alpha1/meetings/${meeting_id}`, { headers }),
        fetch(`https://api.tldv.io/v1alpha1/meetings/${meeting_id}/transcript`, { headers }),
      ]);

      if (!meetingRes.ok) {
        const err = await meetingRes.text();
        throw new Error(`tl;dv meeting error: ${meetingRes.status} ${err}`);
      }

      const meeting = await meetingRes.json();
      let transcript = "";
      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json();
        // tl;dv transcript is an array of segments
        if (Array.isArray(transcriptData)) {
          transcript = transcriptData
            .map((seg: any) => `${seg.speaker_name || "Speaker"}: ${seg.text}`)
            .join("\n");
        } else if (transcriptData?.transcript) {
          transcript = transcriptData.transcript;
        } else if (typeof transcriptData === "string") {
          transcript = transcriptData;
        }
      }

      return new Response(
        JSON.stringify({
          meeting: {
            id: meeting.id,
            title: meeting.title || "Reunião sem título",
            date: meeting.happened_at || meeting.created_at,
            duration: meeting.duration,
            video_url: meeting.url || meeting.video_url || `https://app.tldv.io/meetings/${meeting.id}`,
            transcript,
            participants: (meeting.participants || []).map((p: any) => p.name || p.email || ""),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List meetings
    const url = `https://api.tldv.io/v1alpha1/meetings?limit=${limit}&order_by=happened_at&order_direction=desc`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`tl;dv API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const meetings = (data.results || data.meetings || data || []).map((m: any) => ({
      id: m.id,
      title: m.title || "Reunião sem título",
      date: m.happened_at || m.created_at,
      duration: m.duration,
      video_url: m.url || `https://app.tldv.io/meetings/${m.id}`,
      participants: (m.participants || []).map((p: any) => p.name || p.email || ""),
    }));

    return new Response(
      JSON.stringify({ meetings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("fetch-tldv-meetings error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao buscar reuniões do tl;dv" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
