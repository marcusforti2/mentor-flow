// One-shot restore from data-backups/<folder>/*.json using service_role.
// POST { folder: "backup-2026-05-10_03-00-09" }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
};

async function loadTable(folder: string, name: string): Promise<any[]> {
  const { data } = await sb.storage.from("data-backups").download(`${folder}/${name}.json`);
  if (!data) return [];
  return JSON.parse(await data.text());
}

async function adminCreateUser(id: string, email: string, fullName?: string, phone?: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? null, phone: phone ?? null },
    }),
  });
  if (r.ok) return { ok: true };
  const txt = await r.text();
  // duplicates -> still ok
  if (txt.includes("already") || txt.includes("registered") || txt.includes("duplicate")) {
    return { ok: true, dup: true };
  }
  return { ok: false, error: txt };
}

async function upsert(table: string, rows: any[], onConflict = "id"): Promise<{ inserted: number; errors: string[] }> {
  if (!rows.length) return { inserted: 0, errors: [] };
  const errors: string[] = [];
  let inserted = 0;
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error, count } = await sb.from(table).upsert(slice, { onConflict, ignoreDuplicates: false, count: "exact" });
    if (error) errors.push(`[${i}] ${error.message}`);
    else inserted += count ?? slice.length;
  }
  return { inserted, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { folder } = await req.json();
    if (!folder) return new Response(JSON.stringify({ error: "folder required" }), { status: 400, headers: cors });

    const report: Record<string, any> = {};

    // 1. AUTH USERS + PROFILES
    const profiles: any[] = await loadTable(folder, "profiles");
    let authCreated = 0, authDup = 0, authFail = 0;
    const authErrors: string[] = [];
    for (const p of profiles) {
      if (!p.user_id || !p.email) continue;
      const r = await adminCreateUser(p.user_id, p.email, p.full_name, p.phone);
      if (!r.ok) { authFail++; authErrors.push(`${p.email}: ${r.error}`); }
      else if (r.dup) authDup++;
      else authCreated++;
    }
    report.auth_users = { created: authCreated, duplicates: authDup, failed: authFail, errors: authErrors.slice(0, 20) };

    // Now upsert full profile data (handle_new_user already created stub profiles)
    // Profiles use user_id as the link; the trigger may have generated different `id` for new profiles.
    // Strategy: upsert by user_id (which is unique).
    const profUp = await upsert("profiles", profiles, "user_id");
    report.profiles = profUp;

    // 2. MEMBERSHIPS
    const memberships = await loadTable(folder, "memberships");
    report.memberships = await upsert("memberships", memberships, "id");

    // 3. tenant scoped data - simple upserts by id
    const TABLES_BY_ID = [
      "mentor_mentee_assignments",
      "mentee_profiles",
      "invites",
      "tenant_whatsapp_config",
      "tenant_domains",
      "crm_pipeline_stages",
      "crm_prospections",
      "crm_stage_automations",
      "trails",
      "playbooks",
      "calendar_events",
      "cs_journeys",
      "cs_journey_stages",
      "tenant_forms",
      "form_questions",
      "form_submissions",
      "campan_tasks",
      "chat_conversations",
      "chat_messages",
      "meeting_transcripts",
      "extracted_task_drafts",
      "google_calendar_tokens",
      "google_drive_tokens",
      "ai_tool_history",
      "ai_tool_usage",
      "email_flows",
      "email_flow_triggers",
      "event_mentee_reminders",
      "reward_catalog",
      "mentee_profiles",
    ];
    for (const t of TABLES_BY_ID) {
      try {
        const rows = await loadTable(folder, t);
        report[t] = await upsert(t, rows, "id");
      } catch (e) {
        report[t] = { error: String(e) };
      }
    }

    // 4. tenant_automations - trigger may have seeded defaults for the 6 existing tenants
    try {
      const rows = await loadTable(folder, "tenant_automations");
      // upsert by composite (tenant_id, automation_key)
      report.tenant_automations = await upsert("tenant_automations", rows, "tenant_id,automation_key");
    } catch (e) {
      report.tenant_automations = { error: String(e) };
    }

    return new Response(JSON.stringify(report, null, 2), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
