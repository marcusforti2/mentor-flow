import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: folders, error } = await sb.storage.from("data-backups").list("", { limit: 100, sortBy: { column: "name", order: "desc" }});
if (error) { console.error(error); process.exit(1); }
console.log("ROOT:", folders.map(f=>f.name));
const target = folders.find(f => f.name.includes("2026-05-10"));
if (!target) { console.log("no may 10 folder"); process.exit(0); }
console.log("FOUND:", target.name);
const { data: files } = await sb.storage.from("data-backups").list(target.name, { limit: 200 });
console.log("FILES:", files.length);
const { data: signed } = await sb.storage.from("data-backups").createSignedUrls(files.map(f => `${target.name}/${f.name}`), 60*60*24*7);
console.log(JSON.stringify(signed, null, 2));
