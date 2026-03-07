import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TABLES_TO_EXPORT = [
  "memberships",
  "profiles",
  "tenants",
  "trails",
  "lessons",
  "crm_leads",
  "crm_prospections",
  "memberships",
  "profiles",
  "tenants",
  "trails",
  "trail_lessons",
  "crm_leads",
  "crm_prospections",
  "crm_pipeline_stages",
  "crm_interactions",
  "crm_stage_automations",
  "activity_logs",
  "badges",
  "certificates",
  "calendar_events",
  "email_templates",
  "email_flows",
  "email_automations",
  "email_logs",
  "email_flow_executions",
  "email_flow_triggers",
  "playbooks",
  "playbook_access_rules",
  "tenant_forms",
  "form_questions",
  "form_submissions",
  "invites",
  "cs_journeys",
  "cs_journey_stages",
  "behavioral_questions",
  "behavioral_responses",
  "behavioral_reports",
  "community_posts",
  "community_comments",
  "community_likes",
  "community_messages",
  "campan_tasks",
  "tenant_automations",
  "call_transcripts",
  "call_analyses",
  "meeting_transcripts",
  "extracted_task_drafts",
  "chat_conversations",
  "chat_messages",
  "ai_tool_history",
  "ai_tool_usage",
  "audit_logs",
  "impersonation_logs",
  "mentor_mentee_assignments",
  "google_calendar_tokens",
  "google_drive_tokens",
  "tenant_whatsapp_config",
  "whatsapp_message_logs",
  "whatsapp_incoming_messages",
  "whatsapp_auto_replies",
  "whatsapp_automation_flows",
  "event_reminders",
  "event_mentee_reminders",
  "otp_codes",
  "mentee_profiles",
  "smart_alerts",
  "tenant_domains",
  "popup_campaigns",
  "reward_catalog",
  "reward_redemptions",
  "showcase_pages",
  "scheduling_availability",
  "scheduling_bookings",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check — only master_admin can trigger manually
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: memberships } = await supabase
          .from("memberships")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "master_admin")
          .eq("status", "active");
        if (!memberships || memberships.length === 0) {
          return new Response(JSON.stringify({ error: "Apenas master_admin pode executar backups" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "-");
    const backupFolder = `backup-${dateStr}_${timeStr}`;

    const results: Record<string, { rows: number; error?: string }> = {};
    const allData: Record<string, unknown[]> = {};

    for (const table of TABLES_TO_EXPORT) {
      try {
        // Fetch all rows (paginated to handle >1000)
        let allRows: unknown[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .range(from, from + pageSize - 1);

          if (error) {
            results[table] = { rows: 0, error: error.message };
            hasMore = false;
          } else {
            allRows = allRows.concat(data || []);
            hasMore = (data?.length || 0) === pageSize;
            from += pageSize;
          }
        }

        if (!results[table]?.error) {
          allData[table] = allRows;
          results[table] = { rows: allRows.length };
        }
      } catch (e) {
        results[table] = { rows: 0, error: e instanceof Error ? e.message : "Unknown error" };
      }
    }

    // Save individual table files
    for (const [table, rows] of Object.entries(allData)) {
      const json = JSON.stringify(rows, null, 2);
      const filePath = `${backupFolder}/${table}.json`;

      const { error: uploadError } = await supabase.storage
        .from("data-backups")
        .upload(filePath, new Blob([json], { type: "application/json" }), {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError) {
        results[table] = { ...results[table], error: `Upload failed: ${uploadError.message}` };
      }
    }

    // Save manifest
    const manifest = {
      created_at: now.toISOString(),
      tables: results,
      total_tables: Object.keys(results).length,
      total_rows: Object.values(results).reduce((sum, r) => sum + r.rows, 0),
    };

    await supabase.storage
      .from("data-backups")
      .upload(`${backupFolder}/_manifest.json`, new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }), {
        contentType: "application/json",
        upsert: true,
      });

    console.log("export-backup: Completed", manifest);

    return new Response(JSON.stringify({ success: true, folder: backupFolder, ...manifest }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("export-backup: Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
