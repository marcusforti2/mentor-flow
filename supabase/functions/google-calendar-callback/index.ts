import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(redirectHTML("Erro na autorização: " + error, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !stateParam) {
      return new Response(redirectHTML("Parâmetros inválidos", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const state = JSON.parse(atob(stateParam));
    const { membership_id, tenant_id } = state;

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
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
    if (tokens.error) {
      return new Response(redirectHTML("Erro ao obter token: " + tokens.error_description, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Get user email from Google
    let calendarEmail = "";
    try {
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userinfo = await userinfoRes.json();
      calendarEmail = userinfo.email || "";
    } catch {}

    // Save tokens using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Upsert token
    const { error: dbError } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        membership_id,
        tenant_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_type: tokens.token_type || "Bearer",
        expires_at: expiresAt,
        scope: tokens.scope || null,
        calendar_email: calendarEmail,
      }, { onConflict: "membership_id" });

    if (dbError) {
      return new Response(redirectHTML("Erro ao salvar: " + dbError.message, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(redirectHTML("Google Calendar conectado com sucesso!", true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    return new Response(redirectHTML("Erro inesperado: " + error.message, false), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function redirectHTML(message: string, success: boolean) {
  return `<!DOCTYPE html>
<html>
<head><title>Google Calendar</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0a0a0a;color:white;">
  <div style="text-align:center;padding:2rem;">
    <h2>${success ? "✅" : "❌"} ${message}</h2>
    <p>Você pode fechar esta aba.</p>
    <script>setTimeout(() => window.close(), 2000);</script>
  </div>
</body>
</html>`;
}
