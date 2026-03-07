import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, membership_id, tenant_id } = body;

    if (!membership_id || !tenant_id) throw new Error("membership_id and tenant_id required");

    // Verify staff role
    const { data: membership } = await serviceClient
      .from("memberships")
      .select("id, role, user_id")
      .eq("id", membership_id)
      .eq("tenant_id", tenant_id)
      .eq("status", "active")
      .single();

    if (!membership || !["admin", "ops", "mentor", "master_admin"].includes(membership.role)) {
      throw new Error("Unauthorized: staff only");
    }

    // Get Google Drive tokens for this membership
    const accessToken = await getAccessToken(serviceClient, membership_id, tenant_id);

    if (action === "create_folders") {
      return await handleCreateFolders(serviceClient, accessToken, body);
    }

    if (action === "sync_videos") {
      return await handleSyncVideos(serviceClient, accessToken, body);
    }

    if (action === "check_connection") {
      return json({ connected: true });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("google-drive-training error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("not_connected") ? 401 : msg.includes("Unauthorized") ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getAccessToken(
  serviceClient: ReturnType<typeof createClient>,
  membershipId: string,
  tenantId: string
): Promise<string> {
  const { data: tokenRow, error } = await serviceClient
    .from("google_drive_tokens")
    .select("*")
    .eq("membership_id", membershipId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !tokenRow) throw new Error("not_connected");

  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : new Date(0);
  if (expiresAt <= new Date()) {
    if (!tokenRow.refresh_token) throw new Error("not_connected");
    const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: tokenRow.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    await serviceClient
      .from("google_drive_tokens")
      .update({ access_token: data.access_token, expires_at: newExpiresAt })
      .eq("id", tokenRow.id);

    return data.access_token;
  }

  return tokenRow.access_token;
}

async function createDriveFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Drive API error: ${JSON.stringify(data)}`);
  return data.id;
}

async function handleCreateFolders(
  serviceClient: ReturnType<typeof createClient>,
  accessToken: string,
  body: Record<string, unknown>
) {
  const { trail_id } = body as { trail_id: string };
  if (!trail_id) throw new Error("trail_id required");

  const { data: trail } = await serviceClient
    .from("trails")
    .select("id, title, drive_folder_id")
    .eq("id", trail_id)
    .single();
  if (!trail) throw new Error("Trail not found");

  // Create trail root folder
  let trailFolderId = trail.drive_folder_id;
  if (!trailFolderId) {
    trailFolderId = await createDriveFolder(accessToken, `📚 ${trail.title}`);
    await serviceClient.from("trails").update({ drive_folder_id: trailFolderId }).eq("id", trail_id);
  }

  const { data: modules } = await serviceClient
    .from("trail_modules")
    .select("id, title, sort_order, drive_folder_id")
    .eq("trail_id", trail_id)
    .order("sort_order");

  const createdFolders: { type: string; name: string; folderId: string }[] = [
    { type: "trail", name: trail.title, folderId: trailFolderId },
  ];

  for (const mod of modules || []) {
    let modFolderId = mod.drive_folder_id;
    if (!modFolderId) {
      modFolderId = await createDriveFolder(accessToken, `📖 ${mod.title}`, trailFolderId);
      await serviceClient.from("trail_modules").update({ drive_folder_id: modFolderId }).eq("id", mod.id);
    }
    createdFolders.push({ type: "module", name: mod.title, folderId: modFolderId });

    const { data: lessons } = await serviceClient
      .from("trail_lessons")
      .select("id, title, sort_order, drive_folder_id")
      .eq("module_id", mod.id)
      .order("sort_order");

    for (const lesson of lessons || []) {
      let lessonFolderId = lesson.drive_folder_id;
      if (!lessonFolderId) {
        lessonFolderId = await createDriveFolder(accessToken, `🎬 ${lesson.title}`, modFolderId);
        await serviceClient.from("trail_lessons").update({ drive_folder_id: lessonFolderId }).eq("id", lesson.id);
      }
      createdFolders.push({ type: "lesson", name: lesson.title, folderId: lessonFolderId });
    }
  }

  return json({ success: true, folders: createdFolders });
}

async function handleSyncVideos(
  serviceClient: ReturnType<typeof createClient>,
  accessToken: string,
  body: Record<string, unknown>
) {
  const { trail_id } = body as { trail_id: string };
  if (!trail_id) throw new Error("trail_id required");

  const { data: modules } = await serviceClient
    .from("trail_modules")
    .select("id")
    .eq("trail_id", trail_id);

  const moduleIds = (modules || []).map((m: any) => m.id);
  if (moduleIds.length === 0) return json({ synced: 0 });

  const { data: lessons } = await serviceClient
    .from("trail_lessons")
    .select("id, title, drive_folder_id, content_url, content_type")
    .in("module_id", moduleIds);

  let synced = 0;

  for (const lesson of lessons || []) {
    if (!lesson.drive_folder_id) continue;

    const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
    searchUrl.searchParams.set("q", `'${lesson.drive_folder_id}' in parents and mimeType contains 'video/' and trashed=false`);
    searchUrl.searchParams.set("fields", "files(id,name)");
    searchUrl.searchParams.set("orderBy", "createdTime desc");
    searchUrl.searchParams.set("pageSize", "1");

    const res = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (data.files?.length > 0) {
      const file = data.files[0];
      const driveUrl = `https://drive.google.com/file/d/${file.id}/preview`;

      if (!lesson.content_url || lesson.content_url === "") {
        await serviceClient
          .from("trail_lessons")
          .update({ content_url: driveUrl, content_type: "video" })
          .eq("id", lesson.id);

        // Make publicly viewable
        await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "reader", type: "anyone" }),
        });

        synced++;
      }
    }
  }

  return json({ synced });
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
