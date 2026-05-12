import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const match = url.searchParams.get("match") ?? "2026-05-10";

  const { data: folders, error } = await sb.storage.from("data-backups").list("", { limit: 200 });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

  const target = folders.find((f) => f.name.includes(match));
  if (!target) return new Response(JSON.stringify({ folders: folders.map((f) => f.name) }), { headers: cors });

  const { data: files } = await sb.storage.from("data-backups").list(target.name, { limit: 500 });
  const paths = (files ?? []).map((f) => `${target.name}/${f.name}`);
  const { data: signed } = await sb.storage.from("data-backups").createSignedUrls(paths, 60 * 60 * 24 * 7);

  return new Response(JSON.stringify({ folder: target.name, files: signed }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
