// Patch missing FKs and finish restore.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Content-Type": "application/json" };

async function loadTable(folder: string, name: string): Promise<any[]> {
  const { data } = await sb.storage.from("data-backups").download(`${folder}/${name}.json`);
  if (!data) return [];
  return JSON.parse(await data.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { folder } = await req.json();
  const report: Record<string, any> = {};

  // Playbooks - clear folder_id since playbook_folders weren't backed up
  const playbooks = (await loadTable(folder, "playbooks")).map((p: any) => ({ ...p, folder_id: null }));
  const pbRes = await sb.from("playbooks").upsert(playbooks, { onConflict: "id" });
  report.playbooks = { tried: playbooks.length, error: pbRes.error?.message };

  // campan_tasks - clear source_transcript_id (call_transcripts was empty in backup)
  const tasks = (await loadTable(folder, "campan_tasks")).map((t: any) => ({ ...t, source_transcript_id: null }));
  const tRes = await sb.from("campan_tasks").upsert(tasks, { onConflict: "id" });
  report.campan_tasks = { tried: tasks.length, error: tRes.error?.message };

  return new Response(JSON.stringify(report, null, 2), { headers: cors });
});
