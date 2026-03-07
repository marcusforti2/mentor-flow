import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    console.log("Drive callback received", { hasCode: !!code, hasState: !!stateParam, error });

    if (error) {
      return htmlResponse("Erro na autorização: " + error, false);
    }

    if (!code || !stateParam) {
      return htmlResponse("Parâmetros inválidos", false);
    }

    let state: any;
    try {
      state = JSON.parse(atob(stateParam));
    } catch (e) {
      console.error("Invalid state param:", e.message);
      return htmlResponse("State inválido", false);
    }

    const { membership_id, tenant_id } = state;

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-drive-callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    console.log("Token exchange result:", { error: tokens.error, hasAccessToken: !!tokens.access_token });

    if (tokens.error) {
      console.error("Token error:", tokens.error, tokens.error_description);
      return htmlResponse("Erro ao obter token: " + (tokens.error_description || tokens.error), false);
    }

    let driveEmail = "";
    try {
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userinfo = await userinfoRes.json();
      driveEmail = userinfo.email || "";
    } catch (e) {
      console.error("Userinfo fetch error:", e.message);
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error: dbError } = await supabase
      .from("google_drive_tokens")
      .upsert(
        {
          membership_id,
          tenant_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_type: tokens.token_type || "Bearer",
          expires_at: expiresAt,
          scope: tokens.scope || null,
          drive_email: driveEmail,
        },
        { onConflict: "membership_id" }
      );

    if (dbError) {
      console.error("DB save error:", dbError.message);
      return htmlResponse("Erro ao salvar: " + dbError.message, false);
    }

    console.log("Drive connected successfully for", driveEmail);
    return htmlResponse("Google Drive conectado com sucesso!", true);
  } catch (error) {
    console.error("Drive callback error:", error.message);
    return htmlResponse("Erro inesperado: " + error.message, false);
  }
});

function htmlResponse(message: string, success: boolean) {
  return new Response(
    `<!DOCTYPE html>
<html>
<head><title>Google Drive</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0a0a0a;color:white;">
  <div style="text-align:center;padding:2rem;">
    <h2>${success ? "✅" : "❌"} ${message}</h2>
    <p style="margin-top:1rem;color:#888;">Você pode fechar esta aba.</p>
    <script>
      if (window.opener) window.opener.focus();
      setTimeout(() => window.close(), 2500);
    </script>
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
